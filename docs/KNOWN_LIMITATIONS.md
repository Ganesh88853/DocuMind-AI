# DocuMind AI — Known Limitations

> Version 1.0.0 — Documented known limitations, constraints, and accepted trade-offs.

---

## Summary

These are known limitations in the current release. Each item includes the root cause, current workaround (if any), and the planned resolution.

---

## Backend Limitations

### 1. Render Free Tier — Service Cold Starts

**Impact:** High  
**Description:** The Render free plan spins down the backend after 15 minutes of inactivity. The first request after a cold start takes 20–40 seconds.  
**Workaround:** Use UptimeRobot (free) to ping `/health` every 10 minutes, or upgrade to Render Starter ($7/mo).  
**Planned Fix:** Milestone 15 — upgrade to Render Starter or migrate to Railway.

---

### 2. File Upload Storage — Ephemeral on Render Free Tier

**Impact:** High (if `STORAGE_BACKEND=local`)  
**Description:** Render's free tier has no persistent disk. Files stored locally are deleted on every deploy.  
**Workaround:** Set `STORAGE_BACKEND=supabase` (documented in DEPLOYMENT.md).  
**Status:** Fully resolved when Supabase Storage is configured.

---

### 3. Vector Search — No Native pgvector

**Impact:** Medium  
**Description:** The current implementation stores embeddings as JSON arrays and computes cosine similarity in Python rather than using pgvector's native `<->` operator. This is slower at scale.  
**Workaround:** Acceptable for up to ~10,000 document chunks. Above that, latency increases.  
**Planned Fix:** Add pgvector extension migration; switch to native `<->` operator for O(log n) search.

---

### 4. OCR Quality — Image-Based PDFs

**Impact:** Medium  
**Description:** PDFs with scanned images (no text layer) are processed by Tesseract, which may produce lower-quality text extraction on poor-quality scans or non-Latin characters.  
**Workaround:** Encourage users to upload text-based PDFs where possible.  
**Planned Fix:** Add PDF image quality detection; allow users to retry OCR with higher DPI settings.

---

### 5. No Background Task Queue

**Impact:** Medium  
**Description:** OCR and embedding generation run synchronously within the request-response cycle. Large documents (50+ pages) may cause slow responses.  
**Workaround:** Max upload size is capped at 50MB; typical processing < 10s.  
**Planned Fix:** Integrate Celery + Redis for async background document processing.

---

### 6. Email — Console Mock in Development

**Impact:** Low  
**Description:** Email (password reset, verification) only works if `SMTP_HOST` is configured. Development environments use a console logger that prints emails to stdout.  
**Workaround:** Configure SendGrid or Resend in production environment variables.  
**Status:** Works correctly in production when SMTP variables are set.

---

### 7. Rate Limiting — In-Memory Counter

**Impact:** Low  
**Description:** The rate limiter uses in-process memory (via `slowapi`). Rate limit state is not shared across multiple Uvicorn workers or instances.  
**Workaround:** Single-instance deployment (2 workers share process memory).  
**Planned Fix:** Switch to Redis-backed rate limiting for horizontal scaling.

---

### 8. Refresh Token — No Absolute Expiry Enforcement in DB

**Impact:** Low  
**Description:** Session expiry is enforced via the JWT `exp` claim, but the `user_sessions` table `expires_at` is not checked on every refresh attempt (it's used for session cleanup only).  
**Workaround:** JWT expiry provides the hard security boundary.  
**Planned Fix:** Add explicit DB-side expiry check in the refresh endpoint.

---

## Frontend Limitations

### 9. No Offline Support

**Impact:** Medium  
**Description:** The application requires an active internet connection. There is no service worker or offline cache.  
**Workaround:** None — by design for a v1 SaaS application.  
**Planned Fix:** Milestone 16 — add service worker for read-only offline document access.

---

### 10. Bundle Size — sentence-transformers Not on Frontend

**Impact:** Low  
**Description:** Embeddings are generated server-side. The frontend has no local ML inference capability.  
**Status:** This is the correct architecture — no fix needed.

---

### 11. No Real-Time Updates (WebSocket)

**Impact:** Medium  
**Description:** Document processing status does not update in real time. Users must manually refresh to see processing completion.  
**Workaround:** TanStack Query polls every 5 seconds while a document is in `processing` status.  
**Planned Fix:** Add WebSocket notifications via FastAPI WebSocket support.

---

### 12. Dark Mode — Persisted to localStorage Only

**Impact:** Low  
**Description:** Dark mode preference is stored in the browser's localStorage. It does not sync across devices or browsers.  
**Workaround:** Users set their preference per browser.  
**Planned Fix:** Add `ui_preferences` field to user profile stored in the database.

---

## Infrastructure Limitations

### 13. Supabase Free Tier — Connection Limits

**Impact:** Medium  
**Description:** Supabase free tier allows 60 concurrent database connections. High traffic could exhaust this limit.  
**Workaround:** Use the Transaction Pooler (port 6543) which manages connection pooling.  
**Planned Fix:** Upgrade to Supabase Pro ($25/mo) for 200+ connections and PITR backups.

---

### 14. No Horizontal Scaling

**Impact:** Low (v1)  
**Description:** The backend is designed for single-instance deployment. Rate limiting is in-memory, and local file storage cannot be shared across instances.  
**Workaround:** Supabase Storage (shared), Redis rate limiting (planned).  
**Planned Fix:** Migrate to Kubernetes or Fly.io for multi-instance support.

---

### 15. No CDN for API Responses

**Impact:** Low  
**Description:** API responses are not cached at the CDN layer. Every API request hits the backend.  
**Workaround:** TanStack Query client-side cache reduces redundant requests.  
**Planned Fix:** Add `Cache-Control` headers to read-only list endpoints; configure Cloudflare as CDN.

---

## Security Limitations

### 16. MyPy — Advisory Mode Only

**Impact:** Low  
**Description:** The MyPy type checker is configured with `continue-on-error: true` in the quality workflow. Type errors are reported but do not fail the build.  
**Workaround:** Developers should review MyPy output in CI logs.  
**Planned Fix:** Enable strict MyPy enforcement after adding full type annotations.

---

### 17. No Multi-Factor Authentication (MFA)

**Impact:** Medium  
**Description:** Authentication is username + password only. No TOTP or WebAuthn support.  
**Planned Fix:** Milestone 17 — add TOTP (Google Authenticator compatible) via `pyotp`.

---

### 18. Content Security Policy (CSP) — Not Enforced

**Impact:** Medium  
**Description:** CSP headers are not set (they are documented as a recommendation in SECURITY.md). A comprehensive CSP requires careful configuration with the React SPA's inline scripts.  
**Planned Fix:** Add CSP header to nginx and Vercel configurations post-audit.

---

## Known Bugs

### 19. Audit Log — user_id Type Migration (Fixed in v1.0.0)

**Description:** In Milestone 11, `AuditLog.id` and `user_id` were changed from `UUID` to `String(36)` for SQLite test compatibility, causing a `DatatypeMismatchError` in production. Fixed in the bug fix included in this release.  
**Status:** ✅ Resolved — restored to `PG_UUID(as_uuid=True)`.

---

## Performance Benchmarks (Approximate)

| Operation | P50 | P95 | Notes |
|---|---|---|---|
| Login | 650ms | 1.2s | bcrypt 12 rounds |
| Document list | 45ms | 120ms | Indexed queries |
| File upload (1MB PDF) | 800ms | 2s | OCR + embedding |
| Semantic search | 200ms | 500ms | Python cosine similarity |
| AI chat response | 2s | 6s | Gemini API latency |
| Health check | 5ms | 20ms | DB ping included |

---

## Not Implemented (Out of Scope for v1.0.0)

The following were explicitly excluded from v1.0.0:

- [ ] Multi-language OCR (non-Latin scripts)  
- [ ] Collaborative document editing  
- [ ] Real-time cursor/presence indicators  
- [ ] Mobile native apps (iOS/Android)  
- [ ] SSO / OAuth (Google, GitHub login)  
- [ ] Billing / subscription management  
- [ ] Team workspaces / multi-tenancy  
- [ ] Document version history  
- [ ] Audit log export (CSV/JSON)  
- [ ] Admin dashboard UI  
- [ ] Webhook notifications  
- [ ] API rate limit per user (current: per IP)  

See [ROADMAP.md](ROADMAP.md) for the planned implementation timeline.
