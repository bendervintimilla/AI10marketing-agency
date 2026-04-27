#!/bin/bash

# Railway Deployment Setup Script
# Run this after logging in with: railway login

echo "🚀 Setting up Railway deployment for Marketing Agency Platform"
echo ""

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Link or create project
echo "📦 Linking to Railway project..."
# If you have an existing project, use: railway link
# If creating new, Railway will prompt you

# Add PostgreSQL
echo "🗄️  Adding PostgreSQL database..."
railway add --database postgres

# Add Redis
echo "📮 Adding Redis..."
railway add --database redis

# Set environment variables
echo "🔧 Setting environment variables..."

# Critical variables
railway variables set JWT_SECRET="db9cca82e67aec99b9171df88b6ecf39031ee04cf39d0c91d80770948359db224213fb1d5507a749f7ff94e35526ba70ac52c5f570d048c714ff99db2579c11c"
railway variables set TOKEN_ENCRYPTION_KEY="efa01774a68fe70ee2d5d33629560c76e5115951a4cfab43661e3072409c83b9"
railway variables set WORKER_SECRET="490e38867aacf5b55830825c87c3c3e189759ef044023c519bb26c71975e7106"

# AWS/S3 Configuration (update these with your production values)
railway variables set AWS_REGION="us-east-1"
railway variables set AWS_S3_BUCKET_NAME="media-assets"

# Frontend/API URLs (will be updated after deployment)
railway variables set FRONTEND_URL="https://your-frontend-url.railway.app"
railway variables set API_URL="https://your-api-url.railway.app"
railway variables set NEXT_PUBLIC_API_URL="https://your-api-url.railway.app"
railway variables set NEXT_PUBLIC_WEB_URL="https://your-frontend-url.railway.app"

# Agent URLs
railway variables set AGENT_COPY_URL="https://your-api-url.railway.app"
railway variables set AGENT_GENERATION_URL="https://your-api-url.railway.app"
railway variables set AGENT_PUBLISH_URL="https://your-api-url.railway.app"

# OAuth Redirects (update after deployment)
railway variables set GOOGLE_REDIRECT_URI="https://your-api-url.railway.app/auth/google/callback"
railway variables set META_LOGIN_REDIRECT_URI="https://your-api-url.railway.app/auth/meta/callback"
railway variables set META_REDIRECT_URI="https://your-api-url.railway.app/publish/callback/instagram"
railway variables set TIKTOK_REDIRECT_URI="https://your-api-url.railway.app/publish/callback/tiktok"

echo ""
echo "✅ Basic environment variables set!"
echo ""
echo "⚠️  IMPORTANT: You need to set these variables manually with your own keys:"
echo "   - GEMINI_API_KEY (for AI features)"
echo "   - AWS_ACCESS_KEY_ID (for S3 storage)"
echo "   - AWS_SECRET_ACCESS_KEY (for S3 storage)"
echo "   - AWS_S3_ENDPOINT (your S3 endpoint)"
echo "   - AWS_S3_PUBLIC_URL (your S3 public URL)"
echo "   - GOOGLE_CLIENT_ID (for Google OAuth)"
echo "   - GOOGLE_CLIENT_SECRET (for Google OAuth)"
echo "   - META_APP_ID (for Facebook/Instagram)"
echo "   - META_APP_SECRET (for Facebook/Instagram)"
echo "   - TIKTOK_CLIENT_KEY (for TikTok)"
echo "   - TIKTOK_CLIENT_SECRET (for TikTok)"
echo "   - STRIPE_SECRET_KEY (for payments)"
echo "   - STRIPE_WEBHOOK_SECRET (for payments)"
echo "   - STRIPE_PRICE_ID_PRO (for payments)"
echo "   - STRIPE_PRICE_ID_ENTERPRISE (for payments)"
echo ""
echo "Use: railway variables set VARIABLE_NAME=\"value\""
echo ""
echo "🚀 After setting your API keys, run: railway up"
