# Railway Deploy — Final Steps (10 min)

Project URL: **https://railway.com/project/ab364264-a5f5-443c-b8fb-dfc2940881ad**

## Already done

- ✅ Project `AI10marketing-agency` created
- ✅ Postgres database added
- ✅ Redis database added
- ✅ Code pushed to https://github.com/bendervintimilla/AI10marketing-agency

## What's left (do this in the Railway dashboard)

### Step 1 — Authorize GitHub

1. Open the project URL above
2. Click **"+ New"** → **"GitHub Repo"**
3. If prompted: install the **Railway GitHub App** on your account, granting access to `AI10marketing-agency`
4. Select the repo `bendervintimilla/AI10marketing-agency`

### Step 2 — Add the 3 app services

Repeat 3 times — once per service. Each time pick the repo, then **immediately set these settings before first deploy**:

| Service | Root Directory | Dockerfile Path | Port |
|---|---|---|---|
| **api** | `/` (leave empty) | `apps/api/Dockerfile` | `3001` |
| **worker** | `/` | `apps/worker/Dockerfile` | (no port) |
| **web** | `/` | `apps/web/Dockerfile` | `3000` |

For each: **Settings → Source → Dockerfile Path** → paste the value above.

### Step 3 — Set environment variables

Click each service → **Variables** tab → bulk paste:

#### api service
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
META_ACCESS_TOKEN=<paste your long-lived Meta token>
GEMINI_API_KEY=<optional, for AI Brain features>
```

#### worker service
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
META_ACCESS_TOKEN=<same as api>
PYTHON_BIN=python3
NODE_ENV=production
```

#### web service
```
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
PORT=3000
NODE_ENV=production
```

### Step 4 — Generate public domain for web + api

For the **api** and **web** services:
- Settings → Networking → **Generate Domain**

Result: 2 public URLs (something like `api-production-xxx.up.railway.app` and `web-production-xxx.up.railway.app`).

### Step 5 — Run migrations + seed (one-time)

Once `api` is deployed:

```bash
railway link ab364264-a5f5-443c-b8fb-dfc2940881ad
railway run --service api pnpm --filter @agency/db prisma migrate deploy
railway run --service api pnpm --filter @agency/db prisma db seed
```

Or use Railway dashboard → api service → **Run command**:
```
pnpm --filter @agency/db prisma migrate deploy && pnpm --filter @agency/db prisma db seed
```

### Step 6 — Smoke test

1. Open the web public URL
2. Login: `marketingsociedadgourmetec@gmail.com` / `Sociedad2026!`
3. Go to **Brand Audits** in the sidebar
4. See all 19 Sociedad Gourmet brands listed
5. Click "Run audit" on **Negroni Rooftop GYE** (Instagram)
6. Watch the status flip from QUEUED → RUNNING → COMPLETED in ~30 seconds
7. Click "View →" to see the score breakdown

If the audit completes with a score, the entire pipeline is working end-to-end:

```
UI button → API → Postgres (AuditRun row) → Redis (BullMQ job) →
Worker → Python audit_runner → Meta Graph API → JSON →
Worker persists checks → UI polls and shows results
```

## Troubleshooting

**"META_ACCESS_TOKEN not set"** → the worker service is missing the env var. Add it.

**"python3: command not found"** in worker logs → the worker Dockerfile needs Python. Already added in `apps/worker/Dockerfile` line 34. Rebuild.

**"Prisma client not generated"** → Run on api first: `railway run --service api pnpm --filter @agency/db generate`

**"Cannot connect to Redis"** → Check that REDIS_URL is set as `${{Redis.REDIS_URL}}` (Railway template variable, not a literal URL).

**"Build failing on web"** → set `NEXT_PUBLIC_API_URL` BEFORE first build, since Next.js bakes it in at build time.

---

**Total time to complete steps 1–6: ~10 minutes.**

After step 6 passes, AI10 Marketing Agency is live in production with Sociedad Gourmet as its first tenant.
