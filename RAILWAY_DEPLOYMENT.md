# Railway Deployment Guide

## Overview
This guide walks you through deploying the Marketing Agency Platform to Railway with all three services (API, Web, Worker) and required infrastructure (PostgreSQL, Redis).

## Prerequisites
- Railway account (sign up at https://railway.app)
- Railway CLI installed ✅ (already installed)
- AWS S3 bucket (or MinIO for development)
- API keys for: Gemini, Stripe, Meta, TikTok (optional, based on features needed)

## Step 1: Login to Railway

```bash
cd /Users/juanvintimilla/marketing-agency
railway login
```

This will open your browser for authentication.

## Step 2: Create a New Project

```bash
railway init
```

Give your project a name like "marketing-agency" or "neuroforge-complete"

## Step 3: Add Databases

### Add PostgreSQL
```bash
railway add --database postgres
```

### Add Redis
```bash
railway add --database redis
```

Railway will automatically create `DATABASE_URL` and `REDIS_URL` environment variables.

## Step 4: Set Environment Variables

### Option A: Use the setup script (Automated)
```bash
./railway-setup.sh
```

### Option B: Set manually (if you prefer)
```bash
# Critical secrets
railway variables set JWT_SECRET="db9cca82e67aec99b9171df88b6ecf39031ee04cf39d0c91d80770948359db224213fb1d5507a749f7ff94e35526ba70ac52c5f570d048c714ff99db2579c11c"
railway variables set TOKEN_ENCRYPTION_KEY="efa01774a68fe70ee2d5d33629560c76e5115951a4cfab43661e3072409c83b9"
railway variables set WORKER_SECRET="490e38867aacf5b55830825c87c3c3e189759ef044023c519bb26c71975e7106"

# AWS/S3 (update with your values)
railway variables set AWS_ACCESS_KEY_ID="your_aws_key"
railway variables set AWS_SECRET_ACCESS_KEY="your_aws_secret"
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET_NAME="your-bucket-name"
railway variables set AWS_S3_ENDPOINT="https://s3.us-east-1.amazonaws.com"
railway variables set AWS_S3_PUBLIC_URL="https://your-bucket-name.s3.amazonaws.com"

# AI Services
railway variables set GEMINI_API_KEY="your_gemini_key"

# OAuth (optional - update after getting your domains)
railway variables set GOOGLE_CLIENT_ID="your_google_client_id"
railway variables set GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Social Media APIs (optional)
railway variables set META_APP_ID="your_meta_app_id"
railway variables set META_APP_SECRET="your_meta_app_secret"
railway variables set TIKTOK_CLIENT_KEY="your_tiktok_key"
railway variables set TIKTOK_CLIENT_SECRET="your_tiktok_secret"

# Stripe (optional)
railway variables set STRIPE_SECRET_KEY="your_stripe_key"
railway variables set STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"
```

## Step 5: Deploy Services

Railway works best with monorepos by creating separate services for each app.

### Service 1: API
```bash
# Create a new service
railway service create api

# Set the build command
railway service --service api variables set BUILD_COMMAND="pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/api build"

# Set the start command
railway service --service api variables set START_COMMAND="node apps/api/dist/index.js"

# Deploy
railway up --service api
```

### Service 2: Web
```bash
# Create web service
railway service create web

# Set build command
railway service --service web variables set BUILD_COMMAND="pnpm install && pnpm --filter @agency/web build"

# Set start command
railway service --service web variables set START_COMMAND="cd apps/web && pnpm start"

# Set Next.js public vars
railway service --service web variables set NEXT_PUBLIC_API_URL="https://api-production-XXXX.up.railway.app"
railway service --service web variables set NEXT_PUBLIC_WEB_URL="https://web-production-XXXX.up.railway.app"

# Deploy
railway up --service web
```

### Service 3: Worker
```bash
# Create worker service
railway service create worker

# Set build command
railway service --service worker variables set BUILD_COMMAND="pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/worker build"

# Set start command
railway service --service worker variables set START_COMMAND="node apps/worker/dist/index.js"

# Deploy
railway up --service worker
```

## Step 6: Update URLs

After deployment, Railway will give you URLs for each service. Update these:

```bash
# Get your service URLs
railway status

# Update the environment variables with actual URLs
railway variables set FRONTEND_URL="https://web-production-XXXX.up.railway.app"
railway variables set API_URL="https://api-production-XXXX.up.railway.app"
railway variables set NEXT_PUBLIC_API_URL="https://api-production-XXXX.up.railway.app"
railway variables set NEXT_PUBLIC_WEB_URL="https://web-production-XXXX.up.railway.app"

# Update OAuth redirects
railway variables set GOOGLE_REDIRECT_URI="https://api-production-XXXX.up.railway.app/auth/google/callback"
railway variables set META_LOGIN_REDIRECT_URI="https://api-production-XXXX.up.railway.app/auth/meta/callback"
railway variables set META_REDIRECT_URI="https://api-production-XXXX.up.railway.app/publish/callback/instagram"
railway variables set TIKTOK_REDIRECT_URI="https://api-production-XXXX.up.railway.app/publish/callback/tiktok"
```

## Step 7: Run Database Migrations

```bash
# Connect to your Railway project
railway shell

# Run migrations
pnpm --filter @agency/db prisma migrate deploy
```

## Alternative: Using Docker (Recommended)

Railway can also deploy using the existing Dockerfiles:

### Deploy API with Docker
```bash
railway up --service api --dockerfile apps/api/Dockerfile
```

### Deploy Web with Docker
```bash
railway up --service web --dockerfile apps/web/Dockerfile --buildArgs NEXT_PUBLIC_API_URL=https://api-production-XXXX.up.railway.app,NEXT_PUBLIC_WEB_URL=https://web-production-XXXX.up.railway.app
```

### Deploy Worker with Docker
```bash
railway up --service worker --dockerfile apps/worker/Dockerfile
```

## Monitoring

View logs:
```bash
railway logs --service api
railway logs --service web
railway logs --service worker
```

Check service status:
```bash
railway status
```

## Troubleshooting

### Build fails
- Check that pnpm is being used (not npm)
- Verify all environment variables are set
- Check logs: `railway logs`

### Database connection issues
- Ensure DATABASE_URL is set automatically by Railway's PostgreSQL addon
- Check that Prisma migrations have been run
- Verify the database is accessible

### Redis connection issues
- Ensure REDIS_URL is set automatically by Railway's Redis addon
- Check Redis is running: `railway status`

## Cost Optimization

- Use Railway's free tier for development
- Monitor usage in Railway dashboard
- Consider using Railway's volume mounts for persistent storage instead of S3 for development

## Security Checklist

- [ ] All secrets are set in Railway (not in code)
- [ ] OAuth redirect URIs match production URLs
- [ ] S3 bucket has proper CORS configuration
- [ ] Database has connection pooling enabled
- [ ] API has rate limiting configured
- [ ] Stripe webhook secret is configured

## Support

For Railway-specific issues: https://help.railway.app
For platform issues: Check the logs and ensure all environment variables are properly set
