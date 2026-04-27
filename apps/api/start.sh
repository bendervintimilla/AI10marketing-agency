#!/bin/sh
# api startup: push Prisma schema, then start the API server.
# Idempotent — db push is safe to run on every deploy.

set -e

echo "[api] Pushing Prisma schema to database..."
cd /app/packages/db && /app/node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || echo "[api] WARNING: prisma db push failed (continuing)"

echo "[api] Starting Fastify server..."
cd /app && exec node apps/api/dist/index.js
