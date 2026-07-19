# Deployment Quick Start

## 3-Minute Setup for Common Platforms

### For Vercel (Easiest - Recommended for Next.js)

1. Push your code to GitHub
2. Go to https://vercel.com/import
3. Import your repository
4. Click "Deploy" - that's it!

Auto-deploys on every push to main branch.

```bash
# Or use CLI
npm i -g vercel
vercel login
vercel --prod
```

### For Google Cloud Run (5 minutes)

```bash
# 1. Set up authentication
gcloud auth login
gcloud config set project YOUR-PROJECT-ID

# 2. Build and deploy
gcloud run deploy chatbot-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# 3. Get your URL
gcloud run services describe chatbot-app --region us-central1 --format='value(status.url)'
```

### For AWS (with ECS)

```bash
# Prerequisites: AWS CLI + credentials configured

# 1. Create ECR repository
aws ecr create-repository --repository-name chatbot-app

# 2. Build and push
./scripts/deploy.sh

# 3. Update ECS service (adjust cluster/service names)
aws ecs update-service --cluster prod --service chatbot-app --force-new-deployment
```

### For Any Docker Host (VPS, Linode, DigitalOcean, etc.)

```bash
# SSH into your server
ssh user@your-server.com

# Clone and deploy
git clone <your-repo>
cd chatbot-app
docker build -t chatbot:latest .
docker run -d --restart always -p 80:3000 -e NODE_ENV=production chatbot:latest

# Verify
docker ps
curl http://localhost
```

## After Deployment

1. **Check it's running:**
   ```bash
   curl https://your-app-url.com/
   ```

2. **View logs:**
   - Cloud Run: `gcloud run logs read chatbot-app`
   - ECS: `aws logs tail /ecs/chatbot-app --follow`
   - Docker: `docker logs container-name -f`

3. **Set up monitoring:**
   - Use free tier: Sentry, Datadog, or New Relic
   - Monitor URL: `https://your-url.com/api/health`

## Environment Variables

Add to your deployment platform (not in .env):

Example:
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Rollback (If Something Goes Wrong)

```bash
# Cloud Run
gcloud run deploy chatbot-app --image gcr.io/PROJECT/chatbot-app:PREVIOUS_TAG

# Docker
docker run -d -p 80:3000 chatbot:previous-tag

# ECS
aws ecs update-service --cluster prod --service chatbot-app --task-definition chatbot-app:PREVIOUS_VERSION
```

## SSL/HTTPS

- Vercel: Automatic
- Cloud Run: Automatic
- AWS: Use CloudFront or ALB
- VPS: Use Nginx + Let's Encrypt (see docs/DEPLOYMENT.md)

## Continuous Deployment

Push to main branch -> GitHub Actions builds -> Image pushed -> Deploy

Monitor workflow: https://github.com/YOUR-ORG/chatbot-app/actions

## Questions?

See full guide: `docs/DEPLOYMENT.md`
