# ⚡ 5-Minute Railway Setup Guide

## What's Already Done ✅
- ✅ Project created: `neuroforge-complete`
- ✅ PostgreSQL database added
- ✅ Environment variables set (JWT_SECRET, TOKEN_ENCRYPTION_KEY, etc.)
- ✅ Code pushed to GitHub

## What You Need to Do (5 minutes)

### Open Your Project
👉 **https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6**

---

### Step 1: Add Redis (1 minute)
1. Click the purple **"+ New"** button (top right)
2. Select **"Database"**
3. Click **"Add Redis"**
4. Done! Railway auto-sets `REDIS_URL`

---

### Step 2: Deploy from GitHub (3 minutes)

Do this **3 times** for: API, Web, and Worker

#### Click "+ New" → "GitHub Repo"
- Select: **bendervintimilla/neuroforge-complete**
- Railway will start building

#### For Each Service, Set These:

**For API Service:**
1. After it creates, click the service
2. Go to "Settings" tab
3. Set "Service Name": `api`
4. Go to "Build" section:
   - **Build Command**: `pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/api build`
   - **Start Command**: `cd apps/api && node dist/index.js`
5. Save and redeploy

**For Web Service:**
1. Click the service
2. Settings → Service Name: `web`
3. Build section:
   - **Build Command**: `pnpm install && pnpm --filter @agency/web build`
   - **Start Command**: `cd apps/web && pnpm start`
4. Go to "Variables" tab, add:
   - `NEXT_PUBLIC_API_URL` = (wait for API URL, then add it)
   - `NEXT_PUBLIC_WEB_URL` = (wait for Web URL, then add it)
5. Save and redeploy

**For Worker Service:**
1. Click the service
2. Settings → Service Name: `worker`
3. Build section:
   - **Build Command**: `pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/worker build`
   - **Start Command**: `cd apps/worker && node dist/index.js`
4. Save and redeploy

---

### Step 3: Add Your API Keys (1 minute)

Click on **any service** → **"Variables"** tab → **"New Variable"**

**Required** (Add these or platform won't work):
```
GEMINI_API_KEY = your_actual_gemini_key
AWS_ACCESS_KEY_ID = your_aws_key
AWS_SECRET_ACCESS_KEY = your_aws_secret
AWS_S3_ENDPOINT = https://s3.amazonaws.com
```

**Optional** (for specific features):
```
GOOGLE_CLIENT_ID = your_google_id
GOOGLE_CLIENT_SECRET = your_google_secret
META_APP_ID = your_meta_id
META_APP_SECRET = your_meta_secret
STRIPE_SECRET_KEY = your_stripe_key
```

---

### Step 4: Update URLs (30 seconds)

After services deploy, Railway gives each a URL like `xxx-production-xxxx.up.railway.app`

1. Copy the API service URL
2. Go to Web service → Variables
3. Update `NEXT_PUBLIC_API_URL` with the API URL
4. Update `NEXT_PUBLIC_WEB_URL` with the Web URL

---

## ✅ Done!

Your platform is live at the Web service URL!

### Check Health:
- API: `https://your-api-url/health`
- Web: `https://your-web-url`

### View Logs:
```bash
railway logs --service api
railway logs --service web
railway logs --service worker
```

---

## 🆘 If Something Fails

**Build fails?**
- Check build logs in Railway dashboard
- Ensure pnpm is being used
- Verify all package.json files exist

**Can't connect to database?**
- Make sure PostgreSQL and Redis are both added
- DATABASE_URL and REDIS_URL should be auto-set

**Need help?**
- Check full guide: `RAILWAY_DEPLOYMENT.md`
- View status: `RAILWAY_STATUS.md`
