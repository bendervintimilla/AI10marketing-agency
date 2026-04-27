#!/bin/bash

# Railway Deployment Script - Quick Deploy
# Project: neuroforge-complete
# Project URL: https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6

echo "🚀 Deploying NeuroForge to Railway"
echo "=================================="
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Set critical environment variables (shared across all services)
echo "🔧 Setting up environment variables..."

# Add shared variables that all services will need
railway variables set JWT_SECRET="db9cca82e67aec99b9171df88b6ecf39031ee04cf39d0c91d80770948359db224213fb1d5507a749f7ff94e35526ba70ac52c5f570d048c714ff99db2579c11c"
railway variables set TOKEN_ENCRYPTION_KEY="efa01774a68fe70ee2d5d33629560c76e5115951a4cfab43661e3072409c83b9"
railway variables set WORKER_SECRET="490e38867aacf5b55830825c87c3c3e189759ef044023c519bb26c71975e7106"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📋 Next Steps (via Railway Dashboard):"
echo "======================================"
echo ""
echo "1. Add Redis Database:"
echo "   → Go to: https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6"
echo "   → Click 'New' → 'Database' → 'Add Redis'"
echo ""
echo "2. Create API Service:"
echo "   → Click 'New' → 'GitHub Repo'"
echo "   → Select: bendervintimilla/neuroforge-complete"
echo "   → Service Name: api"
echo "   → Root Directory: apps/api"
echo "   → Build Command: pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/api build"
echo "   → Start Command: node dist/index.js"
echo ""
echo "3. Create Web Service:"
echo "   → Click 'New' → 'GitHub Repo'"
echo "   → Select: bendervintimilla/neuroforge-complete"
echo "   → Service Name: web"
echo "   → Root Directory: apps/web"
echo "   → Build Command: pnpm install && pnpm --filter @agency/web build"
echo "   → Start Command: pnpm start"
echo ""
echo "4. Create Worker Service:"
echo "   → Click 'New' → 'GitHub Repo'"
echo "   → Select: bendervintimilla/neuroforge-complete"
echo "   → Service Name: worker"
echo "   → Root Directory: apps/worker"
echo "   → Build Command: pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/worker build"
echo "   → Start Command: node dist/index.js"
echo ""
echo "5. Set Service-Specific Variables:"
echo "   For Web service, add:"
echo "   → NEXT_PUBLIC_API_URL (set after API is deployed)"
echo "   → NEXT_PUBLIC_WEB_URL (set after Web is deployed)"
echo ""
echo "6. Add Your API Keys (Required):"
echo "   → GEMINI_API_KEY"
echo "   → AWS_ACCESS_KEY_ID"
echo "   → AWS_SECRET_ACCESS_KEY"
echo "   → AWS_S3_ENDPOINT"
echo "   → AWS_S3_BUCKET_NAME"
echo "   → (and any other API keys you need)"
echo ""
echo "📚 See RAILWAY_DEPLOYMENT.md for detailed instructions"
