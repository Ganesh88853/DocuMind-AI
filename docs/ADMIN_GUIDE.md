# DocuMind AI — Admin Guide

> Operations reference for system administrators and DevOps engineers.

---

## Table of Contents

1. [Admin Access](#admin-access)
2. [User Management](#user-management)
3. [System Monitoring](#system-monitoring)
4. [Database Operations](#database-operations)
5. [Storage Management](#storage-management)
6. [Security Operations](#security-operations)
7. [Log Management](#log-management)
8. [Backup & Recovery](#backup--recovery)
9. [Deployment Operations](#deployment-operations)
10. [Troubleshooting](#troubleshooting)

---

## Admin Access

### Granting Admin Role

Admin role must be set directly in the database. There is no UI for role assignment in v1.0.0.

```sql
-- Connect to database
-- Render: Supabase Dashboard → SQL Editor
-- Local: psql -U postgres documind_ai

-- Grant admin role
UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.com';

-- Verify
SELECT id, email, role, is_active FROM users WHERE role = 'admin';
```

### Admin API Endpoints

All admin endpoints are under `/api/v1/admin` and require:
- Valid JWT access token
- User role = `admin`

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/admin/users` | GET | List all users |
| `/api/v1/admin/users/{id}` | GET | Get specific user |
| `/api/v1/admin/users/{id}/deactivate` | POST | Deactivate user account |
| `/api/v1/admin/audit-logs` | GET | View audit log |
| `/api/v1/admin/stats` | GET | System statistics |

---

## User Management

### View All Users (API)

```bash
# Requires admin token
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://documind-backend.onrender.com/api/v1/admin/users?page=1&page_size=50"
```

### Deactivate a User Account

```sql
-- Database method (immediate)
UPDATE users SET is_active = false WHERE email = 'user@example.com';

-- This immediately invalidates all their active sessions
-- The user cannot log in until reactivated
```

### Reactivate a User Account

```sql
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

### Force Logout All Sessions for a User

```sql
-- Deactivate all refresh token sessions
UPDATE user_sessions 
SET is_active = false 
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
```

### Delete a User (GDPR/Data Request)

> **Warning:** This is irreversible. All user data will be deleted.

```sql
-- 1. Get the user ID
SELECT id FROM users WHERE email = 'user@example.com';

-- 2. Delete cascade (foreign keys handle related data)
-- Ensure ON DELETE CASCADE is set in migrations, then:
DELETE FROM users WHERE email = 'user@example.com';
```

---

## System Monitoring

### Health Check Endpoint

```bash
# Quick health check
curl https://documind-backend.onrender.com/health

# Expected response
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "ok",
  "timestamp": "2026-07-06T16:00:00Z"
}
```

### Prometheus Metrics

```bash
# Metrics endpoint (if enabled)
curl https://documind-backend.onrender.com/metrics
```

Key metrics to monitor:

| Metric | Alert Threshold |
|---|---|
| `http_request_duration_seconds_p95` | > 5s |
| `http_requests_total{status="5xx"}` | > 10/min |
| `http_requests_total{status="429"}` | > 50/min |
| Database connection pool saturation | > 80% |

### Recommended Monitoring Setup (Free)

1. **Uptime Robot** (free) — ping `/health` every 5 minutes, alert on failure
   - URL: https://uptimerobot.com
   - Alert: email notification on downtime

2. **Render Dashboard** — built-in metrics for CPU, memory, response times
   - Go to: Render Dashboard → Service → Metrics

3. **Supabase Dashboard** — database metrics (connections, query performance)
   - Go to: Supabase → Project → Reports

---

## Database Operations

### View Current Migration State

```bash
# From local with DATABASE_URL set
cd backend && alembic current

# Via Supabase SQL Editor
SELECT * FROM alembic_version;
```

### Apply Pending Migrations

```bash
# Production (use migration script)
DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh upgrade head

# Or via Render Dashboard → Manual Deploy (migrations run automatically on deploy)
```

### Rollback Migration

```bash
DATABASE_URL="postgresql+asyncpg://..." ./scripts/migrate-prod.sh downgrade -1
```

> See [DEPLOYMENT.md](../DEPLOYMENT.md) for full rollback procedures.

### Common Database Queries

```sql
-- User statistics
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_active) as active_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_this_week
FROM users;

-- Document statistics
SELECT
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE status = 'ready') as processed,
  COUNT(*) FILTER (WHERE status = 'error') as failed,
  ROUND(AVG(file_size_bytes) / 1024 / 1024, 2) as avg_size_mb,
  ROUND(SUM(file_size_bytes) / 1024 / 1024, 2) as total_size_mb
FROM documents;

-- Recent audit log entries
SELECT 
  u.email,
  al.action,
  al.ip_address,
  al.timestamp
FROM audit_logs al
JOIN users u ON u.id = al.user_id
ORDER BY al.timestamp DESC
LIMIT 50;

-- Active sessions per user
SELECT 
  u.email,
  COUNT(us.id) as active_sessions
FROM user_sessions us
JOIN users u ON u.id = us.user_id
WHERE us.is_active = true
GROUP BY u.email
ORDER BY active_sessions DESC;

-- Documents with errors
SELECT 
  u.email,
  d.original_filename,
  d.created_at
FROM documents d
JOIN users u ON u.id = d.user_id
WHERE d.status = 'error'
ORDER BY d.created_at DESC;
```

### Cleaning Up Stale Sessions

```sql
-- Deactivate expired sessions
UPDATE user_sessions 
SET is_active = false 
WHERE expires_at < NOW() AND is_active = true;

-- Delete very old inactive sessions (older than 30 days)
DELETE FROM user_sessions 
WHERE is_active = false AND last_activity < NOW() - INTERVAL '30 days';
```

---

## Storage Management

### Check Storage Usage (Supabase)

1. Go to Supabase Dashboard → Storage → `documind-uploads` bucket
2. View file count and total size
3. Free tier limit: 1GB

### Orphaned File Cleanup

If documents were deleted from the DB but files remain in storage:

```sql
-- Find storage paths that exist in DB
SELECT storage_path FROM documents WHERE storage_path IS NOT NULL;
```

Compare against files in the Supabase Storage bucket and delete any orphans.

### Switching Storage Backends

To switch from local to Supabase storage:

1. Set environment variables:
   ```
   STORAGE_BACKEND=supabase
   SUPABASE_URL=https://YOURPROJECT.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   SUPABASE_STORAGE_BUCKET=documind-uploads
   ```
2. Redeploy the backend
3. Existing documents with local `storage_path` values will fail to load (404)
4. Users must re-upload affected documents

> There is no automated migration tool for existing local files to Supabase Storage in v1.0.0.

---

## Security Operations

### Viewing Audit Logs

```bash
# Via API
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://documind-backend.onrender.com/api/v1/admin/audit-logs?page=1&page_size=100"
```

```sql
-- Suspicious login attempts (multiple failed IPs)
SELECT ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'LOGIN_FAILED'
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) > 5
ORDER BY attempts DESC;
```

### Investigating a Security Event

1. Get the `X-Request-ID` from the suspicious request (from logs or user report)
2. Search Render logs for that request ID
3. Check audit_logs for the associated user
4. Examine user_sessions for concurrent sessions from unexpected locations
5. If confirmed breach: deactivate user account + revoke all sessions

### Rate Limit Management

Rate limits are configured via environment variables:

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_GLOBAL` | 200 | Requests per minute per IP |
| `RATE_LIMIT_AUTH` | 10 | Auth attempts per minute per IP |
| `RATE_LIMIT_UPLOAD` | 20 | Uploads per minute per IP |
| `RATE_LIMIT_CHAT` | 30 | AI chat requests per minute per IP |

To temporarily tighten limits during an attack, update these in Render Environment and redeploy.

### Rotating JWT Secret

If `JWT_SECRET_KEY` is compromised:

1. Generate new key: `python -c "import secrets; print(secrets.token_hex(32))"`
2. Update `JWT_SECRET_KEY` in Render environment
3. Redeploy — all existing access tokens are immediately invalidated
4. All users must log in again (refresh tokens also invalidated)

---

## Log Management

### Accessing Logs

**Render Dashboard:**
- Go to Render → Service → Logs
- Logs are searchable and filterable
- Free tier: 7 days retention

**Via Render CLI:**
```bash
render logs --service=documind-backend --tail
render logs --service=documind-backend --since=1h
```

### Log Levels

| Level | When to use |
|---|---|
| `DEBUG` | Verbose development logging — never in production |
| `INFO` | Normal operational events (login, upload, search) |
| `WARNING` | Non-critical issues (missing optional config, degraded mode) |
| `ERROR` | Handled errors (auth failure, validation error) |
| `CRITICAL` | Unhandled exceptions, service unavailability |

### Recommended: External Log Aggregation

For production, ship logs to an external service:

**Papertrail (free up to 50MB/month):**
```bash
# Install log drain on Render
# Render Dashboard → Service → Settings → Log Stream → Add Endpoint
# Use: syslog+tls://logs.papertrailapp.com:PORT
```

**Datadog (free up to 5GB/day):**
```bash
# Use Render's native Datadog integration
# Render Dashboard → Service → Environment → DATADOG_API_KEY
```

---

## Backup & Recovery

### Database Backups (Supabase)

**Automatic:**
- Free tier: daily backups, 7-day retention
- Pro ($25/mo): point-in-time recovery, 30-day retention

**Manual Backup:**
```bash
# Requires psql installed locally
pg_dump \
  "postgresql://postgres.PROJECT:PASS@db.PROJECT.supabase.co:5432/postgres" \
  --format=custom \
  --file="backup-$(date +%Y%m%d).dump"
```

**Restore:**
```bash
pg_restore \
  --dbname="postgresql://postgres.PROJECT:PASS@db.PROJECT.supabase.co:5432/postgres" \
  --clean --if-exists \
  backup-20260706.dump
```

### Recovery Procedures

| Scenario | Steps |
|---|---|
| Bad deploy (app crash) | Render Dashboard → Events → Redeploy previous |
| Bad migration | `./scripts/rollback.sh` |
| Corrupted data | Restore from Supabase backup |
| Lost SECRET_KEY | Rotate key (all users re-login), investigate source |

---

## Deployment Operations

### Manual Deploy Trigger

```bash
# Via deploy hook (if set up)
curl -X POST "$RENDER_DEPLOY_HOOK_URL"

# Via GitHub Actions (manual trigger)
# GitHub → Actions → Deploy → Run workflow
```

### Deploy History

View all deploys in Render Dashboard → Service → Events

### Rolling Back to Previous Version

1. Render Dashboard → Service → Events
2. Find the last successful deploy
3. Click **Redeploy**

### Environment Variable Changes

1. Render Dashboard → Service → Environment
2. Update variable
3. Click **Save Changes** — this triggers an automatic redeploy

---

## Troubleshooting

### Service Not Starting

1. Check Render logs for the error
2. Most common causes:
   - Missing required env var → check `.env.production.example`
   - Database URL wrong → verify Supabase pooler URL format
   - Failed migration → check `alembic upgrade head` output in logs

### High Error Rate (5xx)

1. Check Render logs for stack traces
2. Check Supabase connection count (may be at limit)
3. Check if Gemini API is returning errors (check API quota)
4. Restart the service: Render → Service → Manual Deploy

### Slow Responses

1. Check Render metrics for CPU/memory spike
2. Check Supabase slow query log
3. Check if sentence-transformers model is loading on each request (it should be cached)
4. Consider upgrading to Render Starter for more resources

### Database Connection Errors

```
asyncpg.exceptions.TooManyConnectionsError
```
**Fix:** Ensure `DATABASE_URL` uses the Transaction Pooler (port 6543), not the direct connection (port 5432).
