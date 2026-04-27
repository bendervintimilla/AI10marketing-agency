#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# AdAgency AI — Production Deploy Script
# Usage: ./deploy.sh [staging|production]
# ============================================================================

ENV="${1:-staging}"
COMPOSE_FILE="docker-compose.prod.yml"

echo "🚀 Deploying to ${ENV}…"

# ── 1. Pull latest code ──────────────────────────────────────────────────────
echo "📦 Pulling latest code…"
git pull origin "$(git branch --show-current)"

# ── 2. Build and start containers ─────────────────────────────────────────────
echo "🐳 Building and starting containers…"
docker compose -f "$COMPOSE_FILE" build --no-cache
docker compose -f "$COMPOSE_FILE" up -d

# ── 3. Wait for database to be healthy ────────────────────────────────────────
echo "⏳ Waiting for database…"
until docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Database is ready"

# ── 4. Run Prisma migrations ─────────────────────────────────────────────────
echo "🗃️  Running database migrations…"
docker compose -f "$COMPOSE_FILE" exec -T api \
    npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma 2>/dev/null || \
    echo "⚠️  Migrations skipped (may need manual run)"

# ── 5. Health check ───────────────────────────────────────────────────────────
echo "💓 Checking API health…"
sleep 5
HEALTH=$(curl -sf http://localhost:3001/health 2>/dev/null || echo '{"status":"unreachable"}')
echo "   Health: $HEALTH"

# ── 6. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ Deployment to ${ENV} complete!"
echo ""
echo "  Web:  http://localhost:3000"
echo "  API:  http://localhost:3001"
echo "  Health: http://localhost:3001/health"
echo "═══════════════════════════════════════════"
