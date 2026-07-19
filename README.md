# IMDB Sentiment Classifier - Fullstack ML Chatbot

A **production-grade fullstack sentiment analysis system** combining fine-tuned LLMs, efficient inference optimization, and a polished modern UI. This project demonstrates fullstack ML engineering from model optimization through deployment.

[![Next.js](https://img.shields.io/badge/Next.js-14.0+-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3+-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

## Overview

This chatbot analyzes movie reviews using a **3B parameter Qwen model** fine-tuned on the Stanford IMDB dataset with QLoRA. It demonstrates:

- **Optimized LLM Inference**: 4-bit quantization reduces memory from 12GB to 2-3GB on CUDA
- **Multi-Device Support**: Seamless execution on CUDA, Apple Silicon (MPS), and CPU with automatic fallback
- **Production Architecture**: Dual API surface (REST + Gradio) with health checks and structured error handling
- **Modern Fullstack**: Next.js 14 frontend with TypeScript, Tailwind CSS, dark mode, and WCAG 2.1 accessibility
- **Type-Safe Design**: End-to-end TypeScript with strict mode throughout the stack

## Quick Start

### Prerequisites

- **Node.js** 18+ (frontend)
- **Python** 3.10+ (backend with torch, transformers, peft)
- **HuggingFace Token** (from https://huggingface.co/settings/tokens)
- **GPU** (recommended): CUDA 11.8+ for 4-bit quantization; MPS or CPU fallback available

### Installation & Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd chatbot-app

# 2. Install backend dependencies
pip install torch transformers peft bitsandbytes accelerate fastapi uvicorn gradio python-dotenv

# 3. Install frontend dependencies
npm install

# 4. Configure environment
echo "HF_TOKEN=hf_your_token_here" > .env
cp .env.example .env.local
```

### Running the Application

#### Option A: Backend Only (Gradio UI + REST API)

```bash
python app.py
```

- **Gradio UI**: http://localhost:8000/
- **REST API**: POST http://localhost:8080/predict
- **API Docs**: http://localhost:8080/docs

#### Option B: Full Stack (Backend + Next.js Frontend)

**Terminal 1 - Backend:**
```bash
python app.py
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

Access the chat interface at http://localhost:3000

### Testing the API

```bash
# Sentiment classification
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This film was an absolute masterpiece!"}'

# Response:
# {
#   "label": "Positive",
#   "confidence": 0.987
# }

# Health check
curl http://localhost:8080/health
```

## Project Structure

```
chatbot-app/
├── backend/
│   └── app.py                          # FastAPI server (model inference, health check)
│
├── app/                                # Next.js app (React frontend)
│   ├── page.tsx                        # Main chat interface
│   ├── layout.tsx                      # Root layout with dark mode support
│   ├── globals.css                     # Base styles
│   └── api/chat/route.ts               # API route (if needed)
│
├── docs/                               # Documentation
│   ├── README.md                       # Detailed project documentation
│   ├── SETUP.md                        # Setup instructions
│   ├── QUICKSTART.md                   # Quick start guide
│   └── IMPLEMENTATION_SUMMARY.md       # Implementation details
│
├── lib/                                # Shared utilities
├── config/                             # Configuration templates
├── data/                               # Data files
├── template/                           # Project templates
│
├── package.json                        # Frontend dependencies
├── tsconfig.json                       # TypeScript configuration (strict mode)
├── tailwind.config.ts                  # Tailwind CSS customization
├── next.config.js                      # Next.js build configuration
├── .env.example                        # Environment variables template
├── .eslintrc.json                      # ESLint configuration
└── README.md                           # This file
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│          Frontend Layer (Next.js 14)                 │
│  React 18 | TypeScript | Tailwind CSS              │
│  - Chat UI with streaming animations                │
│  - Dark mode & WCAG 2.1 accessibility               │
│  - Real-time confidence visualization               │
└────────────────┬─────────────────────────────────────┘
                 │ HTTP/JSON
                 ▼
┌──────────────────────────────────────────────────────┐
│          API Layer (FastAPI)                         │
│  - /predict (POST): Sentiment classification        │
│  - /health (GET): Health check & device status      │
│  - /docs (GET): Auto-generated OpenAPI schema       │
│  - /gradio_api: Gradio interface                    │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│       ML Inference Layer (PyTorch)                   │
│  Base: Qwen/Qwen2.5-3B (causal LM)                 │
│  Adapter: jayanthnagasai/imdb-qlora (QLoRA)        │
│  Quantization: NF4 4-bit (CUDA only)               │
│  Device: Auto-detect (CUDA > MPS > CPU)            │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
- **Next.js 14** - Full-stack React framework with SSR/SSG
- **React 18** - Component-based UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS transformation pipeline

### Backend
- **FastAPI** - Modern async Python web framework
- **Pydantic** - Type validation & serialization
- **Uvicorn** - ASGI server
- **Hugging Face Transformers** - LLM loading & inference
- **PEFT** - Parameter-Efficient Fine-Tuning (QLoRA)
- **PyTorch** - Deep learning framework
- **BitsAndBytes** - Quantization for memory efficiency

### Infrastructure
- **Docker** - Containerization
- **Gradio** - Alternative UI for model testing
- **Hugging Face Hub** - Model versioning & distribution

## Key Features

### Batch Processing
- **Streamlined CSV Import**: Transparent dotted border UI with clear format guidance
- **Visual Instructions**: Step-by-step guidance with numbered indicators and checkmark confirmations
- **Flexible Input**: Upload CSV files with `username` and `review` columns
- **Bulk Analysis**: Process multiple reviews in parallel with progress tracking
- **Multiple Export Formats**: Download results as CSV or JSON for downstream analysis

### Model Optimization
- **QLoRA Fine-tuning**: Only 0.1-1% additional parameters vs. base model
- **4-bit Quantization**: 75-80% memory reduction while maintaining accuracy
- **Smart Device Detection**: Automatic fallback from CUDA > MPS > CPU
- **Confidence Scoring**: Token-level probability extraction for uncertainty quantification

### API Design
- **Type-Safe Contracts**: Pydantic validation with auto-generated OpenAPI docs
- **Health Checks**: Device monitoring and status reporting
- **CORS Support**: Pre-configured cross-origin support
- **Error Recovery**: Graceful degradation with informative messages

### Frontend Excellence
- **Semantic HTML**: Proper landmark elements for accessibility
- **WCAG 2.1 Compliance**: Skip links, ARIA labels, color contrast, keyboard navigation
- **Responsive Design**: Mobile-first with gradient backgrounds and glass-morphism
- **Dark Mode**: System preference detection with manual override
- **Real-time Feedback**: Loading states, error alerts, confidence visualization
- **Enhanced Batch UI**: 
  - CSV format guidance with numbered step indicators
  - Transparent dotted borders for inputs and file upload areas
  - Visual checkmarks confirming output details
  - Clear column specifications in minimalist style
- **Professional Polish**: Consistent design language with proper spacing, typography hierarchy, and smooth hover states

## Configuration

### Environment Variables

| Variable | Purpose | Required | Default |
|---|---|---|---|
| `HF_TOKEN` | Hugging Face API token for model access | Yes | - |
| `MAX_CHARS` | Maximum review length (truncation) | No | 800 |
| `DEVICE` | Force device selection (cuda/mps/cpu) | No | Auto-detect |

### Model Configuration

```python
# In app.py
BASE_MODEL = "Qwen/Qwen2.5-3B"
ADAPTER_MODEL = "jayanthnagasai/imdb-qlora"
MAX_CHARS = 800  # Must match training data truncation
```

## Performance

| Metric | Value | Notes |
|---|---|---|
| Model Size | 3B parameters | Base model |
| Memory (CUDA) | 2-3 GB | With 4-bit quantization |
| Memory (CPU) | 8-12 GB | Full precision |
| Latency | 200-500ms | Depends on device & text length |
| Max Input | 800 characters | Matches training truncation |
| Output Tokens | 3 | Fixed for consistency |

## API Reference

### POST /predict
Classify a movie review as Positive or Negative.

**Request:**
```bash
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This film was absolutely incredible!"}'
```

**Response:**
```json
{
  "label": "Positive",
  "confidence": 0.992
}
```

### GET /health
Check backend health and device status.

**Request:**
```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "ok",
  "device": "cuda"
}
```

### GET /docs
Interactive Swagger UI for API documentation.

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t chatbot-app .

# Run with GPU support
docker run --gpus all -p 8080:8080 -p 3000:3000 \
  -e HF_TOKEN=hf_your_token \
  chatbot-app
```

### Docker Compose

```bash
docker-compose up
```

### Production Checklist

- [ ] Add authentication (JWT/OAuth2)
- [ ] Implement rate limiting
- [ ] Add structured logging (JSON format)
- [ ] Set up monitoring (Prometheus + Grafana)
- [ ] Configure caching (Redis)
- [ ] Enable security headers
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add comprehensive test suite

## Testing

### Manual API Testing

```bash
# Positive review
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Best movie I have ever seen!"}'

# Negative review
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Absolute waste of time."}'

# Mixed review
curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Great visuals but terrible plot."}'
```

### Frontend Testing

```bash
npm run dev
# Manual testing at http://localhost:3000
```

### Code Quality

```bash
npm run lint  # ESLint check
```

## Architecture Decisions

### Why This Stack?

| Decision | Rationale |
|---|---|
| **Next.js 14** | Server-side rendering for SEO, API routes simplicity, built-in optimizations |
| **FastAPI** | Async-first design, auto-generated docs, Pydantic validation |
| **Qwen2.5-3B** | 3B params (vs 7B+) balances accuracy and inference speed on consumer hardware |
| **QLoRA** | 90% parameter reduction vs full fine-tuning with equivalent accuracy |
| **4-bit Quantization** | 75-80% memory reduction on CUDA with negligible accuracy loss for classification |
| **Tailwind CSS** | Rapid UI development, dark mode built-in, accessibility utilities |

### Rejected Alternatives

1. **Full Next.js API**: Would require Python runtime in Node.js - rejected for performance
2. **LangChain Integration**: Unnecessary complexity for simple classification - rejected
3. **Larger models (7B+)**: GPU memory too high for consumer hardware - rejected
4. **No quantization**: GPU memory bloat (12GB+) - rejected

## Troubleshooting

### CUDA Out of Memory (OOM)

```python
# Ensure 4-bit quantization is enabled in app.py
# For CUDA: uses BitsAndBytes NF4
# For MPS/CPU: uses full precision (will be slow)
```

### Model Download Hangs

```bash
# Manually authenticate with Hugging Face
huggingface-cli login
# Enter your token from https://huggingface.co/settings/tokens
```

### Port Already in Use

```bash
# Backend (FastAPI uses 8080)
lsof -i :8080
kill -9 <PID>

# Frontend (Next.js uses 3000)
lsof -i :3000
kill -9 <PID>
```

### Type Errors in TypeScript

Ensure `strict: true` is enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Contributing

Areas for improvement:

1. **Streaming Inference**: Token-level output for real-time responses
2. **Caching Layer**: Redis for identical reviews
3. **Multi-task Learning**: Aspect-based sentiment or rating prediction
4. **A/B Testing**: Route to different model versions
5. **Observability**: Prometheus metrics and Grafana dashboards
6. **Test Suite**: pytest for backend, Jest for frontend
7. **CI/CD**: GitHub Actions automation

## Documentation

- **[docs/README.md](docs/README.md)** - Detailed technical documentation
- **[docs/SETUP.md](docs/SETUP.md)** - Comprehensive setup guide
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Quick start reference
- **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Implementation details

## Resources

- [Qwen Model Card](https://huggingface.co/Qwen/Qwen2.5-3B)
- [PEFT Documentation](https://github.com/huggingface/peft)
- [BitsAndBytes Quantization](https://github.com/TimDettmers/bitsandbytes)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [FastAPI Guide](https://fastapi.tiangolo.com/)
- [WCAG 2.1 Accessibility](https://www.w3.org/WAI/WCAG21/quickref/)
- [Hugging Face Inference Guide](https://huggingface.co/docs/transformers/main/tasks/text_classification)

## License

MIT License - See LICENSE file for details

## Author

Built as a demonstration of fullstack ML engineering with production-grade patterns and best practices.

---

## Support

For questions or issues:

1. Check the [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions
2. Review the [Troubleshooting](#troubleshooting) section above
3. Check [docs/README.md](docs/README.md) for deeper technical details
4. Open an issue with detailed reproduction steps

**Last Updated**: 2026-07-18
**Recent Updates**: 
- Enhanced batch processing UI with improved visual hierarchy
- Transparent dotted border design for CSV input and file upload
- Added step-by-step visual indicators for better UX
