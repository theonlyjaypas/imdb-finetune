#!/bin/bash

# Start development servers with proper error handling

echo "Starting IMDB Sentiment Classifier..."
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8080"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local with MODEL_API_URL..."
    echo "MODEL_API_URL=http://localhost:8080" > .env.local
fi

# Install Python dependencies if needed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -r backend/requirements.txt
fi

# Run both servers
npx concurrently \
    "echo 'Starting backend on port 8080...' && cd backend && python app.py" \
    "sleep 2 && echo 'Starting frontend on port 3000...' && next dev"
