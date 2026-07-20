# Backend Deployment Guide

## Problem

The frontend is deployed on Vercel but the backend service is missing. The frontend tries to call `http://localhost:8080` which doesn't exist in production, resulting in "Internal server error".

## Solution

Deploy the backend service separately and update the frontend's `MODEL_API_URL` environment variable.

## Quick Deploy Options

### Option 1: HuggingFace Spaces (Recommended - Free, GPU Available)

1. Go to https://huggingface.co/spaces and create a new space
2. Choose "Docker" as the runtime
3. Clone your repo and push to the space's git repo
4. HuggingFace will automatically build and deploy
5. Get your space URL: `https://huggingface.co/spaces/YOUR-USERNAME/YOUR-SPACE-NAME`

### Option 2: Railway.app (Simple Docker Deployment)

1. Push your code to GitHub (if not already done)
2. Go to https://railway.app and sign in
3. Click "New Project" and select "Deploy from GitHub repo"
4. Select your repository
5. Configure environment variables:
   - `HF_TOKEN`: Your HuggingFace token (from https://huggingface.co/settings/tokens)
6. Click "Deploy"
7. Get your URL from the Railway dashboard (e.g., `https://imdb-backend-prod-up.railway.app`)

### Option 3: Render (Free Tier Available)

1. Go to https://render.com
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configuration:
   - Build command: `pip install -r backend/requirements.txt`
   - Start command: `python backend/app.py`
   - Environment variables:
     - `HF_TOKEN`: Your HuggingFace token
     - `PORT`: `8080` (optional, adjust if needed)
5. Deploy and get your URL

### Option 4: Modal (Best for ML Workloads - Free Tier)

```bash
# Install Modal CLI
pip install modal

# Authenticate
modal token new

# Create app.py wrapper for Modal (in your repo root)
# See example below

# Deploy
modal deploy app.py
```

**Example Modal deployment wrapper:**
```python
# modal_app.py
import modal

app = modal.App("imdb-backend")
image = modal.Image.debian_slim().pip_install_from_requirements("backend/requirements.txt")

@app.function(image=image, gpu="t4")
@modal.asgi_app()
def fastapi_app():
    import sys
    sys.path.insert(0, '/root/backend')
    from app import app as fastapi_app
    return fastapi_app
```

## Step 1: Deploy Backend

Choose one of the options above and deploy your backend. Note the public URL (e.g., `https://your-backend-url.com`).

## Step 2: Update Frontend Environment Variable

After deploying the backend, update your Vercel environment:

1. Go to your Vercel project dashboard
2. Click "Settings" -> "Environment Variables"
3. Find or create `MODEL_API_URL`
4. Set the value to your backend URL:
   ```
   MODEL_API_URL=https://your-backend-url.com
   ```
5. Make sure it's enabled for "Production"
6. Click "Save"
7. Redeploy: Go to "Deployments" and click "Redeploy" on the latest commit, or push a new commit to trigger auto-deploy

## Step 3: Verify

Test the API endpoint:
```bash
curl https://your-backend-url.com/health
```

Should return:
```json
{"status": "ok", "device": "..."}
```

## Local Testing

To test locally before deploying:

1. Terminal 1 - Start backend:
   ```bash
   cd backend
   export HF_TOKEN=your_token_here
   python app.py
   ```

2. Terminal 2 - Start frontend:
   ```bash
   export MODEL_API_URL=http://localhost:8080
   npm run dev
   ```

3. Open http://localhost:3000

## Troubleshooting

### "Internal server error" still appears
1. Check backend is running: `curl https://your-backend-url.com/health`
2. Verify `MODEL_API_URL` is set correctly in Vercel environment variables
3. Check backend logs for errors (Platform-specific: Railway/Render dashboard)
4. Ensure backend environment variable `HF_TOKEN` is also set

### 502 Bad Gateway
- Backend service might be loading (especially ML model). Wait 30-60 seconds after deploy.
- Check if your hosting plan has enough memory (model needs 2-3GB RAM)

### Connection timeout
- Backend URL might be incorrect
- Network firewall blocking request (check CORS on backend - it's already set to allow all origins)
- Service might be sleeping (some free tiers pause inactive apps)

## Production Checklist

- [ ] Backend deployed and responding to `/health`
- [ ] `MODEL_API_URL` set in Vercel environment variables
- [ ] Frontend redeployed after environment change
- [ ] Test sentiment classification end-to-end
- [ ] Monitor backend logs for errors
- [ ] Set up monitoring/alerting if available on your platform

## Cost Considerations

- **Railway**: Free tier includes $5/month credits (usually free for small projects)
- **Render**: Free tier with auto-sleep (fine for low traffic)
- **HuggingFace Spaces**: Free with community GPU (can be slow during peak)
- **Modal**: Free tier with 36GB monthly compute (good for testing)
