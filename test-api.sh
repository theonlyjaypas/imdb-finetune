#!/bin/bash

# Test the backend API directly

echo "Testing backend API..."
sleep 1

curl -X POST http://localhost:8080/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "This movie was great!"}' \
  -v

echo ""
echo ""
echo "Testing frontend API..."
sleep 1

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "This movie was great!"}' \
  -v
