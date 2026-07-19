# Testing Guide

Complete testing procedures for the chatbot framework template.

## Quick Test (5 minutes)

### Prerequisites
- Node.js installed
- Python 3.8+ installed
- Terminal/command line access

### Step 1: Install Dependencies

```bash
cd /Users/jaypas/MLENG/MINI/chatbot-app/template

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt
```

### Step 2: Start Backend

```bash
# Terminal 1
python app.py
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Start Frontend

```bash
# Terminal 2
npm run dev
```

Expected output:
```
  > Ready in 2.5s
  ✓ Ready on http://localhost:3000
```

### Step 4: Test in Browser

1. Open http://localhost:3000
2. Type a message in the chat box
3. Press Enter or click Send
4. Should see a response from the backend

That's it! Framework is working if you see responses.

---

## Detailed Testing

### Test 1: Backend API Testing

#### 1.1 Test Chat Endpoint with curl

```bash
# Make sure backend is running (python app.py)

curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, what is this?"}'
```

Expected response:
```json
{
  "response": "This is a chatbot framework built with FastAPI and Next.js..."
}
```

#### 1.2 Test Batch Endpoint with curl

```bash
curl -X POST http://localhost:8000/batch \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      "Hello",
      "How are you?",
      "What is 2+2?"
    ]
  }'
```

Expected response:
```json
{
  "results": [
    {"message": "Hello", "response": "..."},
    {"message": "How are you?", "response": "..."},
    {"message": "What is 2+2?", "response": "..."}
  ]
}
```

#### 1.3 Test Health Check (if available)

```bash
curl http://localhost:8000/docs
```

This opens FastAPI's interactive API documentation. Test endpoints there:
1. Click on `/chat` endpoint
2. Click "Try it out"
3. Enter a message
4. Click "Execute"
5. Should see 200 response with reply

### Test 2: Frontend Testing

#### 2.1 Visual Testing

With frontend running at http://localhost:3000:

1. **Check UI loads**
   - Page displays chat interface
   - Input field visible
   - Send button visible
   - Message area displays

2. **Type a message**
   - Text appears in input field
   - Can clear text
   - Can type multiple messages

3. **Send message**
   - Click send button
   - Message appears in chat history
   - Loading state appears while waiting
   - Response displays from bot

4. **Multiple messages**
   - Send 3-5 messages
   - All appear in order
   - Scroll works if needed
   - Conversation makes sense

#### 2.2 Browser Console Testing

While on localhost:3000:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for any error messages
4. Should be clean or only warnings

Check Network tab:
1. Open DevTools → Network tab
2. Send a message
3. Look for `/api/chat` request
4. Status should be 200
5. Response should show the bot's reply

### Test 3: Integration Testing

#### 3.1 End-to-End Flow

1. Start both backend and frontend
2. Type message: "test"
3. Observe:
   - Message sent to `/api/chat` (check Network tab)
   - Backend processes it (check backend console)
   - Response returns to frontend
   - Message displays in chat interface

#### 3.2 Error Handling

Test how errors are handled:

**Test missing backend:**
```bash
# Stop backend (Ctrl+C in backend terminal)
# Try to send message in frontend
# Should show error message or graceful failure
```

**Test invalid message:**
```bash
# Send empty message
# Send very long message (>10000 chars)
# Frontend should handle gracefully
```

### Test 4: API Response Format

#### 4.1 Verify Response Structure

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' | jq .
```

Should show:
```json
{
  "response": "string value here"
}
```

#### 4.2 Verify Batch Response

```bash
curl -X POST http://localhost:8000/batch \
  -H "Content-Type: application/json" \
  -d '{"messages":["a","b"]}' | jq .
```

Should show:
```json
{
  "results": [
    {"message": "a", "response": "..."},
    {"message": "b", "response": "..."}
  ]
}
```

---

## Testing Tools

### Using Postman

1. Download Postman from https://www.postman.com/downloads/
2. Create new request:
   - Method: POST
   - URL: http://localhost:8000/chat
   - Headers: Content-Type: application/json
   - Body (raw JSON):
     ```json
     {
       "message": "Hello world"
     }
     ```
3. Click Send
4. Should see response

### Using VS Code REST Client

1. Install REST Client extension in VS Code
2. Create file `test.http`:

```http
### Test Chat Endpoint
POST http://localhost:8000/chat
Content-Type: application/json

{
  "message": "Hello"
}

### Test Batch Endpoint
POST http://localhost:8000/batch
Content-Type: application/json

{
  "messages": ["Hello", "How are you?", "Test"]
}
```

3. Click "Send Request" above each request
4. See response in new panel

### Using Python Requests

```python
import requests
import json

# Test chat endpoint
response = requests.post(
    'http://localhost:8000/chat',
    json={'message': 'Hello world'}
)

print(response.status_code)
print(response.json())
```

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Install: brew install httpd (macOS)

# Send 100 requests, 10 concurrent
ab -n 100 -c 10 -p data.json \
  -T application/json \
  http://localhost:8000/chat
```

### Latency Testing

```bash
# Simple latency check
time curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' > /dev/null
```

Expected: < 1 second for response

### Browser Performance

1. Open DevTools → Performance tab
2. Click Record
3. Send a message in chat
4. Stop recording
5. Analyze:
   - Time to response
   - Memory usage
   - No long tasks > 50ms

---

## Docker Testing

### Test with Docker Compose

```bash
# Build images
docker-compose build

# Run containers
docker-compose up

# In another terminal, test
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Test Individual Containers

```bash
# Build backend image
docker build -t chatbot-backend .

# Run backend container
docker run -p 8000:8000 chatbot-backend

# Test from another terminal
curl http://localhost:8000/chat -X POST ...
```

---

## Automated Testing

### Frontend Testing with Jest (Optional)

Create `app/page.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import Home from './page';

test('renders chat interface', () => {
  render(<Home />);
  const input = screen.getByPlaceholderText(/message/i);
  expect(input).toBeInTheDocument();
});
```

Run:
```bash
npm test
```

### Backend Testing with Pytest (Optional)

Create `test_app.py`:

```python
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_chat_endpoint():
    response = client.post("/chat", json={"message": "test"})
    assert response.status_code == 200
    assert "response" in response.json()

def test_batch_endpoint():
    response = client.post(
        "/batch",
        json={"messages": ["hello", "world"]}
    )
    assert response.status_code == 200
    assert len(response.json()["results"]) == 2
```

Run:
```bash
pip install pytest
pytest test_app.py -v
```

---

## Testing Checklist

### Backend Tests
- [ ] Backend starts without errors
- [ ] `/chat` endpoint responds to POST requests
- [ ] `/batch` endpoint responds to multiple messages
- [ ] Response includes expected fields (response, etc.)
- [ ] Response status code is 200
- [ ] CORS headers are present
- [ ] Error handling works for invalid input
- [ ] Performance: response time < 1 second

### Frontend Tests
- [ ] Page loads at http://localhost:3000
- [ ] Chat interface displays correctly
- [ ] Input field accepts text
- [ ] Send button works
- [ ] Messages appear in chat history
- [ ] Loading indicator shows while waiting
- [ ] Responses display properly
- [ ] Multiple messages work in sequence
- [ ] Styling looks good (no broken layouts)
- [ ] No console errors

### Integration Tests
- [ ] Frontend can reach backend
- [ ] Message sent → API called → response received
- [ ] Response displays in frontend
- [ ] Batch messages process correctly
- [ ] Error in backend shows in frontend
- [ ] Frontend handles timeout gracefully

### Docker Tests
- [ ] docker-compose build completes
- [ ] docker-compose up starts both services
- [ ] API accessible at http://localhost:8000
- [ ] Frontend accessible at http://localhost:3000
- [ ] Frontend can call backend through Docker network
- [ ] docker-compose down stops cleanly

---

## Debugging

### Backend Debugging

Check logs:
```bash
# View full output
python app.py

# Look for errors, check request/response format
```

Add debug logging in `app.py`:
```python
@app.post("/chat")
async def chat(message: str):
    print(f"Received message: {message}")
    response = "test response"
    print(f"Sending response: {response}")
    return {"response": response}
```

Use FastAPI docs:
- Visit http://localhost:8000/docs
- Try endpoints interactively
- See request/response in real-time

### Frontend Debugging

Browser DevTools (F12):

**Console Tab:**
- Check for JavaScript errors
- Search for "error" or "Error"

**Network Tab:**
- Send a message
- Look for `/api/chat` request
- Check response status (200 = ok)
- View response body
- View request headers and body

**Sources Tab:**
- Set breakpoints in code
- Step through message sending
- Check variable values

### Common Issues

| Issue | Solution |
|-------|----------|
| Backend won't start | Check Python installed: `python --version` |
| Port 8000 in use | Kill process: `lsof -i :8000` then `kill -9 <PID>` |
| Port 3000 in use | Kill process: `lsof -i :3000` then `kill -9 <PID>` |
| CORS error | Check backend CORS config in app.py |
| Blank page | Check browser console for errors (F12) |
| No response | Check backend running, network tab shows request |
| npm install fails | Try: `rm -rf node_modules package-lock.json` then `npm install` |
| pip install fails | Try: `pip install --upgrade pip` then retry |

---

## Test Scenarios

### Scenario 1: Happy Path
```
1. Start backend (python app.py)
2. Start frontend (npm run dev)
3. Open browser to http://localhost:3000
4. Type "Hello" in input field
5. Click Send button
6. See response appear in chat
EXPECTED: Works perfectly
```

### Scenario 2: Multiple Messages
```
1. Send "Hello"
2. Wait for response
3. Send "How are you?"
4. Wait for response
5. Send "What is 2+2?"
6. Wait for response
EXPECTED: All 3 messages and responses appear in order
```

### Scenario 3: Batch Processing
```
1. Make curl request to /batch with 3 messages
2. Wait for response
EXPECTED: All 3 results returned in array
```

### Scenario 4: Error Handling
```
1. Stop backend
2. Try to send message in frontend
3. Wait for timeout or error
EXPECTED: Shows error message gracefully
```

### Scenario 5: Performance
```
1. Send message
2. Measure response time (browser Network tab or curl)
EXPECTED: Response time < 1 second
```

---

## Success Criteria

Your framework is working correctly when:

- ✅ Backend starts without errors
- ✅ Frontend loads in browser
- ✅ Can type message and see it sent
- ✅ Backend processes and responds
- ✅ Response displays in frontend
- ✅ Multiple messages work
- ✅ No console errors
- ✅ Response time acceptable (<1 sec)
- ✅ Docker containers build and run

Once all these pass, your template is ready for RAG integration!

---

## Next Steps After Testing

Once testing passes:

1. Read: QUICK_INTEGRATION_SUMMARY.md
2. Modify: app.py for RAG logic
3. Modify: app/page.tsx for displaying sources
4. Test again with RAG-specific features
5. Deploy using docker-compose
