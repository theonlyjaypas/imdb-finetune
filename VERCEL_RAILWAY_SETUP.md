# Deploy to Vercel + Railway (5 Minutes)

This guide shows how to deploy your frontend on Vercel and backend on Railway. **Recommended approach for this project.**

## Prerequisites

- GitHub account with your repo pushed
- HuggingFace token (from https://huggingface.co/settings/tokens)

## Part 1: Deploy Backend to Railway (3 Minutes)

### Step 1: Go to Railway
1. Visit https://railway.app
2. Click "Login with GitHub" and authorize
3. Click "New Project"

### Step 2: Select Your Repository
1. Click "Deploy from GitHub repo"
2. Find and select your repository (`imdb-finetune`)
3. Click "Deploy Now"

### Step 3: Configure Environment
Railway auto-detects it's a Python project. Now add environment variable:

1. Click "Variables" tab in Railway
2. Click "New Variable"
3. Set:
   - Key: `HF_TOKEN`
   - Value: `hf_your_token_here` (paste your actual token)
4. Click "Add"

### Step 4: Set Build & Start Commands
Railway should auto-detect, but verify:

1. Go to "Settings" tab
2. Under "Build", ensure start command is:
   ```
   python backend/app.py
   ```
   If it shows `npm start` or similar, change it to the above.

3. Railway will auto-detect port 8080 from your `app.py`

### Step 5: Deploy & Get URL
1. Click "Deploy" 
2. Watch the logs (should see model loading)
3. Once deployed, Railway shows your URL like:
   ```
   https://imdb-backend-prod-up.railway.app
   ```
4. **Copy this URL** - you need it for the frontend!

### Verify Backend Works
```bash
curl https://imdb-backend-prod-up.railway.app/health
```

Should return:
```json
{"status": "ok", "device": "cuda"}
```

If it hangs or errors, wait 30-60 seconds (model is loading).

---

## Part 2: Deploy Frontend to Vercel (2 Minutes)

### Step 1: Go to Vercel
1. Visit https://vercel.com
2. Click "Import Project"
3. Select your GitHub repo (`imdb-finetune`)

### Step 2: Set Environment Variable
**IMPORTANT: Before deploying, set the backend URL!**

1. Scroll to "Environment Variables"
2. Add variable:
   - Name: `MODEL_API_URL`
   - Value: `https://imdb-backend-prod-up.railway.app` (or your Railway URL from Part 1)
3. Make sure it says "Production"

### Step 3: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. You'll get URL like `https://imdb-finetune-v2-ten-vercel.app`

---

## Final Verification

### Test the Deployed App
1. Open your Vercel URL
2. Enter a movie review in the chat
3. Click "Classify"
4. Should see sentiment result (not "Internal server error")

### If Still Getting Error
Check these in order:

1. **Verify backend is live:**
   ```bash
   curl https://your-railway-url.com/health
   ```
   If it hangs → wait more (model loading), then try again

2. **Check Vercel has correct URL:**
   - Vercel dashboard → Project → Settings → Environment Variables
   - Verify `MODEL_API_URL` is set to your Railway URL
   - Not set to localhost!

3. **Redeploy frontend if you changed env var:**
   - Go to Deployments tab
   - Click "Redeploy" on the latest build
   - Or push a new commit to trigger auto-deploy

4. **Check Railway logs:**
   - Railway dashboard → Your project
   - Click "Deployments" tab
   - View logs to see if model loaded successfully

---

## Cost

- **Vercel**: Free tier includes unlimited deployments, 100GB bandwidth
- **Railway**: Free tier includes $5/month credits (should cover small project)
  - If you hit limit, it's ~$0.50 per GB RAM per month
  - Your backend uses ~2-3GB during inference = ~$1.50-2.50/month

**Total cost**: Usually free or ~$2-3/month

---

## After First Deploy: Auto-Updates

Now whenever you push to GitHub:
1. Vercel auto-redeploys frontend (a few seconds)
2. Railway auto-redeploys backend (a few minutes)

No manual steps needed!

---

## Troubleshooting

### Backend won't deploy on Railway
- Check Railway logs for Python errors
- Common issue: `pip install` fails → Missing system dependency
- Solution: Add `nixpacks.toml` to root with system packages

### "Internal server error" persists
- Wait 60 seconds for model to fully load on first request
- Check `MODEL_API_URL` is NOT `http://localhost:8080`
- Verify Railway backend URL is correct (copy-paste from Railway dashboard)

### Railway keeps timing out
- Model is too slow for your tier
- You might need to upgrade Railway plan or use smaller model
- Contact Railway support for memory limits

---

## Next Steps

1. ✓ Push code to GitHub (already done)
2. Go to Railway and deploy backend (3 min)
3. Copy Railway URL
4. Go to Vercel and deploy frontend with Railway URL (2 min)
5. Test at your Vercel URL

**You're done!** App is now live.
