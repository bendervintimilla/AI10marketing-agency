# AI10 Marketing Agency

AI-powered marketing audit and automation platform. Combines structural brand audits (Instagram, landing pages, Meta/Google/TikTok ads) with publishing, AI content generation, and multi-tenant SaaS management.

**Pilot tenant**: Sociedad Gourmet (19 restaurant brands, Ecuador).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ AI10 Marketing Agency Monorepo                                  │
│                                                                 │
│  apps/                                                          │
│  ├── web/         Next.js 14 dashboard (port 3000)             │
│  ├── api/         Fastify REST API (port 3001)                 │
│  ├── worker/      BullMQ background jobs (audits, publishing)   │
│  └── audits/      Python audit engine (32-check IG, 15-check    │
│                   landing — invoked via subprocess from worker) │
│                                                                 │
│  packages/                                                      │
│  ├── db/          Prisma + PostgreSQL (Brand, AuditRun,         │
│  │                AuditCheck, AuditReport, Campaign, Ad, ...)   │
│  ├── shared/      Shared TS types                               │
│  └── ui/          Shared React components                       │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start (Development)

```bash
# 1. Clone & install
git clone https://github.com/bendervintimilla/AI10marketing-agency.git
cd AI10marketing-agency
pnpm install

# 2. Boot infrastructure
docker compose up -d   # Postgres + Redis + MinIO

# 3. Setup environment
cp .env.example .env   # Fill in API keys (Meta, Gemini, Stripe)

# 4. Database
pnpm --filter @agency/db generate
pnpm --filter @agency/db prisma migrate dev --name init
pnpm --filter @agency/db prisma db seed   # 19 Sociedad Gourmet brands

# 5. Run all services
pnpm dev
```

Open http://localhost:3000 → log in with:
- **Email**: marketingsociedadgourmetec@gmail.com
- **Password**: Sociedad2026!

## Audits Pipeline

1. User clicks "Run Audit" on a brand
2. API creates `AuditRun` (status: QUEUED), enqueues BullMQ job
3. Worker picks up job, marks RUNNING
4. Worker spawns: `python3 apps/audits/src/audit_runner.py < spec.json`
5. Python fetches data via Meta Graph API, runs 32 checks, returns JSON
6. Worker persists `AuditCheck[]` rows + Markdown `AuditReport`
7. Worker marks `AuditRun.status = COMPLETED` with score 0–100 + grade A–F
8. UI polls `/audits/:id` every 4 seconds, displays results

## Audit Coverage

| Platform | Checks | Status |
|---|---|---|
| Instagram | 32 (content, audience, monetization, paid integration) | ✅ MVP |
| Landing pages | 15 (structure, conversion, tracking, schema) | ✅ MVP |
| Meta Ads | 50 (Pixel/CAPI, creative, structure, audience) | ⏳ Phase 2 |
| Google Ads | 80 (tracking, waste, structure, keywords, ads) | ⏳ Phase 2 |
| TikTok Ads | 28 (creative, technical, bidding) | ⏳ Phase 2 |
| YouTube Ads | 20 (formats, targeting, measurement) | ⏳ Phase 2 |

## Required Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection |
| `REDIS_URL` | ✅ | BullMQ + caching |
| `JWT_SECRET` | ✅ | Auth |
| `META_ACCESS_TOKEN` | ✅ | Instagram audits |
| `GEMINI_API_KEY` | ⚠️ | AI Brain features |
| `STRIPE_SECRET_KEY` | ⚠️ | Billing |

## Deploy to Railway

This monorepo is Railway-ready. 5 services:

1. **Postgres** (managed plugin)
2. **Redis** (managed plugin)
3. **api** — Dockerfile: `apps/api/Dockerfile`
4. **worker** — Dockerfile: `apps/worker/Dockerfile` (includes Python for audits)
5. **web** — Dockerfile: `apps/web/Dockerfile`

```bash
railway login
railway link <project-id>
railway up
```

See `RAILWAY_DEPLOYMENT.md` for the full setup script.

## Credits

Built on:
- [marketing-agency](https://github.com/gabrielevanadia-ai/marketing-agency) — SaaS skeleton (auth, billing, Brand model, AI Brain)
- [claude-ads](https://github.com/bendervintimilla/skills-AI-marketing-tool) — audit intelligence (162 weighted checks)
