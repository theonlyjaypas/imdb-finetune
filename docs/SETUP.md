# Sentiment Classifier Chatbot Setup

This Next.js app integrates your FastAPI sentiment classifier backend.

## Prerequisites

1. **FastAPI Backend Running** (from app.py)
   ```bash
   cd /Users/jaypas/MLENG/MINI/chatbot-app
   pip install torch transformers peft bitsandbytes accelerate gradio fastapi uvicorn python-dotenv
   python app.py
   # Backend runs on http://localhost:8080
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local if your backend runs on a different URL
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

## Running the Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## How It Works

1. User pastes a movie review in the textarea
2. Frontend sends to `/api/chat` endpoint
3. API route forwards to FastAPI backend at `http://localhost:8080/predict`
4. Model classifies as Positive/Negative with confidence score
5. Result displayed with badge and confidence percentage

## Model Details

- Base Model: `Qwen/Qwen2.5-3B`
- Adapter: `jayanthnagasai/imdb-qlora` (QLoRA fine-tuned on IMDB reviews)
- Max input: 800 characters
- Supports: CUDA (with 4-bit quantization), Apple Silicon (fp16), CPU (fp32)

## Troubleshooting

**Backend connection error?**
- Ensure app.py is running on port 8080
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS (FastAPI should allow requests from localhost:3000)

**GPU out of memory?**
- Backend uses 4-bit quantization on CUDA
- Falls back to fp16 on MPS, fp32 on CPU
- Reduce batch size or use smaller model if needed

**HuggingFace auth issues?**
- Set `HF_TOKEN` in `.env.local` for private models
- Or run: `huggingface-cli login`
