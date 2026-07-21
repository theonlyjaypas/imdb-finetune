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
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from huggingface_hub import file_exists, login
import uvicorn
import os
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
        load_kwargs = dict(torch_dtype=torch.float16, device_map="auto")
    elif DEVICE == "mps":
        load_kwargs = dict(torch_dtype=torch.float16)
    else:
        load_kwargs = dict(torch_dtype=torch.float32)

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


def classify_review(review_text: str) -> dict:
    text = review_text.replace("<br />", " ").strip()[:MAX_CHARS]
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

    return {"label": label, "confidence": confidence}


# --- FastAPI ---

app = FastAPI(title="IMDB Sentiment Classifier")


class ReviewRequest(BaseModel):
    text: str = Field(..., min_length=1)


class SentimentResponse(BaseModel):
    label: str
    confidence: float


@app.get("/health")
def health():
    return {"status": "ok", "device": str(model.device)}


@app.post("/predict", response_model=SentimentResponse)
def predict(req: ReviewRequest):
    result = classify_review(req.text)
    return SentimentResponse(**result)


class BatchReviewRequest(BaseModel):
    reviews: list[str] = Field(..., min_length=1)


class BatchSentimentResponse(BaseModel):
    results: list[SentimentResponse]


@app.post("/predict/batch", response_model=BatchSentimentResponse)
def predict_batch(req: BatchReviewRequest):
    results = [classify_review(review) for review in req.reviews]
    return BatchSentimentResponse(results=[SentimentResponse(**r) for r in results])


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
