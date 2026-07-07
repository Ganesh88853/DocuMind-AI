# Changelog

All notable changes to DocuMind AI are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [Conventional Commits](https://www.conventionalcommits.org/).

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

*No unreleased changes — v1.0.0 is the current production release.*

---

## [1.0.0] — 2026-07-07 — **Foundation Release** 🚀

### Added — Milestone 15: Portfolio Readiness & Production Release
- `docs/ARCHITECTURE.md` — 9 Mermaid architecture diagrams (system, frontend, backend, ER, auth flow, document pipeline, AI/RAG, search, deployment)
- `docs/API.md` — Complete REST API reference with all endpoints, schemas, error codes, pagination
- `docs/USER_GUIDE.md` — End-user documentation covering all features
- `docs/ADMIN_GUIDE.md` — Operations reference: user management, monitoring, DB ops, security, backups
- `docs/DEVELOPER_GUIDE.md` — Engineering guide with full 4-step feature addition pattern
- `docs/RELEASE_NOTES.md` — v1.0.0 release notes
- `docs/ROADMAP.md` — v1.1 through v2.0 roadmap with timeline
- `docs/KNOWN_LIMITATIONS.md` — 19 documented limitations with root cause, workaround, planned fix
- `docs/INTERVIEW_PREP.md` — 160 technical Q&As across 8 categories
- `docs/PORTFOLIO.md` — Resume bullet points, LinkedIn description, demo script, portfolio guide
- `.github/workflows/deploy.yml` — Production deploy workflow with pre-deploy test gate

### Changed
- `README.md` — Complete professional rewrite with badges, feature tables, architecture diagrams, documentation index
- `CHANGELOG.md` — v1.0.0 release entry

### Added — Milestone 14: Production Deployment & Infrastructure
- `backend/.env.development` — Local dev defaults with annotations
- `backend/.env.testing` — CI settings (bcrypt=4, fake keys, test DB URL)
- `backend/.env.production.example` — Production template with REQUIRED labels
- `backend/render.yaml` — Render Blueprint (build, start command, env vars, health check)
- `frontend/vercel.json` — SPA routing, OWASP headers, 1-year asset caching
- `frontend/.env.production.example` — Vercel environment template
- `backend/app/storage/supabase_storage.py` — SupabaseStorageProvider implementation
- `scripts/health-check.sh` — 6-point deployment health verification
- `scripts/smoke-test.sh` — End-to-end auth flow smoke test
- `scripts/migrate-prod.sh` — Safe production migration runner with downgrade confirmation
- `scripts/rollback.sh` — Emergency rollback (DB migration + Render revert)
- `DEPLOYMENT.md` — Complete production deployment guide

### Changed — Milestone 14
- `backend/app/core/config.py` — Added `STORAGE_BACKEND` + `SUPABASE_*` settings + fail-fast `@model_validator` for production
- `backend/app/storage/__init__.py` — Added `get_storage_provider()` factory function

---

## [0.13.0] — 2026-07-06 — Milestone 13: CI/CD Pipeline

### Added
- `backend.yml` — Backend CI: static checks, tests, migration integrity
- `frontend.yml` — Frontend CI: lint, type-check, vitest, production build
- `tests.yml` — Unified test suite gate for branch protection
- `quality.yml` — Code quality: Black, isort, Flake8, MyPy, ESLint, Prettier
- `security.yml` — Security: Gitleaks, pip-audit, Bandit, npm audit, Trivy
- `docker.yml` — Docker: image builds, non-root validation, stack integration test
- `.github/dependabot.yml` — Automated weekly dependency PRs
- `commitlint.config.js` — Conventional Commits enforcement

---

## [0.12.0] — 2026-07-06 — Milestone 12: Docker & Development Environment

### Added
- Multi-stage `backend/Dockerfile` (builder → runtime, non-root appuser)
- Multi-stage `frontend/Dockerfile` (deps → build → nginx)
- `frontend/Dockerfile.dev` for Vite HMR development server
- `docker-compose.yml` — Full 5-service production stack
- `docker-compose.dev.yml` — Development overrides with hot reload
- `backend/docker-entrypoint.sh` — Wait-for-DB + auto-migrate + start
- `docker/nginx.conf` — Production nginx: proxy, gzip, security headers
- `docker/nginx.dev.conf` — Dev nginx: no-cache, WebSocket HMR proxy
- `docker/postgres/init.sql` — Auto-creates `documind_test` database
- `docker/redis/redis.conf` — LRU eviction, security hardening
- `scripts/` — 9 bash + 2 PowerShell developer helper scripts
- `DOCKER.md` — Architecture documentation and troubleshooting guide

### Fixed
- Root-level `.env` and `.env.example` for Docker Compose

---

## [0.11.0] — 2026-07-05 — Milestone 11: Automated Testing & Quality Assurance

### Added
- 149 backend tests across all services and routes
- 26 frontend tests with React Testing Library
- `tests/conftest.py` — Async test fixtures with PostgreSQL
- `tests/test_auth_api.py` — Full auth endpoint coverage
- `tests/test_security_api.py` — Security, RBAC, headers tests
- `tests/test_schemas.py` — Pydantic schema validation
- `tests/test_security_utils.py` — JWT and password hashing
- `tests/test_file_scanner.py` — File type validation
- Frontend test suite in `frontend/src/__tests__/`
- Coverage configuration in `pyproject.toml`

### Fixed
- `AuditLog.id` and `user_id` columns — restored to native `PG_UUID` type
  after Milestone 11 mistakenly changed them to `String(36)` for SQLite compat

---

## [0.10.0] — 2026-07-04 — Milestone 10: Reminders & Notifications

### Added
- Reminder system with scheduled notifications
- In-app notification delivery
- Email notification support (SMTP + console mock)

---

## [0.9.0] — 2026-07-03 — Milestone 9: Security Hardening

### Added
- Rate limiting middleware (global + per-endpoint limits)
- Request size middleware (blocks oversized non-upload requests)
- Security headers middleware (OWASP: X-Frame-Options, CSP, etc.)
- Request ID middleware (X-Request-ID on all responses)
- Audit logging system (immutable append-only event log)
- Prometheus metrics endpoint
- User session management with multi-device revocation
- GZip response compression
- `user-agents` library for device detection
- `slowapi` for rate limiting

---

## [0.8.0] — Milestone 8: Bookmarks & Repositories

### Added
- Document bookmarking system
- Repository organization for documents
- Bulk document operations

---

## [0.7.0] — Milestone 7: AI Assistant

### Added
- Conversational AI chat interface
- Multi-turn conversation history
- Source citation in AI responses
- Context-aware document retrieval

---

## [0.6.0] — Milestone 6: Semantic Search

### Added
- `sentence-transformers` embedding pipeline
- Vector similarity search
- Semantic document indexing

---

## [0.5.0] — Milestone 5: AI Integration

### Added
- Google Gemini API integration
- Document summarization
- Q&A from document content
- `google-genai` SDK

---

## [0.4.0] — Milestone 4: OCR Pipeline

### Added
- PDF text extraction (PyPDF2)
- DOCX processing (python-docx)
- Image OCR (Tesseract + pytesseract + Pillow)
- Async document processing pipeline

---

## [0.3.0] — Milestone 3: Document Upload

### Added
- File upload endpoints (multipart/form-data)
- File type validation and size limits
- Upload storage management

---

## [0.2.0] — Milestone 2: Authentication

### Added
- JWT authentication (access + refresh tokens)
- User registration and login
- Password hashing (bcrypt)
- Email verification flow
- SQLAlchemy async models: `User`, `UserSession`, `AuditLog`
- Alembic migrations

---

## [0.1.0] — Milestone 1: Project Foundation

### Added
- FastAPI backend scaffold with application factory pattern
- React 19 + Vite + TypeScript frontend
- SQLAlchemy 2.x async setup
- Pydantic v2 settings management
- Structured logging (JSON-capable)
- CORS middleware
- Exception handler middleware
- Health check endpoint
- Docker Compose foundation

---

[Unreleased]: https://github.com/your-org/documind-ai/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/documind-ai/compare/v0.13.0...v1.0.0
[0.13.0]: https://github.com/your-org/documind-ai/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/your-org/documind-ai/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/your-org/documind-ai/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/your-org/documind-ai/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/your-org/documind-ai/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/your-org/documind-ai/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/your-org/documind-ai/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/your-org/documind-ai/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/your-org/documind-ai/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/your-org/documind-ai/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/your-org/documind-ai/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/documind-ai/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/documind-ai/releases/tag/v0.1.0

