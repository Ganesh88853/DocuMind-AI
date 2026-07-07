# DocuMind AI — Portfolio & Resume Materials

> Professional presentation materials for portfolio websites, GitHub, LinkedIn, and job applications.

---

## Project Description (Short — 2 sentences)

**DocuMind AI** is a production-ready, full-stack SaaS platform that enables users to query private document libraries using natural language and receive AI-generated answers with source citations. Built with FastAPI, React 19, PostgreSQL, and Google Gemini, the platform includes a 7-layer security architecture, 175 automated tests, a complete CI/CD pipeline, and production deployment on Vercel + Render + Supabase.

---

## Project Description (Medium — 1 paragraph)

DocuMind AI is an AI-powered document assistant SaaS platform built across 15 engineering milestones over a structured development lifecycle. Users upload PDFs, Word documents, and images, which are processed through an OCR pipeline and converted to searchable semantic embeddings. A React 19 frontend with a premium dark-mode UI connects to a FastAPI backend featuring comprehensive security hardening — JWT authentication with refresh token rotation, rate limiting, OWASP security headers, and an immutable audit log. The AI chat assistant uses a Retrieval-Augmented Generation (RAG) pipeline to deliver precise, source-cited answers from the user's document library via Google Gemini. The project includes 175 automated tests, 6 GitHub Actions CI/CD workflows (security scanning, quality enforcement, Docker validation, deployment), full Docker Compose development environment, and production deployment infrastructure on a free-tier cloud stack.

---

## Project Description (Long — Portfolio Page)

**DocuMind AI** — AI-Powered Document Intelligence Platform

I designed and built DocuMind AI from scratch across 15 structured engineering milestones, simulating a real-world SaaS product development lifecycle. The project demonstrates the full spectrum of modern software engineering: architecture, security, AI integration, DevOps, testing, and production deployment.

**The Problem:** Knowledge workers spend significant time searching through unstructured documents — contracts, reports, research papers, manuals. Traditional keyword search misses contextually relevant content. DocuMind solves this by letting users ask questions in plain English and receive AI-generated answers with citations showing exactly where the information came from.

**Technical Highlights:**
- Full-stack architecture: FastAPI async REST API + React 19 SPA + PostgreSQL 16
- AI pipeline: sentence-transformers for semantic embeddings + Google Gemini for generation
- Security-first: 7-layer defence-in-depth with rate limiting, audit logging, RBAC, and OWASP headers
- Production-ready: 175 automated tests, 6 CI/CD workflows, multi-stage Docker builds
- Deployed: Vercel (frontend) + Render (backend) + Supabase (database + storage)

**Engineering Depth:**
The backend implements a clean Repository → Service → Route architecture with full async SQLAlchemy 2.x, Pydantic v2 validation, Alembic migrations, and a storage provider abstraction (swap local ↔ Supabase with one env var). The frontend uses TanStack Query for server state, Zustand for client state, and React Router v6 for routing — with Axios interceptors handling token refresh transparently.

---

## Key Achievements

- Designed and implemented a **complete SaaS platform** from scratch in 15 milestones
- Built a **RAG (Retrieval-Augmented Generation) pipeline** with semantic search and source citations
- Implemented **7-layer security architecture** (JWT rotation, RBAC, rate limiting, OWASP, audit logs)
- Achieved **60%+ test coverage** with 149 backend + 26 frontend tests using real PostgreSQL
- Designed **multi-stage Docker builds** producing non-root containers with < 200MB images
- Built **6 GitHub Actions workflows** including secret detection, SAST, container scanning, deployment
- Created a **storage provider abstraction** enabling zero-code-change backend switching
- Implemented **fail-fast production configuration validation** preventing silent misconfigurations
- Documented the system with **12 professional documents** including full API reference and interview prep

---

## Technical Highlights (Bullet Format — Resume)

### DocuMind AI — Full-Stack AI SaaS Platform

- Architected a production-ready REST API using **FastAPI + SQLAlchemy 2.x async + PostgreSQL 16** with a clean Repository/Service/Route separation, Alembic migrations, and Pydantic v2 request validation
- Implemented a **RAG pipeline** using sentence-transformers (all-MiniLM-L6-v2) for 384-dim document embeddings and Google Gemini for context-grounded Q&A with source citations
- Designed a **7-layer authentication and security system** including JWT access/refresh token rotation, bcrypt hashing (12 rounds), RBAC, per-IP rate limiting, OWASP security headers, and immutable audit logging
- Built a **storage provider abstraction** (Local/Supabase) enabling environment-variable-driven backend switching with no service layer changes
- Achieved **175 automated tests** (149 backend, 26 frontend) using pytest-asyncio with real PostgreSQL service containers and Vitest + React Testing Library
- Developed **6 GitHub Actions CI/CD workflows** covering testing, code quality, security scanning (Gitleaks, Bandit, Trivy), and automated deployment with health verification
- Containerized with **multi-stage Docker builds** producing non-root images; full dev stack via Docker Compose with hot reload
- Deployed to **free-tier cloud stack**: Vercel (React CDN) + Render (FastAPI) + Supabase (PostgreSQL + Storage)
- Implemented **fail-fast production validation** in Pydantic settings that rejects misconfigurations at startup
- Designed **OCR pipeline** supporting PDF (PyPDF2), DOCX (python-docx), and images (Tesseract) with magic byte file type verification

---

## Architecture Summary (Interview Talking Points)

**"Tell me about a project you're proud of."**

DocuMind AI is a full-stack SaaS application I built solo. I'm particularly proud of three architectural decisions:

1. **The storage abstraction**: I defined a `StorageProvider` abstract class with five methods, then implemented both `LocalStorageProvider` (filesystem) and `SupabaseStorageProvider` (cloud). A factory function reads an environment variable and returns the right provider. No service code changes when switching — just one env var. This pattern demonstrates SOLID principles in a real context.

2. **The fail-fast configuration validator**: Rather than letting the app start with a misconfigured production environment, I added a Pydantic `model_validator` that runs at startup and calls `sys.exit(1)` with descriptive errors if required variables are missing or look like dev placeholders. This prevented several would-have-been production incidents.

3. **The CI pipeline design**: Six workflows with single responsibilities, each using `concurrency` groups to cancel superseded runs. The primary gate (`tests.yml`) has a `tests-complete` summary job — adding matrix entries never breaks branch protection. Gitleaks runs on full git history as a hard gate.

---

## Challenges Solved

### Challenge 1: Async Database Testing

**Problem**: pytest's `asyncio` event loop and SQLAlchemy's async sessions require careful fixture scoping. Test isolation needed each test to start with a clean database, but creating tables is expensive.

**Solution**: Created a module-scoped `engine` fixture that creates all tables once per test session, and a function-scoped `db_session` fixture that wraps each test in a transaction that's rolled back after the test — no actual inserts persist between tests, no table recreation overhead.

---

### Challenge 2: Refresh Token Security

**Problem**: Standard JWT refresh doesn't prevent replay attacks — a stolen refresh token can be used indefinitely.

**Solution**: Implemented refresh token rotation: every use of a refresh token issues a new one and invalidates the old JTI (JWT ID) in `user_sessions`. If a token is replayed (attacker uses it after the legitimate user already refreshed), the system detects the mismatch and can revoke all sessions for the user.

---

### Challenge 3: Production vs Development Parity

**Problem**: OCR processing (Tesseract), sentence-transformers model downloads, and Gemini API calls make full local testing complex and slow.

**Solution**: Separated environments with `.env.testing` that uses `bcrypt=4` (10ms vs 300ms), fake Gemini keys (AI tests mock the API), and a dedicated test database. The Docker Compose dev stack mirrors production exactly. CI uses service containers (real PostgreSQL, not SQLite) to catch production-specific bugs.

---

### Challenge 4: AuditLog UUID Type Regression

**Problem**: During Milestone 11, `AuditLog.id` and `user_id` were changed to `String(36)` to accommodate SQLite for testing, causing a `DatatypeMismatchError` in production PostgreSQL.

**Solution**: Identified that SQLite test compatibility and production PostgreSQL correctness are conflicting requirements. Solution: use a dedicated PostgreSQL test database (not SQLite) in both local and CI environments. Restored `PG_UUID(as_uuid=True)` on all UUID columns. Added the PostgreSQL service container to CI.

---

## Impact Statement

**What would this look like at scale?** 

DocuMind AI's architecture supports a path to 10,000+ users with targeted additions: pgvector for O(log n) search, Celery for async document processing, Redis-backed rate limiting, and Kubernetes for horizontal scaling. The storage abstraction, security architecture, and test foundation would all remain unchanged — demonstrating that architectural quality at v1 reduces technical debt at scale.

---

## LinkedIn Project Description

**DocuMind AI | Full-Stack AI SaaS Platform**  
*Python · FastAPI · React 19 · PostgreSQL · Google Gemini · Docker · GitHub Actions*

Built a production-ready AI document assistant SaaS platform from design to deployment across 15 structured milestones. Users upload documents (PDF, DOCX, images) and query them with natural language — the AI assistant returns answers with citations from the original documents using a RAG pipeline.

**Technical depth:**
→ FastAPI + SQLAlchemy 2.x async backend with Repository/Service pattern  
→ React 19 + TypeScript + TanStack Query + Zustand frontend  
→ Semantic search via sentence-transformers + Google Gemini for generation  
→ JWT auth with refresh token rotation + 7-layer security architecture  
→ 175 automated tests, 6 CI/CD workflows (Gitleaks, Bandit, Trivy, pip-audit)  
→ Docker Compose dev environment + production on Vercel/Render/Supabase  
→ Complete documentation: 12 professional documents including API reference and architecture diagrams

---

## Demo Script (5-minute walkthrough)

1. **(30s)** — Open the landing page: "This is DocuMind AI — an AI-powered document assistant."

2. **(30s)** — Register and login: "Registration goes through Pydantic validation on the backend. Passwords are bcrypt-hashed. You get a 15-minute access token and a 7-day refresh token."

3. **(1m)** — Upload a document: "I'll upload this PDF. The backend validates the file type via magic bytes, stores it, extracts text with PyPDF2, splits it into chunks, generates 384-dimensional embeddings with sentence-transformers, and stores everything in PostgreSQL. Status changes from processing to ready."

4. **(1m)** — Semantic search: "Watch this — I search 'financial risks' and it finds relevant passages even though those exact words might not appear. That's cosine similarity over 384-dimensional semantic vectors."

5. **(1m)** — AI Chat: "I ask 'What were the Q3 revenue figures?' The backend embeds my question, finds the top-5 similar document chunks, sends them as context to Google Gemini, and returns an answer with citations showing exactly which passage it used."

6. **(30s)** — Security: "Every request has an X-Request-ID for log tracing. Rate limits protect auth endpoints. Every action is written to an immutable audit log."

7. **(30s)** — Code quality: "The project has 175 automated tests, 6 CI workflows, and is deployed to Vercel + Render + Supabase."

---

## Portfolio Screenshots Guide

Capture these screenshots for your portfolio:

1. **Landing Page** — hero section showing the main value proposition
2. **Dashboard** — showing document list, stats cards, recent activity
3. **Upload Flow** — file drop zone + upload progress
4. **Document Detail** — extracted text preview + AI summary + metadata
5. **Semantic Search** — search query + results with similarity scores + excerpts
6. **AI Chat** — multi-turn conversation with cited sources
7. **Security Page** — active sessions management
8. **Dark Mode** — any page showing the dark theme
9. **Architecture Diagram** — from ARCHITECTURE.md rendered in GitHub
10. **CI Pipeline** — GitHub Actions showing all 6 workflows passing (green checkmarks)

---

## Resume Bullet Points (Copy-Paste Ready)

```
• Built DocuMind AI — a full-stack AI SaaS platform (FastAPI, React 19, PostgreSQL, Gemini)
  with a RAG pipeline for natural language document querying with source citations

• Implemented 7-layer security: JWT rotation, bcrypt hashing, RBAC, rate limiting, 
  OWASP headers, file validation, and immutable audit logging

• Achieved 175 automated tests (pytest-asyncio + Vitest) with real PostgreSQL service 
  containers in CI; enforced 60% coverage threshold

• Designed 6 GitHub Actions workflows: secret detection (Gitleaks), SAST (Bandit), 
  container scanning (Trivy), dependency audit, quality enforcement, and deployment

• Built a storage provider abstraction (Local/Supabase) enabling zero-code backend 
  switching via environment variable; implemented fail-fast production config validation

• Created multi-stage Docker builds (non-root, < 200MB) with full Docker Compose 
  development stack; deployed to Vercel + Render + Supabase free tier
```
