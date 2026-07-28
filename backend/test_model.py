#!/usr/bin/env python3
"""Quick test to verify model loads successfully."""

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
from huggingface_hub import file_exists, login
import os
from dotenv import load_dotenv

load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")
if HF_TOKEN:
    login(token=HF_TOKEN)

BASE_MODEL = "Qwen/Qwen2.5-3B"
ADAPTER_MODEL = "jayanthnagasai/imdb-qlora"

print("Testing model loading...")
print(f"Device: {'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'}")

try:
    # Check if adapter exists
    is_adapter = file_exists(ADAPTER_MODEL, "adapter_config.json", token=HF_TOKEN)
    print(f"Is adapter repo: {is_adapter}")

    # Load tokenizer
    print("Loading tokenizer...")
    try:
        tok = AutoTokenizer.from_pretrained(ADAPTER_MODEL, trust_remote_code=True, token=HF_TOKEN)
    except:
        tok = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True, token=HF_TOKEN)
    print("Tokenizer loaded OK")

    # Load base model
    print("Loading base model...")
    base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, token=HF_TOKEN)
    print("Base model loaded OK")

    # Load adapter
    if is_adapter:
        print("Loading adapter...")
        mdl = PeftModel.from_pretrained(base, ADAPTER_MODEL, token=HF_TOKEN)
        print("Adapter loaded OK")
    else:
        mdl = base

    print("Model setup complete!")

    # Test a simple classification
    print("\nTesting classification...")
    test_text = "This movie was great!"
    prompt = f"Review: {test_text}\n\nSentiment:"
    inputs = tok(prompt, return_tensors="pt")

    with torch.no_grad():
        out = mdl.generate(
            **inputs,
            max_new_tokens=3,
            do_sample=False,
            pad_token_id=tok.pad_token_id,
        )

    generated_ids = out[0][inputs["input_ids"].shape[1]:]
    decoded = tok.decode(generated_ids, skip_special_tokens=True)
    print(f"Input: {test_text}")
    print(f"Output: {decoded}")
    print("\nAll tests passed!")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
