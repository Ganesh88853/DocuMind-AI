<div align="center">

# 🧠 DocuMind AI

### Stop Searching. Start Asking.

**An AI-powered SaaS platform that lets you query your documents in natural language and receive precise, source-cited answers.**

[![Tests](https://github.com/your-org/documind-ai/actions/workflows/tests.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/tests.yml)
[![Backend CI](https://github.com/your-org/documind-ai/actions/workflows/backend.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/backend.yml)
[![Frontend CI](https://github.com/your-org/documind-ai/actions/workflows/frontend.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/frontend.yml)
[![Code Quality](https://github.com/your-org/documind-ai/actions/workflows/quality.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/quality.yml)
[![Security](https://github.com/your-org/documind-ai/actions/workflows/security.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/security.yml)
[![Docker Build](https://github.com/your-org/documind-ai/actions/workflows/docker.yml/badge.svg)](https://github.com/your-org/documind-ai/actions/workflows/docker.yml)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](DOCKER.md)
[![Version](https://img.shields.io/badge/version-1.0.0-success)](docs/RELEASE_NOTES.md)

[Demo](#live-demo) · [Quick Start](#quick-start) · [Architecture](#architecture) · [API Docs](docs/API.md) · [Deployment](DEPLOYMENT.md)

</div>

---

## What is DocuMind AI?

DocuMind AI is a **production-ready, full-stack SaaS document intelligence platform** built across 15 engineering milestones. Upload your PDFs, Word documents, and images — then ask questions in plain English. The AI assistant searches your document library semantically and returns cited, precise answers powered by Google Gemini.

Built with a 7-layer security architecture, 175 automated tests, a complete CI/CD pipeline, and deployed to a free-tier cloud stack (Vercel + Render + Supabase).

---

## Live Demo

| Service | URL |
|---|---|
| **Frontend** | `https://your-app.vercel.app` *(deploy and update)* |
| **Backend API** | `https://documind-backend.onrender.com` *(deploy and update)* |
| **API Docs** | `https://documind-backend.onrender.com/docs` *(only in DEBUG mode)* |

> Deploy your own in ~15 minutes → see [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Features

### Core Product

| Feature | Description | Status |
|---|---|---|
| 🔐 **JWT Authentication** | 15-min access tokens + 7-day rotating refresh tokens | ✅ |
| 👥 **Session Management** | Multi-device sessions, individual session revocation | ✅ |
| 📄 **Document Upload** | PDF, DOCX, PNG, JPG, GIF, BMP, TIFF — up to 50MB | ✅ |
| 🔍 **OCR Processing** | Tesseract (images) + PyPDF2 (PDF) + python-docx (Word) | ✅ |
| 🧠 **Semantic Search** | 384-dim embeddings via sentence-transformers | ✅ |
| 🤖 **AI Chat Assistant** | RAG pipeline with Google Gemini + source citations | ✅ |
| 🔖 **Bookmarks** | Save and annotate important documents | ✅ |
| 📁 **Repositories** | Organize documents into collections | ✅ |
| ⏰ **Reminders** | Set time-based reminders on documents | ✅ |

### Engineering Quality

| Feature | Details |
|---|---|
| 🛡️ **7-Layer Security** | CORS, headers, rate limiting, JWT, RBAC, validation, audit log |
| 🧪 **175 Automated Tests** | 149 backend (pytest-asyncio) + 26 frontend (Vitest) |
| ⚙️ **6 CI/CD Workflows** | Tests · Quality · Security · Docker · Backend · Frontend |
| 🔒 **Security Scanning** | Gitleaks · Bandit · Trivy · pip-audit · npm audit |
| 🐳 **Docker Stack** | Multi-stage builds, non-root containers, full dev stack |
| 📦 **Fail-Fast Config** | Pydantic validator rejects misconfigured production starts |
| 🔄 **Storage Abstraction** | Swap Local ↔ Supabase with one environment variable |

---

## Quick Start

### Option A — Docker (Recommended)

One command starts the complete dev environment with hot reload:

```bash
# 1. Clone
git clone https://github.com/your-org/documind-ai.git
cd documind-ai

# 2. Configure
cp .env.example .env
# Edit .env:  set GEMINI_API_KEY and JWT_SECRET_KEY

# 3. Start
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

| Service | URL | Notes |
|---|---|---|
| **Frontend** (Vite HMR) | http://localhost:5173 | Hot module replacement |
| **Backend API** | http://localhost:8000 | Auto-reload |
| **Swagger Docs** | http://localhost:8000/docs | Requires `DEBUG=true` |
| **Via Nginx** | http://localhost | Production proxy |
| **API prefix** | /api/v1/ | All versioned endpoints |

### Option B — Manual Setup

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.development .env
alembic upgrade head
uvicorn main:app --reload       # http://localhost:8000
```

**Frontend** *(separate terminal)*
```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.12+ | |
| Node.js | 22 LTS | |
| PostgreSQL | 16+ | Or use Docker |
| Tesseract | 5.x | `choco install tesseract` / `brew install tesseract` |
| Docker Desktop | 24+ | For Option A |

---

## Architecture

```
 User Browser
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│               Vercel (Frontend CDN)                    │
│  React 19 SPA · TypeScript 6 · Tailwind CSS            │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS API calls
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Render (Backend)                         │
│  FastAPI · Python 3.12 · Uvicorn · 6-layer middleware  │
└────┬────────────────────┬───────────────────────────────┘
     │                    │
     ▼                    ▼
┌─────────────┐   ┌──────────────────────────────────────┐
│  Supabase   │   │      Supabase Storage                │
│  PostgreSQL │   │  Private bucket · Signed URLs        │
│  + Pooler   │   │  50MB limit · S3-compatible          │
└─────────────┘   └──────────────────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for 9 detailed Mermaid diagrams:
- System Architecture · Frontend Architecture · Backend Architecture
- Database ER Diagram · Authentication Flow · Document Processing Pipeline
- AI/RAG Pipeline · Semantic Search Flow · Deployment Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, Framer Motion |
| **State** | TanStack Query v5 (server), Zustand (client) |
| **Backend** | FastAPI 0.115, Python 3.12, Uvicorn |
| **Database** | PostgreSQL 16, SQLAlchemy 2.x async, Alembic, asyncpg |
| **AI** | Google Gemini (gemini-2.5-flash-lite) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2, 384 dims) |
| **OCR** | Tesseract 5, PyPDF2, python-docx |
| **Auth** | JWT (python-jose), bcrypt (12 rounds), Pydantic v2 |
| **Security** | slowapi rate limiting, OWASP headers, Gitleaks, Bandit, Trivy |
| **Infra** | Docker, Nginx, GitHub Actions (6 workflows), Dependabot |
| **Hosting** | Vercel + Render + Supabase (free tier) |

---

## RAG Pipeline

```
 User Question
      │
      ▼
┌─────────────────┐    ┌──────────────────────┐    ┌──────────────────┐
│  Embed question │───▶│ Cosine similarity     │───▶│ Top-5 chunks     │
│  (MiniLM 384d)  │    │ over all doc chunks  │    │ retrieved        │
└─────────────────┘    └──────────────────────┘    └────────┬─────────┘
                                                             │
                                                             ▼
                                                   ┌──────────────────┐
                                                   │ Google Gemini    │
                                                   │ with context +   │
                                                   │ citation prompt  │
                                                   └────────┬─────────┘
                                                             │
                                                             ▼
                                                   ┌──────────────────┐
                                                   │ Answer + Sources │
                                                   │ saved to DB      │
                                                   └──────────────────┘
```

---

## Security Architecture

DocuMind AI implements **7 layers of defence in depth**:

```
1. Network        → HTTPS enforced (Vercel + Render auto-certs)
2. Application    → CORS allowlist · OWASP security headers · Rate limiting
3. Authentication → JWT (15min) · Refresh token rotation · Session revocation
4. Authorization  → RBAC (user/admin) · Resource ownership checks
5. Input          → Pydantic v2 strict validation · Magic byte file verification
6. Data           → bcrypt (12 rounds) · UUID PKs · Parameterized queries
7. Audit          → Immutable audit_logs · X-Request-ID tracing
```

---

## Testing

```bash
# Backend — 149 tests
cd backend
python -m pytest tests/ -v --cov=app --cov-report=html

# Frontend — 26 tests
cd frontend
npm test
npm run test:coverage
```

**Test breakdown:**

| Suite | Count | Tool |
|---|---|---|
| Auth API (register, login, refresh, sessions) | 37 | pytest-asyncio |
| Security (RBAC, headers, rate limits) | 48 | pytest-asyncio |
| Schema validation | 32 | pytest |
| Security utilities (JWT, bcrypt) | 32 | pytest |
| Auth store | 12 | Vitest |
| Theme store | 14 | Vitest |
| **Total** | **175** | |

---

## CI/CD Pipeline

Every push and pull request runs 6 workflows automatically:

```
Push / PR to main or develop
    │
    ├── tests.yml        ← Primary gate: backend pytest + frontend vitest
    ├── quality.yml      ← Black · isort · Flake8 · ESLint · Prettier
    ├── security.yml     ← Gitleaks (hard gate) · pip-audit · Bandit · Trivy
    ├── docker.yml       ← Build images · Full stack integration smoke test
    ├── backend.yml      ← Migration integrity · Coverage report
    └── frontend.yml     ← TypeScript check · Production build artifact

Push to main only:
    └── deploy.yml       ← Pre-deploy test gate → Render deploy → Health check → Smoke test
```

**Branch Protection:** All PRs to `main` require tests + quality + security (Gitleaks) + Docker.

---

## Project Structure

```
documind-ai/
├── .github/
│   ├── workflows/        # 7 CI/CD workflow files (tests, quality, security, docker, backend, frontend, deploy)
│   ├── ISSUE_TEMPLATE/   # Bug report, feature request, docs templates
│   ├── CODEOWNERS        # Auto-reviewer assignment
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml    # Weekly automated dependency updates (pip + npm + actions)
│
├── backend/
│   ├── app/
│   │   ├── api/routes/   # auth · documents · search · assistant · admin · health
│   │   ├── core/         # config (Pydantic BaseSettings) · logging
│   │   ├── database/     # async SQLAlchemy engine + session factory
│   │   ├── middleware/   # cors · exception_handler · rate_limiter · request_id · request_size · security_headers
│   │   ├── models/       # 11 ORM models: User · Document · DocumentChunk · Conversation · Message · etc.
│   │   ├── repositories/ # Data access layer (DAOs)
│   │   ├── schemas/      # Pydantic v2 request/response schemas
│   │   ├── services/     # Business logic: AuthService · DocumentService · AIService · SearchService
│   │   ├── storage/      # LocalStorageProvider + SupabaseStorageProvider + factory
│   │   └── vector/       # Embedding utilities
│   ├── tests/            # 149 pytest tests with real PostgreSQL
│   ├── migrations/       # 9 Alembic migration files (M1–M9)
│   ├── Dockerfile        # Multi-stage, non-root (UID 1001)
│   ├── render.yaml       # Render deployment blueprint
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # 12 pages: Landing · Login · Register · Dashboard · Upload · Search · Assistant · etc.
│   │   ├── components/   # ui/ · layout/ · auth/ · documents/ · search/ · assistant/
│   │   ├── services/     # Axios API clients: auth · documents · search · assistant · security
│   │   ├── store/        # Zustand: authStore · documentStore · themeStore · uiStore
│   │   ├── types/        # TypeScript interfaces for all API types
│   │   └── routes/       # React Router v6 with protected routes
│   ├── Dockerfile        # Multi-stage: deps → build → nginx:alpine
│   ├── vercel.json       # SPA routing + security headers + asset caching
│   └── package.json
│
├── docker/               # nginx.conf · postgres/init.sql · redis/redis.conf
├── scripts/              # health-check.sh · smoke-test.sh · migrate-prod.sh · rollback.sh · dev.ps1
├── docs/                 # 10 documentation files (see below)
├── docker-compose.yml    # Production stack (5 services)
├── docker-compose.dev.yml # Dev overrides (hot reload + volume mounts)
├── DEPLOYMENT.md         # Step-by-step production deployment guide
├── DOCKER.md             # Docker architecture + troubleshooting
├── CONTRIBUTING.md       # Contributor guide
├── SECURITY.md           # Vulnerability reporting
├── CHANGELOG.md          # Version history
└── LICENSE               # MIT
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 9 Mermaid architecture diagrams |
| [docs/API.md](docs/API.md) | Complete REST API reference |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | End-user documentation |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Operations and admin reference |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Engineering guide + patterns |
| [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | v1.0.0 release notes |
| [docs/ROADMAP.md](docs/ROADMAP.md) | v1.1 through v2.0 roadmap |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | 19 documented limitations |
| [docs/INTERVIEW_PREP.md](docs/INTERVIEW_PREP.md) | 160 technical Q&As |
| [docs/PORTFOLIO.md](docs/PORTFOLIO.md) | Resume and portfolio materials |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment guide |
| [DOCKER.md](DOCKER.md) | Docker setup guide |

---

## Environment Variables

Copy `.env.example` → `.env` and fill in the required values:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET_KEY` | ✅ | Min 32 chars — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GEMINI_API_KEY` | ✅ | [Get free key →](https://aistudio.google.com/app/apikey) |
| `POSTGRES_PASSWORD` | ✅ | Change from default in production |
| `STORAGE_BACKEND` | ❌ | `local` (dev) or `supabase` (prod) |
| `SUPABASE_URL` | ⚠️ prod | Required when `STORAGE_BACKEND=supabase` |
| `SUPABASE_SERVICE_KEY` | ⚠️ prod | Required when `STORAGE_BACKEND=supabase` |
| `CORS_ORIGINS` | ⚠️ prod | Your frontend URL (no trailing slash) |

Full reference → [backend/.env.production.example](backend/.env.production.example)

---

## Deployment

Deploy the full stack to **Vercel + Render + Supabase** (all free tier) in ~15 minutes:

```
Frontend → Vercel  (global CDN, auto HTTPS)
Backend  → Render  (auto-deploy from git, auto HTTPS)
Database → Supabase PostgreSQL  (daily backups)
Storage  → Supabase Storage  (S3-compatible, private bucket)
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide including:
- Supabase project + storage bucket setup
- Render service configuration + environment variables
- Vercel project import + env var configuration
- GitHub Actions secrets for automated deploy
- Health verification + rollback procedures

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

**Quick summary:**
1. Fork → create `feature/your-feature` branch off `develop`
2. Make changes and write tests
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/) format
4. Open PR against `develop` — all 6 CI checks must pass

**Commit format:**
```
feat(search): add document-scoped search filter
fix(auth): handle expired refresh token gracefully
docs(api): add pagination examples
ci: add migration downgrade test
```

---

## Security

To report a security vulnerability, see [SECURITY.md](SECURITY.md).

**Do not** open a public GitHub Issue for security vulnerabilities.

Key security features:
- JWT auth with refresh token rotation (replay attack prevention)
- bcrypt password hashing (12 rounds, ~300ms per hash)
- Per-IP rate limiting (10 auth attempts/min)
- OWASP security headers on every response
- Immutable audit log for all auth events
- Secret detection (Gitleaks) as a hard CI gate

---

## Known Limitations

See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) for the complete list of 19 documented limitations with root cause, workaround, and planned fix.

**Most important for v1.0.0:**
- Render free tier has 15-min idle cold starts (~30s first response) — use UptimeRobot to keep it warm
- Local storage is ephemeral on Render — set `STORAGE_BACKEND=supabase` for production
- Semantic search uses Python cosine similarity (O(n)) — pgvector planned for v1.1

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md) for the full roadmap.

| Version | Theme | Target |
|---|---|---|
| **v1.0.0** | Foundation Release | ✅ Released |
| v1.1.0 | Performance & Scale | Q3 2026 |
| v1.2.0 | Developer API | Q4 2026 |
| v1.3.0 | Teams & Collaboration | Q1 2027 |
| v1.4.0 | Security & Compliance | Q2 2027 |
| v2.0.0 | AI Platform | Q3 2027 |

---

## Acknowledgements

Built with:
- [FastAPI](https://fastapi.tiangolo.com/) — Modern Python async web framework
- [Google Gemini](https://ai.google.dev/) — AI text generation
- [sentence-transformers](https://www.sbert.net/) — Semantic embeddings
- [React](https://react.dev/) — Frontend framework
- [Supabase](https://supabase.com/) — Managed PostgreSQL + Storage
- [Vercel](https://vercel.com/) — Frontend hosting
- [Render](https://render.com/) — Backend hosting

---

## License

[MIT](LICENSE) © 2026 DocuMind AI

---

<div align="center">

**Built with ❤️ across 15 engineering milestones**

[⭐ Star this repo](https://github.com/your-org/documind-ai) · [🐛 Report Bug](https://github.com/your-org/documind-ai/issues) · [💡 Request Feature](https://github.com/your-org/documind-ai/issues)

</div>
