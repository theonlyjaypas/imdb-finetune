# Quick Start - Self-Contained Sentiment Classifier

This is a minimal fullstack app:
- **Backend**: FastAPI + Hugging Face model (jayanthnagasai/imdb-qlora)
- **Frontend**: Next.js 14 (optional, uses backend API)
- **No external dependencies** - only the fine-tuned model

## Setup

### 1. Backend (Python)

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your HuggingFace token if model is private
```

### 2. Frontend (Node.js)

```bash
# Install dependencies
npm install
```

## Run

### Backend
```bash
python app.py
# Server runs at http://localhost:8080
```

### Frontend (in another terminal)
```bash
npm run dev
# App runs at http://localhost:3000
```

## API Usage

### Health check
```bash
curl http://localhost:8080/health
```

### Single prediction
```bash
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was amazing!"}'
```

### Batch prediction
```bash
curl -X POST http://localhost:8080/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "reviews": [
      "This movie was amazing!",
      "Terrible waste of time."
    ]
  }'
```

## Model Info

- **Base Model**: Qwen/Qwen2.5-3B
- **Adapter**: jayanthnagasai/imdb-qlora (QLoRA fine-tuned on IMDB)
- **Task**: Binary sentiment classification (Positive/Negative)
- **Max input**: 800 characters

The model is loaded on startup and runs inference locally - no external API calls.

## Dependencies Removed

- ~~gradio~~ (UI - now using Next.js instead)
- ~~bitsandbytes~~ (4-bit quantization - removed for simplicity)
- ~~sentiment~~ (npm package - using HF model instead)

Total: **6 Python packages**, **3 npm packages**
