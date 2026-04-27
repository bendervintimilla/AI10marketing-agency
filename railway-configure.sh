#!/bin/bash

# Railway Service Configuration Helper
# Interactive guide for completing Railway deployment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_URL="https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Railway NeuroForge Deployment Configuration           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Already Completed:${NC}"
echo "  • Project created: neuroforge-complete"
echo "  • PostgreSQL database added"
echo "  • Redis database added"
echo "  • Three services created (api, web, worker)"
echo "  • Environment variables set (JWT_SECRET, etc.)"
echo ""
echo -e "${YELLOW}⏳ Remaining Steps (6 minutes):${NC}"
echo ""

# Function to wait for user confirmation
wait_for_user() {
    echo -e "${YELLOW}Press ENTER when ready to continue...${NC}"
    read
}

# Open Railway dashboard
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 1: Opening Railway Dashboard${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Opening: $PROJECT_URL"
echo ""
open "$PROJECT_URL" 2>/dev/null || echo "Please open this URL manually: $PROJECT_URL"
wait_for_user

# Configure API Service
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 2: Configure API Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. In Railway dashboard, click the '${YELLOW}api${NC}' service"
echo "2. Click 'Settings' in the sidebar"
echo "3. Scroll to 'Service Source' section"
echo "4. Click 'Connect Repo' or 'Change Source'"
echo "5. Select: ${GREEN}bendervintimilla/neuroforge-complete${NC}"
echo "6. Set Root Directory to: ${GREEN}apps/api${NC}"
echo ""
echo "7. Scroll to 'Build' section"
echo "8. Set Build Command:"
echo -e "${GREEN}pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/api build${NC}"
echo ""
echo "9. Set Start Command:"
echo -e "${GREEN}cd apps/api && node dist/index.js${NC}"
echo ""
echo "10. Click 'Deploy' button"
echo ""
wait_for_user

# Configure Web Service
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 3: Configure Web Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Click the '${YELLOW}web${NC}' service"
echo "2. Click 'Settings' in the sidebar"
echo "3. Scroll to 'Service Source' section"
echo "4. Click 'Connect Repo' or 'Change Source'"
echo "5. Select: ${GREEN}bendervintimilla/neuroforge-complete${NC}"
echo "6. Set Root Directory to: ${GREEN}apps/web${NC}"
echo ""
echo "7. Scroll to 'Build' section"
echo "8. Set Build Command:"
echo -e "${GREEN}pnpm install && pnpm --filter @agency/web build${NC}"
echo ""
echo "9. Set Start Command:"
echo -e "${GREEN}cd apps/web && pnpm start${NC}"
echo ""
echo "10. Click 'Deploy' button"
echo ""
wait_for_user

# Configure Worker Service
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 4: Configure Worker Service${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Click the '${YELLOW}worker${NC}' service"
echo "2. Click 'Settings' in the sidebar"
echo "3. Scroll to 'Service Source' section"
echo "4. Click 'Connect Repo' or 'Change Source'"
echo "5. Select: ${GREEN}bendervintimilla/neuroforge-complete${NC}"
echo "6. Set Root Directory to: ${GREEN}apps/worker${NC}"
echo ""
echo "7. Scroll to 'Build' section"
echo "8. Set Build Command:"
echo -e "${GREEN}pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/worker build${NC}"
echo ""
echo "9. Set Start Command:"
echo -e "${GREEN}cd apps/worker && node dist/index.js${NC}"
echo ""
echo "10. Click 'Deploy' button"
echo ""
wait_for_user

# Wait for deployments
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 5: Monitoring Deployments${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Deployments will take 3-5 minutes. Let's monitor them..."
echo ""
echo "Checking deployment status..."
railway status
echo ""
echo "Wait for all services to show 'SUCCESS' status"
echo ""
wait_for_user

# Get service URLs
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 6: Getting Service URLs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Finding deployed service URLs..."
echo ""

# Try to get domains via Railway CLI
API_DOMAIN=$(railway domain --service api 2>/dev/null || echo "")
WEB_DOMAIN=$(railway domain --service web 2>/dev/null || echo "")

if [ -n "$API_DOMAIN" ] && [ -n "$WEB_DOMAIN" ]; then
    echo -e "${GREEN}✅ Found service URLs:${NC}"
    echo "  API:  https://$API_DOMAIN"
    echo "  Web:  https://$WEB_DOMAIN"
    echo ""

    # Update environment variables
    echo -e "${YELLOW}Updating environment variables with production URLs...${NC}"
    railway variables set API_URL="https://$API_DOMAIN"
    railway variables set FRONTEND_URL="https://$WEB_DOMAIN"
    railway variables set AGENT_COPY_URL="https://$API_DOMAIN"
    railway variables set AGENT_GENERATION_URL="https://$API_DOMAIN"
    railway variables set AGENT_PUBLISH_URL="https://$API_DOMAIN"
    railway variables set NEXT_PUBLIC_API_URL="https://$API_DOMAIN" --service web
    railway variables set NEXT_PUBLIC_WEB_URL="https://$WEB_DOMAIN" --service web

    echo -e "${GREEN}✅ Environment variables updated!${NC}"
else
    echo -e "${YELLOW}Please manually note the service URLs from the Railway dashboard:${NC}"
    echo "1. Go to the 'api' service and copy its URL"
    echo "2. Go to the 'web' service and copy its URL"
    echo ""
    echo "Then run these commands:"
    echo ""
    echo -e "${GREEN}railway variables set API_URL=\"https://your-api-url\"${NC}"
    echo -e "${GREEN}railway variables set FRONTEND_URL=\"https://your-web-url\"${NC}"
    echo -e "${GREEN}railway variables set NEXT_PUBLIC_API_URL=\"https://your-api-url\" --service web${NC}"
    echo -e "${GREEN}railway variables set NEXT_PUBLIC_WEB_URL=\"https://your-web-url\" --service web${NC}"
fi

echo ""
wait_for_user

# Run database migrations
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Step 7: Running Database Migrations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Running Prisma migrations on Railway database..."
railway run --service api pnpm --filter @agency/db prisma migrate deploy
echo ""
echo -e "${GREEN}✅ Database migrations complete!${NC}"
echo ""

# Final summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    🎉 DEPLOYMENT COMPLETE! 🎉                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Your NeuroForge Marketing Agency Platform is LIVE!${NC}"
echo ""
echo "Service URLs:"
if [ -n "$API_DOMAIN" ]; then
    echo -e "  ${GREEN}API:${NC}  https://$API_DOMAIN"
    echo -e "  ${GREEN}Web:${NC}  https://$WEB_DOMAIN"
    echo ""
    echo "Test your API:"
    echo -e "  ${BLUE}curl https://$API_DOMAIN/health${NC}"
    echo ""
    echo "Open your app:"
    echo -e "  ${BLUE}open https://$WEB_DOMAIN${NC}"
else
    echo "  Check Railway dashboard for your service URLs"
fi
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Add your API keys (GEMINI_API_KEY, AWS credentials)"
echo "  2. Configure OAuth apps with production URLs"
echo "  3. Monitor logs: railway logs --service api"
echo ""
echo -e "${GREEN}Deployment guide:${NC} ./RAILWAY_STATUS.md"
echo -e "${GREEN}Quick reference:${NC} ./QUICK_RAILWAY_SETUP.md"
echo ""
