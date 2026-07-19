"""
IMDB sentiment classifier REST API (FastAPI).

Model: jayanthnagasai/imdb-qlora
  - QLoRA adapter for base model Qwen/Qwen2.5-3B
  - Trained on stanfordnlp/imdb with a causal-LM prompt/completion format:
      "Review: {text}\n\nSentiment:" -> " Positive" | " Negative"

Install:
    pip install -r requirements.txt

Run:
    python app.py
    -> REST: POST http://localhost:8080/predict {"text": "..."}
    -> Health: GET http://localhost:8080/health
"""

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from huggingface_hub import file_exists, login
from fastapi import HTTPException
import uvicorn
import os
import signal
import contextlib
import time
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
if HF_TOKEN:
    login(token=HF_TOKEN)

BASE_MODEL = "Qwen/Qwen2.5-3B"
ADAPTER_MODEL = "jayanthnagasai/imdb-qlora"
MAX_CHARS = 800  # must match the truncation used at training time

if torch.cuda.is_available():
    DEVICE = "cuda"
elif torch.backends.mps.is_available():
    DEVICE = "mps"  # Apple Silicon GPU (no bitsandbytes 4-bit support here)
else:
    DEVICE = "cpu"


def load_model_and_tokenizer():
    """
    ADAPTER_MODEL may be a bare PEFT adapter (needs BASE_MODEL underneath) or
    a standalone model if the adapter was merged before push_to_hub. Detect
    which one it is instead of assuming, so this works either way.
    """
    if DEVICE == "cuda":
        load_kwargs = dict(dtype=torch.float16, device_map="auto")
    elif DEVICE == "mps":
        load_kwargs = dict(dtype=torch.float16)
    else:
        load_kwargs = dict(dtype=torch.float32)

    try:
        tok = AutoTokenizer.from_pretrained(ADAPTER_MODEL, trust_remote_code=True, token=HF_TOKEN)
    except Exception:
        tok = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True, token=HF_TOKEN)
    tok.pad_token = tok.eos_token
    tok.padding_side = "right"

    is_adapter_repo = file_exists(ADAPTER_MODEL, "adapter_config.json", token=HF_TOKEN)

    if is_adapter_repo:
        base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, token=HF_TOKEN, **load_kwargs)
        if DEVICE != "cuda":  # device_map="auto" already places cuda; others need an explicit move
            base = base.to(DEVICE)
        base.generation_config.pad_token_id = tok.pad_token_id
        mdl = PeftModel.from_pretrained(base, ADAPTER_MODEL, token=HF_TOKEN)
    else:
        # ADAPTER_MODEL is self-contained (merged) - load it directly, no base needed.
        mdl = AutoModelForCausalLM.from_pretrained(ADAPTER_MODEL, token=HF_TOKEN, **load_kwargs)
        if DEVICE != "cuda":
            mdl = mdl.to(DEVICE)
        mdl.generation_config.pad_token_id = tok.pad_token_id

    mdl.eval()
    return mdl, tok


model, tokenizer = load_model_and_tokenizer()

POS_TOKEN_ID = tokenizer.encode(" Positive", add_special_tokens=False)[0]
NEG_TOKEN_ID = tokenizer.encode(" Negative", add_special_tokens=False)[0]


def classify_reviews_batch(reviews: list[str]) -> list[dict]:
    """
    Classify multiple reviews with optimized batched inference.

    Uses padded batching to process reviews in parallel where possible,
    falling back to sequential on OOM.

    Args:
        reviews: List of review texts

    Returns:
        List of dicts with 'label', 'confidence', 'originalIndex'
    """
    results = []

    chunk_size = 8  # Process 8 reviews at a time

    for chunk_start in range(0, len(reviews), chunk_size):
        chunk_end = min(chunk_start + chunk_size, len(reviews))
        chunk = reviews[chunk_start:chunk_end]

        try:
            prompts = [
                f"Review: {r.replace('<br />', ' ').strip()[:MAX_CHARS]}\n\nSentiment:"
                for r in chunk
            ]

            inputs = tokenizer(
                prompts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512,
            ).to(model.device)

            with torch.no_grad():
                out = model.generate(
                    **inputs,
                    max_new_tokens=3,
                    do_sample=False,
                    pad_token_id=tokenizer.pad_token_id,
                    output_scores=True,
                    return_dict_in_generate=True,
                )

            for idx, prompt_idx in enumerate(range(chunk_start, chunk_end)):
                try:
                    generated_ids = out.sequences[idx][
                        inputs["input_ids"][idx].shape[0] :
                    ]
                    decoded = tokenizer.decode(
                        generated_ids, skip_special_tokens=True
                    )
                    label = "Positive" if "pos" in decoded.lower() else "Negative"

                    first_token_probs = torch.softmax(out.scores[0][idx], dim=-1)
                    pos_prob = first_token_probs[POS_TOKEN_ID].item()
                    neg_prob = first_token_probs[NEG_TOKEN_ID].item()
                    total = pos_prob + neg_prob
                    confidence = (
                        (pos_prob / total)
                        if label == "Positive"
                        else (neg_prob / total)
                    )

                    results.append(
                        {
                            "label": label,
                            "confidence": float(confidence),
                            "originalIndex": prompt_idx,
                        }
                    )
                except Exception:
                    continue

        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                for idx, prompt_idx in enumerate(range(chunk_start, chunk_end)):
                    try:
                        result = classify_review(reviews[prompt_idx])
                        result["originalIndex"] = prompt_idx
                        results.append(result)
                    except Exception:
                        continue
            else:
                raise

    return results


def classify_review(review_text: str) -> dict:
    """
    Classify a movie review as Positive or Negative.

    Args:
        review_text: Raw review text (up to MAX_CHARS)

    Returns:
        dict with 'label' and 'confidence'

    Raises:
        ValueError: If review text is invalid
        RuntimeError: If model fails
    """
    try:
        text = review_text.replace("<br />", " ").strip()[:MAX_CHARS]
        if not text:
            raise ValueError("Review text cannot be empty")

        prompt = f"Review: {text}\n\nSentiment:"
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_new_tokens=3,
                do_sample=False,
                pad_token_id=tokenizer.pad_token_id,
                output_scores=True,
                return_dict_in_generate=True,
            )

        generated_ids = out.sequences[0][inputs["input_ids"].shape[1]:]
        decoded = tokenizer.decode(generated_ids, skip_special_tokens=True)
        label = "Positive" if "pos" in decoded.lower() else "Negative"

        first_token_probs = torch.softmax(out.scores[0][0], dim=-1)
        pos_prob = first_token_probs[POS_TOKEN_ID].item()
        neg_prob = first_token_probs[NEG_TOKEN_ID].item()
        total = pos_prob + neg_prob
        confidence = (pos_prob / total) if label == "Positive" else (neg_prob / total)

        return {"label": label, "confidence": float(confidence)}

    except ValueError as e:
        raise ValueError(f"Invalid input: {str(e)}")
    except RuntimeError as e:
        raise RuntimeError(f"Model error: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Unexpected error during classification: {str(e)}")


# --- FastAPI ---

app = FastAPI(title="IMDB Sentiment Classifier")


class ReviewRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Movie review text")

    @field_validator('text')
    def text_not_whitespace(cls, v):
        if not v.strip():
            raise ValueError("Review cannot be empty or whitespace only")
        return v.strip()


class SentimentResponse(BaseModel):
    label: str
    confidence: float
    originalIndex: int = None


class BatchReviewRequest(BaseModel):
    reviews: list[str] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="List of reviews (max 100)"
    )

    @field_validator('reviews')
    def validate_reviews(cls, v):
        if len(v) == 0:
            raise ValueError("At least 1 review required")
        if len(v) > 100:
            raise ValueError("At most 100 reviews per batch")
        v = [r.strip() for r in v if r.strip()]
        if len(v) == 0:
            raise ValueError("At least 1 non-empty review required")
        return v


class BatchSentimentResponse(BaseModel):
    results: list[dict]
    skipped: int = 0
    processing_time_ms: float = 0.0


@app.get("/health")
def health():
    return {"status": "ok", "device": str(model.device)}


@app.post("/predict", response_model=SentimentResponse)
def predict(req: ReviewRequest):
    try:
        result = classify_review(req.text)
        return SentimentResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
    except RuntimeError as e:
        if "timeout" in str(e).lower():
            raise HTTPException(status_code=504, detail="Model inference timeout. Please try a shorter review.")
        raise HTTPException(status_code=500, detail=f"Model error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail="An unexpected error occurred")


@app.post("/predict/batch", response_model=BatchSentimentResponse)
def predict_batch(req: BatchReviewRequest):
    try:
        start_time = time.time()
        results = classify_reviews_batch(req.reviews)

        if len(results) == 0:
            raise HTTPException(status_code=400, detail="No valid reviews could be processed")

        results = sorted(results, key=lambda x: x.get('originalIndex', 0))

        processing_time = (time.time() - start_time) * 1000
        return BatchSentimentResponse(
            results=results,
            skipped=len(req.reviews) - len(results),
            processing_time_ms=processing_time
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
