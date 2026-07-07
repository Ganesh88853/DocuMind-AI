# DocuMind AI — Release Notes

## v1.0.0 — 2026-07-06

> **"Foundation Release"** — First production-ready release of DocuMind AI.

---

## What is DocuMind AI?

DocuMind AI is an AI-powered SaaS platform that lets you upload documents and query them in natural language. Upload PDFs, Word documents, and images — ask questions in plain English and get precise, source-cited answers powered by Google Gemini.

---

## Release Highlights

### ✅ 14 Milestones Delivered

| Milestone | Feature |
|---|---|
| M1 | Project Foundation (FastAPI + React 19 + TypeScript) |
| M2 | Database Models + JWT Authentication |
| M3 | Document Upload + File Management |
| M4 | OCR Pipeline (PDF, DOCX, Images via Tesseract) |
| M5 | AI Integration (Google Gemini) |
| M6 | Semantic Search (sentence-transformers embeddings) |
| M7 | AI Chat Assistant (multi-turn conversations) |
| M8 | Bookmarks + Repositories |
| M9 | Security Hardening (rate limiting, OWASP headers, audit logs) |
| M10 | Reminders + Notifications |
| M11 | Automated Testing (149 backend + 26 frontend tests) |
| M12 | Docker + Development Environment |
| M13 | CI/CD Pipeline (6 GitHub Actions workflows) |
| M14 | Production Deployment (Vercel + Render + Supabase) |

---

## New Features in v1.0.0

### Authentication & Security
- JWT authentication with 15-minute access tokens and 7-day rotating refresh tokens
- Session management with multi-device support and individual session revocation
- bcrypt password hashing (12 rounds)
- Role-based access control (user / admin)
- Immutable audit log for all authentication events
- 7-layer defence-in-depth security architecture

### Document Management
- Support for PDF, DOCX, PNG, JPG, JPEG, GIF, BMP, TIFF files
- 50MB per-file upload limit
- OCR processing with Tesseract (images) and native PDF/DOCX text extraction
- Document status tracking (pending → processing → ready → error)
- Document preview with extracted text

### AI Features
- Natural language document querying via Google Gemini (gemini-2.5-flash-lite)
- Semantic search using sentence-transformers (all-MiniLM-L6-v2) embeddings
- Source citations in AI responses
- Multi-turn conversation history
- Conversation management (create, list, delete)

### Organization
- Document bookmarking with custom notes
- Repository/folder organization
- Reminder system with scheduled notifications

### Infrastructure
- Docker Compose stack (5 services: postgres, redis, backend, frontend, nginx)
- Hot-reload development environment
- 6 GitHub Actions CI/CD workflows
- Production deployment on Vercel + Render + Supabase
- Automated database migrations on deploy
- Fail-fast production configuration validation

### Developer Experience
- 175 automated tests (149 backend + 26 frontend)
- 6 code quality workflows (Black, isort, Flake8, ESLint, Prettier)
- Security scanning (Gitleaks, pip-audit, Bandit, npm audit, Trivy)
- Dependabot for automated dependency updates
- Commitlint for Conventional Commits enforcement
- Complete documentation suite (12 docs)

---

## Bug Fixes

- **[Critical] AuditLog UUID type mismatch**: Fixed `DatatypeMismatchError` caused by `AuditLog.id` and `user_id` being changed to `String(36)` during testing milestone. Restored to `PG_UUID(as_uuid=True)` to match PostgreSQL schema.

---

## Breaking Changes

None — this is the initial production release.

---

## Dependencies

### Backend (Python 3.12)
```
fastapi==0.115.6
uvicorn[standard]==0.32.1
pydantic==2.10.4
sqlalchemy==2.0.36
alembic==1.14.0
asyncpg==0.30.0
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
google-genai==2.10.0
sentence-transformers>=3.0.0
pytesseract==0.3.13
PyPDF2==3.0.1
python-docx==1.2.0
slowapi==0.1.9
```

### Frontend (Node 22)
```
react==19.2.7
typescript~6.0.2
vite==8.1.0
tailwindcss==3.4.19
@tanstack/react-query==5.101.2
zustand==5.0.14
framer-motion==12.42.0
axios==1.18.1
react-router-dom==7.18.0
zod==4.4.3
```

---

## Migration Notes

This is a fresh installation — no migration from a previous version is required.

For database setup, migrations are applied automatically via:
```bash
alembic upgrade head
```

---

## Known Limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for a complete list of 19 documented limitations with workarounds.

**Most critical for new users:**
- Render free tier sleeps after 15 minutes idle (first request ~30s cold start)
- Local file storage is ephemeral on Render — use `STORAGE_BACKEND=supabase`

---

## GitHub Release Tag

```bash
git tag -a v1.0.0 -m "Release v1.0.0 — Production Ready"
git push origin v1.0.0
```

---

## Upgrade Path

There is no upgrade path from a pre-release version. For new installations, follow [DEPLOYMENT.md](../DEPLOYMENT.md).

---

## Contributors

- Initial development and architecture — sole developer

---

## License

MIT License — see [LICENSE](../LICENSE)
