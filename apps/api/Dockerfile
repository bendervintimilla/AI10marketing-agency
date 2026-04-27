# ── Stage 1: Install ALL dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY --from=deps /app/ ./

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma client & build TypeScript
RUN pnpm --filter @agency/db generate
RUN pnpm --filter @agency/db build
RUN pnpm --filter @agency/shared build
RUN pnpm --filter @agency/api build


# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production

# Copy everything needed for runtime
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
COPY --from=build /app/packages/db/src/generated ./packages/db/dist/generated
COPY --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --from=build /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Link workspace packages so require('@agency/db') resolves
RUN mkdir -p node_modules/@agency && \
    ln -s /app/packages/db node_modules/@agency/db && \
    ln -s /app/packages/shared node_modules/@agency/shared

# Copy startup script (runs prisma db push before starting server)
COPY apps/api/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create non-root user
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
USER appuser

EXPOSE 3001

ENTRYPOINT ["tini", "--"]
CMD ["/bin/sh", "/app/start.sh"]
