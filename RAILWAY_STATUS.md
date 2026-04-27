# Railway Deployment Status

## ✅ Completed Setup

### Project Created
- **Name**: neuroforge-complete
- **URL**: https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6
- **Owner**: juanchovintimilla91@gmail.com

### Infrastructure
- ✅ **PostgreSQL** - Added and configured
  - DATABASE_URL: `postgresql://postgres:***@postgres.railway.internal:5432/railway`
  - Public URL: Available via Railway proxy

### Environment Variables Set
- ✅ JWT_SECRET (128-char secure token)
- ✅ TOKEN_ENCRYPTION_KEY (64-char encryption key)
- ✅ WORKER_SECRET (64-char worker authentication key)
- ✅ DATABASE_URL (auto-configured by PostgreSQL service)

---

## 🔄 Next Steps (Do These in Railway Dashboard)

### 1. Add Redis Database
**Why**: Required for BullMQ job queue and caching

Go to: https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6

1. Click **"New"** button
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway will automatically set `REDIS_URL` environment variable

---

### 2. Connect GitHub Repository

Before creating services, connect your GitHub repo:

1. Go to Railway Settings
2. Connect **bendervintimilla/neuroforge-complete** repository
3. Enable automatic deployments (optional)

---

### 3. Create API Service

**Configuration**:
```yaml
Name: api
Repository: bendervintimilla/neuroforge-complete
Branch: main
Root Directory: (leave empty)
Build Command: pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/api build
Start Command: cd apps/api && node dist/index.js
Port: 3001
```

**Steps**:
1. Click **"New"** → **"GitHub Repo"**
2. Select **bendervintimilla/neuroforge-complete**
3. Railway will auto-detect it's a Node.js project
4. Click **"Settings"** → **"Build"**
5. Set **Build Command** and **Start Command** as above
6. Add port 3001 in settings if needed

---

### 4. Create Web Service (Next.js Frontend)

**Configuration**:
```yaml
Name: web
Repository: bendervintimilla/neuroforge-complete
Branch: main
Root Directory: (leave empty)
Build Command: pnpm install && pnpm --filter @agency/web build
Start Command: cd apps/web && pnpm start
Port: 3000
```

**Additional Environment Variables for Web**:
After API is deployed, add these to the Web service:
- `NEXT_PUBLIC_API_URL` = your-api-url (e.g., `https://api-production-xyz.up.railway.app`)
- `NEXT_PUBLIC_WEB_URL` = your-web-url (e.g., `https://web-production-xyz.up.railway.app`)

---

### 5. Create Worker Service (Background Jobs)

**Configuration**:
```yaml
Name: worker
Repository: bendervintimilla/neuroforge-complete
Branch: main
Root Directory: (leave empty)
Build Command: pnpm install && pnpm --filter @agency/db generate && pnpm --filter @agency/worker build
Start Command: cd apps/worker && node dist/index.js
```

**Note**: Worker doesn't need a public port - it runs background jobs.

---

### 6. Add Your API Keys

These are **required** for the platform to function:

**Critical (Platform won't work without these)**:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_S3_ENDPOINT=https://s3.amazonaws.com
AWS_S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

**Optional (for specific features)**:
```bash
# OAuth Login
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Social Media Publishing
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Payments (if using billing features)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_PRO=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx
```

Set these in Railway:
1. Go to your project
2. Click on the service (API, Web, or Worker)
3. Go to **"Variables"** tab
4. Click **"New Variable"**
5. Add key and value

---

### 7. Update Callback URLs

After services are deployed, update these with your actual Railway URLs:

```bash
# OAuth Callbacks (use your API service URL)
GOOGLE_REDIRECT_URI=https://your-api-url/auth/google/callback
META_LOGIN_REDIRECT_URI=https://your-api-url/auth/meta/callback
META_REDIRECT_URI=https://your-api-url/publish/callback/instagram
TIKTOK_REDIRECT_URI=https://your-api-url/publish/callback/tiktok

# Frontend URL
FRONTEND_URL=https://your-web-url

# API URLs
API_URL=https://your-api-url
AGENT_COPY_URL=https://your-api-url
AGENT_GENERATION_URL=https://your-api-url
AGENT_PUBLISH_URL=https://your-api-url
```

---

### 8. Run Database Migrations

After API service is deployed and DATABASE_URL is set:

**Option A: Via Railway CLI**
```bash
railway run pnpm --filter @agency/db prisma migrate deploy
```

**Option B: Via Railway Shell**
```bash
railway shell
# Then inside the shell:
cd packages/db
npx prisma migrate deploy
```

---

## 📊 Monitoring

### View Logs
```bash
# API logs
railway logs --service api

# Web logs
railway logs --service web

# Worker logs
railway logs --service worker
```

### Check Status
```bash
railway status
```

### Access Services
- **API Health**: `https://your-api-url/health`
- **Web App**: `https://your-web-url`
- **Railway Dashboard**: https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6

---

## 🔒 Security Checklist

Before going live:
- [ ] All secrets are set in Railway (not in code)
- [ ] OAuth redirect URIs match production URLs
- [ ] S3 bucket has proper CORS configuration
- [ ] Database has connection limits configured
- [ ] API rate limiting is enabled
- [ ] Stripe webhook URLs are configured
- [ ] Environment is set to "production"

---

## 💡 Tips

1. **Use Railway's CLI for quick updates**:
   ```bash
   railway variables set KEY="value"
   ```

2. **Reference variables between services**:
   Railway allows you to reference variables from other services using:
   `${{ServiceName.VARIABLE_NAME}}`

3. **Enable automatic deployments**:
   Connect your GitHub repo and Railway will automatically deploy on push to main.

4. **Monitor costs**:
   Check Railway dashboard for usage and costs.

---

## 🆘 Troubleshooting

### Build Fails
- Check that pnpm is being used (not npm)
- Verify all dependencies are in package.json
- Check build logs in Railway dashboard

### Database Connection Errors
- Ensure DATABASE_URL is set
- Run migrations: `railway run pnpm --filter @agency/db prisma migrate deploy`
- Check PostgreSQL service is running

### Redis Connection Errors
- Ensure Redis service is added
- REDIS_URL should be auto-set by Railway
- Check Redis service is running

### Environment Variables Not Loading
- Make sure variables are set at the service level
- Restart the service after adding variables
- Check variable names match exactly (case-sensitive)

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Project README](/RAILWAY_DEPLOYMENT.md)
- [Railway Dashboard](https://railway.com/project/0decb717-6737-481d-abc8-1d80fb6746d6)
