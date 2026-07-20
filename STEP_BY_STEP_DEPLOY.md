# Step-by-Step Deployment Guide

## Prerequisites Check

Before starting, you need:
1. Your code pushed to GitHub
2. HuggingFace token from https://huggingface.co/settings/tokens (get a new one if needed)

---

## PART A: DEPLOY BACKEND TO RAILWAY

### Step A1: Go to Railway Website
1. Open browser and go to: **https://railway.app**
2. Click the **"Login with GitHub"** button in top right
3. Click **"Authorize railway-app"** (approve GitHub access)
4. You're now logged in to Railway

### Step A2: Create New Project
1. On Railway dashboard, look for **"New Project"** button
2. Click it
3. You'll see options. Click **"Deploy from GitHub repo"**

### Step A3: Select Your Repository
1. A list of your GitHub repos appears
2. Find and click **"imdb-finetune"**
3. Click **"Deploy Now"**
4. Railway starts deploying automatically

**Note:** This may take 5-10 minutes. You'll see logs showing:
```
Installing dependencies...
pip install requirements...
Starting Python app...
```

### Step A4: Add HuggingFace Token (IMPORTANT)
While it's deploying, add your environment variable:

1. In Railway dashboard, click on your project
2. Look for **"Variables"** tab at the top
3. Click **"New Variable"** button
4. In the popup:
   - **Key:** `HF_TOKEN`
   - **Value:** `hf_xxxxxxxxx...` (paste your actual HuggingFace token)
5. Click **"Add"**

### Step A5: Wait for Deployment to Complete
1. You'll see a green checkmark when done
2. Look for the **"Domains"** section
3. You'll see a URL like: **`https://imdb-backend-prod-up.railway.app`**
4. **COPY THIS URL** - you'll need it in Part B!

### Step A6: Test Backend is Working
1. Open a new browser tab
2. Paste your Railway URL + `/health`:
   ```
   https://imdb-backend-prod-up.railway.app/health
   ```
3. You should see:
   ```json
   {"status": "ok", "device": "cuda"}
   ```
4. If you get an error or timeout, wait 30-60 seconds (model is still loading) and try again

**If it works, you can move to Part B!**

---

## PART B: UPDATE FRONTEND ON VERCEL

### Step B1: Go to Vercel Dashboard
1. Open: **https://vercel.com/dashboard**
2. You should be logged in already (if not, log in with GitHub)
3. Find your project **"imdb-finetune"** in the list
4. Click on it

### Step B2: Open Settings
1. At the top of the page, click **"Settings"** tab
2. On the left side menu, click **"Environment Variables"**

### Step B3: Add Environment Variable
1. Look for **"New Variable"** button
2. Click it
3. A form appears:
   - **Key:** `MODEL_API_URL`
   - **Value:** Paste your Railway URL from Step A5 (e.g., `https://imdb-backend-prod-up.railway.app`)
   - **Select Environments:** Make sure **"Production"** is checked
4. Click **"Save"**

**IMPORTANT:** Make sure the value is the Railway URL, NOT `http://localhost:8080`!

### Step B4: Redeploy Frontend
You have two options:

**Option 1 (Automatic):**
1. Go to **"Deployments"** tab
2. Click the three dots (...) on your latest deployment
3. Click **"Redeploy"**
4. Wait for it to finish (green checkmark)

**Option 2 (Push new commit):**
1. Make any small change to your code (like adding a comment)
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "update: fix backend connection"
   git push
   ```
3. Vercel automatically redeploys within seconds

### Step B5: Wait for Deployment
You'll see deployment progress. Once it shows **green checkmark**, you're done!

---

## PART C: TEST THE COMPLETE APP

### Step C1: Open Your Deployed App
1. In Vercel dashboard, look for your project's URL
2. It looks like: `https://imdb-finetune-v2-ten-vercel.app`
3. Click it to open

### Step C2: Test Sentiment Analysis
1. You see the chat interface
2. In the text box, type a movie review:
   ```
   This is an amazing movie! I loved every second of it.
   ```
3. Click **"Classify"** button
4. Wait a few seconds...

### Step C3: Verify It Works
You should see:
- Green badge saying **"Positive"**
- Confidence percentage like **"97.5% confidence"**
- **NOT** an error message!

If you see "Sorry, something went wrong", go to **Troubleshooting** section below.

---

## TROUBLESHOOTING

### Problem 1: Still Getting "Internal server error"

**Check 1: Is backend running?**
1. Go back to your Railway URL in browser
2. Add `/health` to the end
3. Should show JSON, not an error
4. If it errors/times out, wait 60 seconds and try again (model is loading)

**Check 2: Did you update Vercel environment variable?**
1. Go to Vercel → Settings → Environment Variables
2. Find `MODEL_API_URL`
3. Make sure it's your Railway URL (not localhost!)
4. Make sure it's saved and "Production" is checked

**Check 3: Did you redeploy Vercel frontend?**
1. Go to Vercel → Deployments
2. Click "Redeploy" on the latest build
3. Wait for it to finish (green checkmark)
4. Then test again

### Problem 2: Backend deployment failed on Railway

**Check logs:**
1. Go to Railway dashboard
2. Click your project
3. Look for **"Deployments"** or **"Build"** logs
4. Scroll to see error messages

**Common errors:**
- Missing `HF_TOKEN` → Add it in Variables tab
- Python error → Check if `backend/app.py` is correct
- Model download failed → Railway ran out of space (rare)

### Problem 3: Long wait time when clicking Classify

First time loading the ML model takes 30-60 seconds. This is normal. Wait.
Subsequent requests should be fast (2-5 seconds).

---

## Summary of What You Did

| Service | What's Running | URL |
|---------|----------------|-----|
| Backend | Python FastAPI with ML model | `https://imdb-backend-xyz.railway.app` |
| Frontend | Next.js React app | `https://imdb-finetune-v2-ten-vercel.app` |

Frontend calls backend at Railway URL. When you classify a review, it goes:
```
Your Browser → Vercel Frontend → Railway Backend → Response
```

---

## If Everything Works!

Congratulations! Your app is live. Now:

1. Every time you push to GitHub, both Vercel and Railway auto-update
2. You can share your Vercel URL with others
3. Monitor performance in both dashboards

To update code:
```bash
git add .
git commit -m "your message"
git push
```

Done! Vercel and Railway auto-deploy.

---

## Questions?

If you get stuck on any step, let me know which step number (A1, A2, B1, etc.) and I'll help!
