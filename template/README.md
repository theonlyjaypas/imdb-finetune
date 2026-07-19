# Chatbot Framework Template

This is a clean framework duplicate of the chatbot application, ready for integration into your RAG (Retrieval Augmented Generation) app.

## Structure

- **app/** - Next.js frontend with App Router
  - `layout.tsx` - Root layout component
  - `page.tsx` - Main chat interface
  - `globals.css` - Global styles
  - `api/` - API routes
    - `chat/route.ts` - Chat endpoint
    - `batch/route.ts` - Batch processing endpoint

- **lib/** - Utility functions
  - `csv.ts` - CSV processing utilities

- **app.py** - FastAPI backend server

## Configuration Files

- `package.json` - Frontend dependencies
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS setup
- `next.config.js` - Next.js configuration
- `requirements.txt` - Python backend dependencies
- `.env.example` - Environment variables template

## Docker Setup

- `Dockerfile` - Container configuration
- `docker-compose.yml` - Multi-container orchestration

## Getting Started

1. Copy files from this template to your RAG app
2. Update API endpoints in `app/api/chat/route.ts` and `app/api/batch/route.ts` to point to your RAG backend
3. Modify `app.py` to integrate your RAG logic
4. Install dependencies: `npm install` and `pip install -r requirements.txt`
5. Set up `.env.local` with your configuration
6. Run the development server: `npm run dev`

## Key Integration Points

- **Frontend State**: The chat interface manages message state and API calls
- **API Routes**: Handle client requests and forward to FastAPI backend
- **FastAPI Backend**: Process requests and integrate with your RAG pipeline
- **CSV Processing**: Utility functions available in `lib/csv.ts` for data handling

## Next Steps for RAG Integration

1. Update the chat endpoint to accept RAG-specific parameters
2. Integrate your vector database and retrieval logic in `app.py`
3. Modify the UI components to display retrieved context
4. Add RAG-specific configurations to environment variables
