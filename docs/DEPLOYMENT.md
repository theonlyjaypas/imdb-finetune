# Deployment Guide

This document covers deploying your Next.js chatbot application to various platforms.

## Prerequisites

- Docker installed locally
- Git push access to trigger CI/CD
- Target platform credentials configured

## Local Docker Testing

Before deploying to production, test locally:

```bash
# Build Docker image
docker build -t chatbot:latest .

# Run container
docker run -p 3000:3000 chatbot:latest

# Test health check
curl http://localhost:3000/
```

## Deployment Platforms

### Option 1: Google Cloud Run (Recommended - Easiest)

Best for: Stateless apps, serverless, pay-per-use

```bash
# Set variables
PROJECT_ID="your-gcp-project"
REGION="us-central1"
SERVICE_NAME="chatbot-app"

# Build and push to Google Cloud Registry
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 3000 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 100

# Test deployment
gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)'
```

### Option 2: AWS ECS (Fargate)

Best for: Team infrastructure, long-running services, more control

```bash
# Create ECR repository
aws ecr create-repository --repository-name chatbot-app --region us-east-1

# Build and push
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t chatbot:latest .
docker tag chatbot:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/chatbot-app:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/chatbot-app:latest

# Update ECS service with new image
aws ecs update-service \
  --cluster production-cluster \
  --service chatbot-app \
  --force-new-deployment \
  --region us-east-1
```

### Option 3: Vercel (Easiest - Native Next.js)

Best for: Next.js apps, automatic deployments, no infrastructure management

1. Push code to GitHub
2. Go to vercel.com and connect your repository
3. Vercel auto-detects Next.js and deploys automatically
4. Set environment variables in Vercel dashboard

```bash
# Or deploy via CLI
npm i -g vercel
vercel login
vercel --prod
```

### Option 4: VPS with Docker (Ubuntu/Debian)

Best for: Full control, cost-effective, own infrastructure

```bash
# SSH into server
ssh user@your-server.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repo and build
git clone <your-repo-url>
cd chatbot-app
docker build -t chatbot:latest .

# Run with auto-restart
docker run -d \
  --name chatbot \
  --restart always \
  -p 80:3000 \
  -e NODE_ENV=production \
  chatbot:latest

# Verify running
docker ps
docker logs chatbot
```

## Rollback Procedure

### If deployed on Cloud Run:
```bash
gcloud run deploy chatbot-app \
  --image gcr.io/$PROJECT_ID/chatbot-app:previous-version \
  --region us-central1
```

### If deployed on ECS:
```bash
aws ecs update-service \
  --cluster production-cluster \
  --service chatbot-app \
  --task-definition chatbot-app:PREVIOUS_VERSION \
  --region us-east-1
```

### If deployed on VPS:
```bash
docker stop chatbot
docker run -d --name chatbot --restart always -p 80:3000 chatbot:previous-tag
```

## Health Checks

After deployment, verify:

```bash
# Direct URL test
curl -I https://your-app-url.com/

# Response should be 200 OK

# Check logs (Cloud Run)
gcloud run logs read chatbot-app --limit=50

# Check logs (ECS)
aws logs tail /ecs/chatbot-app --follow

# Check logs (Docker VPS)
docker logs chatbot -f
```

## Environment Variables

Create a `.env.local` file (not committed) or set via platform UI:

```bash
# Example
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://user:pass@host/db
```

## SSL/HTTPS

- Cloud Run: Automatic (free)
- Vercel: Automatic (free)
- AWS: Use ACM + ALB/CloudFront
- VPS: Use Nginx reverse proxy + Let's Encrypt

```bash
# Example Nginx config for VPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

Recommended tools:
- **Errors**: Sentry.io (free tier available)
- **Performance**: New Relic, DataDog
- **Logs**: Cloud provider logs (Cloud Run Logs, CloudWatch, etc.)
- **Uptime**: UptimeRobot, Pingdom

Add to your app:
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
}
```

Then monitor: `https://your-app.com/api/health`
