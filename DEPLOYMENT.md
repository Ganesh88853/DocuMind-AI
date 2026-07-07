# DocuMind AI — Production Deployment Guide

> **Free-tier stack:** Vercel (frontend) · Render (backend) · Supabase (database + storage)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Database (Supabase)](#step-1--database-supabase)
4. [Step 2 — Storage (Supabase)](#step-2--storage-supabase)
5. [Step 3 — Backend (Render)](#step-3--backend-render)
6. [Step 4 — Frontend (Vercel)](#step-4--frontend-vercel)
7. [Step 5 — GitHub Secrets & Variables](#step-5--github-secrets--variables)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Deployment Scripts](#deployment-scripts)
10. [Rollback Procedure](#rollback-procedure)
11. [Health Verification](#health-verification)
12. [Backup Strategy](#backup-strategy)
13. [Production Checklist](#production-checklist)
14. [Logging](#logging)
15. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
User Browser
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                    │
│  React SPA · Global CDN · Auto HTTPS · Immutable cache │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Render (Backend)                       │
│  FastAPI · Uvicorn · 2 workers · Auto HTTPS            │
│  Auto-runs: alembic upgrade head on each deploy        │
└────┬───────────────────┬────────────────────────────────┘
     │                   │
     ▼                   ▼
┌─────────────┐   ┌──────────────────────────────────────┐
│  Supabase   │   │         Supabase Storage             │
│  PostgreSQL │   │  Private bucket · Signed URLs       │
│  SSL + Pool │   │  50MB file limit                    │
└─────────────┘   └──────────────────────────────────────┘
```

### Why These Services?

| Service | Why | Free Tier Limits |
|---|---|---|
| **Vercel** | Global CDN, zero-config Vite support, preview URLs per PR | 100GB bandwidth/month |
| **Render** | Git-connected Python deploys, auto HTTPS, zero-config | 750 hrs/month, sleeps after 15min idle |
| **Supabase** | Managed PostgreSQL, built-in storage, no credit card | 500MB DB, 1GB storage, 2GB bandwidth |

> **Note on Render free tier:** The service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to respond. Upgrade to "Starter" ($7/mo) for always-on.

---

## Prerequisites

- GitHub account with the repository pushed
- Supabase account: https://supabase.com
- Render account: https://render.com
- Vercel account: https://vercel.com

---

## Step 1 — Database (Supabase)

### 1.1 Create a Supabase Project

1. Go to https://supabase.com → **New Project**
2. Set a strong database password (save it!)
3. Choose a region close to your users
4. Wait for the project to provision (~2 minutes)

### 1.2 Get the Connection String

1. Go to **Project Settings → Database → Connection string**
2. Select **Transaction pooler** (required for serverless / short-lived connections)
3. Copy the URI — it looks like:
   ```
   postgresql://postgres.YOURPROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```
4. **Change the scheme** to `postgresql+asyncpg://` for SQLAlchemy:
   ```
   postgresql+asyncpg://postgres.YOURPROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```

> The transaction pooler uses port **6543**. The direct connection (for migrations only) uses **5432**. Use the pooler URL as your `DATABASE_URL`.

### 1.3 SSL Configuration

Supabase enforces SSL. SQLAlchemy's asyncpg driver uses SSL by default when connecting to a remote host — no extra configuration needed.

To verify:
```python
# The connection string alone is sufficient:
DATABASE_URL = "postgresql+asyncpg://postgres.xxx:password@...pooler.supabase.com:6543/postgres"
```

### 1.4 Alembic Migrations (automatic on deploy)

Migrations run automatically on every Render deploy via the start command:
```bash
alembic upgrade head && uvicorn main:app ...
```

To run migrations manually against production:
```bash
export DATABASE_URL="postgresql+asyncpg://..."
./scripts/migrate-prod.sh upgrade head
```

---

## Step 2 — Storage (Supabase)

### 2.1 Create the Storage Bucket

1. Go to **Supabase Dashboard → Storage → New Bucket**
2. Name: `documind-uploads`
3. **Public: OFF** (private — access via signed URLs only)
4. File size limit: `52428800` (50MB)
5. Click **Create Bucket**

### 2.2 Get Service Role Key

1. Go to **Project Settings → API**
2. Copy the **service_role** key (NOT the anon key)
3. This key bypasses Row Level Security — keep it secret, only use server-side

### 2.3 Switching Storage Backends

The storage abstraction makes switching trivial:

**Current (development):**
```env
STORAGE_BACKEND=local
```
Files are stored in `backend/uploads/`. Lost on Render redeploy.

**Production:**
```env
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=documind-uploads
```

No service code changes needed — `get_storage_provider()` reads the env var and returns the right provider.

---

## Step 3 — Backend (Render)

### 3.1 Connect GitHub Repository

1. Go to https://dashboard.render.com → **New → Web Service**
2. Connect your GitHub repository
3. Select the repository and click **Connect**

### 3.2 Configure the Service

| Setting | Value |
|---|---|
| **Name** | `documind-backend` |
| **Runtime** | Python |
| **Region** | Oregon (or nearest to users) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2` |

### 3.3 Set Environment Variables

In **Render Dashboard → Environment**, add:

| Variable | Value |
|---|---|
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `DATABASE_URL` | Supabase pooler URL (from Step 1.2) |
| `JWT_SECRET_KEY` | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |
| `GEMINI_API_KEY` | Your Gemini API key |
| `STORAGE_BACKEND` | `supabase` |
| `SUPABASE_URL` | `https://YOURPROJECT.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_STORAGE_BUCKET` | `documind-uploads` |
| `LOG_LEVEL` | `INFO` |
| `BCRYPT_ROUNDS` | `12` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |

### 3.4 Health Check

Render automatically monitors the `/health` endpoint. Configure:
- **Health Check Path:** `/health`
- **Grace Period:** 60 seconds

### 3.5 Deploy Hook (for CI)

1. Go to **Settings → Deploy Hook**
2. Copy the URL
3. Add as GitHub secret: `RENDER_DEPLOY_HOOK_URL`

This enables the `deploy.yml` workflow to trigger deploys.

### 3.6 Verify Backend is Running

```bash
curl https://documind-backend.onrender.com/health
# Expected: {"status": "ok", ...}

curl https://documind-backend.onrender.com/
# Expected: {"name": "DocuMind AI", "version": "1.0.0", ...}
```

---

## Step 4 — Frontend (Vercel)

### 4.1 Import Project

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel auto-detects Vite

### 4.2 Configure Build Settings

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci --frozen-lockfile` |

### 4.3 Set Environment Variables

In **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_BASE_URL` | `https://documind-backend.onrender.com` | Production |
| `VITE_APP_NAME` | `DocuMind AI` | All |
| `VITE_ENVIRONMENT` | `production` | Production |

> **Important:** Vercel rebuilds the frontend on env var changes. Variables starting with `VITE_` are baked into the JS bundle at build time.

### 4.4 SPA Routing

`frontend/vercel.json` configures the catch-all rewrite:
```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```
This ensures `/dashboard`, `/documents/123`, etc. all serve `index.html` and let React Router handle routing.

### 4.5 Custom Domain (Optional)

1. Go to **Project Settings → Domains → Add**
2. Follow Vercel's DNS configuration guide
3. SSL is automatic (Let's Encrypt)
4. Update `CORS_ORIGINS` on Render with the custom domain

---

## Step 5 — GitHub Secrets & Variables

### Repository Secrets (encrypted)

Set in **GitHub → Repository → Settings → Secrets and variables → Actions → Secrets**:

| Secret | Description |
|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL (from Step 3.5) |

### Repository Variables (non-secret)

Set in **Settings → Secrets and variables → Actions → Variables**:

| Variable | Example |
|---|---|
| `BACKEND_URL` | `https://documind-backend.onrender.com` |
| `FRONTEND_URL` | `https://documind-ai.vercel.app` |

---

## Environment Variables Reference

### Backend Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ENVIRONMENT` | ✅ | `development` | Must be `production` on Render |
| `DEBUG` | ✅ | `true` | Must be `false` in production |
| `DATABASE_URL` | ✅ | — | Supabase asyncpg pooler URL |
| `JWT_SECRET_KEY` | ✅ | — | Min 32 chars random hex |
| `CORS_ORIGINS` | ✅ | — | Comma-separated allowed origins |
| `GEMINI_API_KEY` | ✅ | — | Google AI Studio API key |
| `STORAGE_BACKEND` | ✅ | `local` | `local` or `supabase` |
| `SUPABASE_URL` | ⚠️ supabase | — | Project URL |
| `SUPABASE_SERVICE_KEY` | ⚠️ supabase | — | Service role key |
| `SUPABASE_STORAGE_BUCKET` | ⚠️ supabase | `documind-uploads` | Bucket name |
| `BCRYPT_ROUNDS` | ❌ | `12` | Password hashing cost |
| `LOG_LEVEL` | ❌ | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `SMTP_HOST` | ❌ | — | Empty = console email mock |
| `FRONTEND_URL` | ❌ | `http://localhost:5173` | Used in email links |

### Fail-Fast Validation

The application **refuses to start** in production if:
- `JWT_SECRET_KEY` looks like a dev placeholder or is < 32 chars
- `CORS_ORIGINS` contains `localhost`
- `GEMINI_API_KEY` starts with `fake`
- `DEBUG=true`
- `STORAGE_BACKEND=supabase` but Supabase vars are empty

This prevents silent misconfigurations from reaching production.

---

## Deployment Scripts

### `scripts/health-check.sh`

Verifies a deployment is functioning:

```bash
# Check localhost
./scripts/health-check.sh

# Check production
BACKEND_URL=https://documind-backend.onrender.com ./scripts/health-check.sh
```

Checks: `/health` endpoint, API root, auth endpoint reachability, CORS headers, security headers.

### `scripts/smoke-test.sh`

Runs a real end-to-end flow:

```bash
BACKEND_URL=https://documind-backend.onrender.com ./scripts/smoke-test.sh
```

Flow: Register → Get profile → Login → Logout → Verify token invalidated.

### `scripts/migrate-prod.sh`

Safe migration runner with downgrade confirmation:

```bash
# Apply all pending migrations
DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh

# Roll back one migration
DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh downgrade -1

# Show history
DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh history
```

### `scripts/rollback.sh`

Emergency rollback:

```bash
RENDER_API_KEY=... \
RENDER_SERVICE_ID=... \
DATABASE_URL=... \
BACKEND_URL=https://documind-backend.onrender.com \
./scripts/rollback.sh
```

Steps: DB downgrade (with confirmation) → Render previous deploy → Health verification.

---

## Rollback Procedure

### Automatic (via CI)

If any post-deploy check fails in `deploy.yml`, the **previous Render deploy remains active** (Render does not automatically replace a healthy deploy with a failing one).

### Manual Emergency Rollback

```bash
# 1. Immediate — revert to previous deploy via Render Dashboard
#    Render → Service → Events → [previous deploy] → Redeploy

# 2. Database rollback (if migration was applied)
DATABASE_URL="postgresql+asyncpg://..." ./scripts/rollback.sh

# 3. Verify health
BACKEND_URL=https://documind-backend.onrender.com ./scripts/health-check.sh
```

### Rollback Decision Tree

```
Deployment failed?
    │
    ├── App crashes on startup?
    │       → Render Dashboard → Events → Redeploy previous
    │
    ├── New bug introduced (no crash)?
    │       → Revert commit → push to main → new deploy triggers
    │
    ├── Database migration broke data?
    │       → ./scripts/rollback.sh (rolls back migration + deploy)
    │
    └── Wrong environment variable?
            → Render Dashboard → Environment → Fix value → Manual Deploy
```

---

## Health Verification

### After Every Deploy

The `deploy.yml` workflow automatically:
1. Waits for `/health` to return 200 (10-minute timeout)
2. Runs smoke tests (register/login/logout flow)
3. Reports results in GitHub Actions

### Manual Verification

```bash
# Quick check
curl https://documind-backend.onrender.com/health

# Full check (6 points)
BACKEND_URL=https://documind-backend.onrender.com ./scripts/health-check.sh

# End-to-end flow
BACKEND_URL=https://documind-backend.onrender.com ./scripts/smoke-test.sh
```

---

## Backup Strategy

### Database Backups (Supabase)

**Automatic (built-in):**
- Supabase free tier: **daily backups**, 7-day retention
- Supabase Pro ($25/mo): **Point-in-time recovery** (PITR), 30-day retention

**Manual on-demand backup:**
```bash
# From your local machine with psql installed
pg_dump \
  "postgresql://postgres.YOURPROJECT:PASSWORD@aws-0-REGION.supabase.com:5432/postgres" \
  --format=custom \
  --file="documind-backup-$(date +%Y%m%d-%H%M%S).dump"
```

**Restore from backup:**
```bash
pg_restore \
  --dbname="postgresql://..." \
  --clean \
  --if-exists \
  documind-backup-YYYYMMDD.dump
```

### Storage Backups (Supabase Storage)

Supabase Storage is backed by S3 — Supabase manages redundancy.

For an additional backup:
```bash
# Install supabase CLI
npx supabase storage cp \
  "ss://documind-uploads/" \
  "./local-backup/storage/"
```

### Disaster Recovery

| Scenario | RTO | RPO | Action |
|---|---|---|---|
| Render deploy failure | < 5 min | 0 | Redeploy previous commit |
| DB data corruption | < 30 min | < 24h | Restore from Supabase backup |
| Accidental data deletion | < 1h | < 24h | Restore from PITR (Pro) or daily backup |
| Full Supabase outage | < 2h | < 24h | Restore to new Supabase project from backup |
| Vercel outage | < 1h | 0 | Rebuild and deploy to Netlify or Cloudflare Pages |

---

## Production Checklist

Use this before going live:

### Security
- [ ] `DEBUG=false` in all production env vars
- [ ] `JWT_SECRET_KEY` is a 64-char random hex (not a placeholder)
- [ ] `CORS_ORIGINS` contains only production domains (no localhost)
- [ ] `GEMINI_API_KEY` is a real key (not `fake-*`)
- [ ] `STORAGE_BACKEND=supabase` (not `local` — ephemeral on Render)
- [ ] `SUPABASE_SERVICE_KEY` is the service role key, not the anon key
- [ ] HTTPS is enforced (Render and Vercel do this automatically)
- [ ] Supabase storage bucket is **private** (not public)
- [ ] No secrets in source code (Gitleaks CI check passes)

### Deployment
- [ ] Render service health check shows **healthy**
- [ ] Vercel deployment shows **ready**
- [ ] `/health` returns 200
- [ ] Login flow works end-to-end
- [ ] Document upload works
- [ ] AI chat responds

### CI/CD
- [ ] `RENDER_DEPLOY_HOOK_URL` GitHub secret is set
- [ ] `BACKEND_URL` GitHub variable is set
- [ ] `deploy.yml` workflow runs and passes on push to main

### Database
- [ ] Alembic migrations applied (`alembic current` shows `head`)
- [ ] Required tables exist (users, user_sessions, audit_logs, documents, etc.)
- [ ] Supabase daily backups are enabled

### Monitoring
- [ ] Render email alerts configured (Dashboard → Settings → Notifications)
- [ ] Supabase usage alerts set (Dashboard → Settings → Billing)

---

## Logging

### Log Levels

| Environment | `LOG_LEVEL` | SQLAlchemy echo |
|---|---|---|
| Development | `DEBUG` | `true` (shows all SQL) |
| Testing | `WARNING` | `false` |
| Production | `INFO` | `false` |

### Structured JSON Logging

Set `LOG_LEVEL=INFO` in production. The backend uses Python's standard `logging` module with a structured formatter. Render captures stdout/stderr and makes logs searchable in the Dashboard.

### Accessing Production Logs

**Render:**
```bash
# Via Render Dashboard → Service → Logs
# Or via Render CLI:
render logs --service=documind-backend --tail
```

**Recommended log retention:** 30 days minimum. Render free tier provides 7 days of log history. For longer retention, ship logs to Papertrail, Datadog, or Logtail.

### Log Query Examples (Render Dashboard)

```
# Filter for errors
level=ERROR

# Filter for specific user
user_id="d7e184f4-..."

# Filter for slow requests
duration>1000
```

---

## Troubleshooting

### Backend doesn't start on Render

**Symptom:** Deploy shows "failed" or service crashes.
**Check:**
1. Render Dashboard → Events → View logs
2. Common cause: missing required env var → app exits with `sys.exit(1)`
3. Fix: Add the missing env var → Manual Deploy

### `alembic upgrade head` fails on deploy

**Symptom:** Deploy log shows `alembic` error.
**Check:**
1. `DATABASE_URL` is correct (asyncpg format, port 6543 for pooler)
2. Database exists in Supabase
3. Run locally: `DATABASE_URL="..." ./scripts/migrate-prod.sh history`

### CORS errors in browser

**Symptom:** Browser console shows `No 'Access-Control-Allow-Origin' header`.
**Fix:**
1. On Render, set `CORS_ORIGINS=https://your-app.vercel.app`
2. No trailing slash in the origin
3. Exact match required — `https://your-app.vercel.app` ≠ `http://your-app.vercel.app`

### Render free tier sleeps — first request is slow

**Symptom:** First request after idle period takes 30 seconds.
**Options:**
1. Upgrade to Render Starter ($7/mo) for always-on
2. Use UptimeRobot (free) to ping `/health` every 10 minutes

### File uploads lost after Render deploy

**Symptom:** Previously uploaded files return 404.
**Cause:** Render free tier has ephemeral disk — files are deleted on each deploy.
**Fix:** Set `STORAGE_BACKEND=supabase` (see Step 2).

### Supabase connection limit exceeded

**Symptom:** `too many connections` error in logs.
**Fix:** Use the Transaction Pooler URL (port 6543), not the Direct Connection (port 5432).
The pooler manages connection pooling for you.
