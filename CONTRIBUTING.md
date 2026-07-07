# Contributing to DocuMind AI

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Branch Strategy](#branch-strategy)
- [Commit Standards](#commit-standards)
- [Pull Request Process](#pull-request-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Testing Requirements](#testing-requirements)
- [Code Style](#code-style)
- [Documentation](#documentation)

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Development Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 22 LTS | Frontend runtime |
| PostgreSQL | 16+ | Database |
| Docker | 24+ | Container runtime |
| Git | 2.40+ | Version control |

### Quick Start (Docker — recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/documind-ai.git
cd documind-ai

# 2. Create environment file
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and JWT_SECRET_KEY

# 3. Start the full dev stack (hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Access points:
# Frontend (Vite HMR): http://localhost:5173
# Backend (FastAPI):   http://localhost:8000
# API Docs (Swagger):  http://localhost:8000/docs
```

### Manual Setup (without Docker)

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # edit with your DB credentials
alembic upgrade head
uvicorn main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Branch Strategy

We follow **GitHub Flow** with structured branch naming:

```
main          ← production-ready code (protected, PR required)
develop       ← integration branch for features
feature/*     ← new features        (feature/user-auth)
bugfix/*      ← bug fixes           (bugfix/login-error)
hotfix/*      ← urgent production fixes (hotfix/security-patch)
release/*     ← release preparation (release/v1.2.0)
```

### Rules

| Branch | Protection | Direct Push | PR Required |
|---|---|---|---|
| `main` | ✅ Yes | ❌ No | ✅ Yes |
| `develop` | ✅ Yes | ❌ No | ✅ Yes |
| `feature/*` | ❌ No | ✅ Yes | — |

### Workflow

```bash
# 1. Create a feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# 2. Make your changes
# 3. Commit with Conventional Commits (see below)
# 4. Push and open a PR against develop
git push origin feature/my-feature
```

---

## Commit Standards

We use **Conventional Commits** — this enables automatic changelog generation and clear history.

### Format

```
<type>(<optional-scope>): <short description>

[optional body]

[optional footer: BREAKING CHANGE or closes #issue]
```

### Types

| Type | When to use | Example |
|---|---|---|
| `feat` | New feature | `feat(auth): add refresh token rotation` |
| `fix` | Bug fix | `fix(upload): handle PDF files > 10MB` |
| `docs` | Documentation | `docs(readme): update Docker setup` |
| `style` | Formatting only | `style: run Black formatter` |
| `refactor` | Refactoring | `refactor(auth): extract token service` |
| `test` | Tests | `test(auth): add login failure cases` |
| `ci` | CI/CD changes | `ci: add backend coverage threshold` |
| `build` | Build / deps | `build(deps): bump fastapi to 0.115.6` |
| `chore` | Maintenance | `chore: update .gitignore` |
| `perf` | Performance | `perf(search): cache embedding vectors` |
| `revert` | Revert | `revert: revert "feat(auth): ..."` |
| `security` | Security | `security: rotate JWT signing algorithm` |

### Breaking Changes

```
feat(api)!: rename /documents to /docs

BREAKING CHANGE: All existing API clients must update the endpoint path.
```

### Scope Examples

```
feat(auth):      authentication system
fix(upload):     file upload
fix(ocr):        OCR processing
feat(ai):        AI features
fix(search):     semantic search
ci(backend):     backend CI
build(frontend): frontend build
```

### Setting up Commitlint (optional — enforces locally)

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

---

## Pull Request Process

1. **Ensure all CI checks pass** before requesting review
2. Fill out the **PR template** completely
3. **Link the related issue** (`Closes #123`)
4. Request review from **at least one** code owner
5. **Squash commits** before merging (keep history clean)
6. Do **not** merge your own PR (except for urgent hotfixes)

### Required CI Checks (must all pass)

| Check | Workflow |
|---|---|
| Backend tests | `tests.yml` → `backend` job |
| Frontend tests | `tests.yml` → `frontend` job |
| Code quality | `quality.yml` |
| Docker build | `docker.yml` |
| Secret detection | `security.yml` → `secret-detection` |

---

## CI/CD Pipeline

### Workflow Overview

```
Push / PR
    │
    ├── tests.yml         Backend (pytest) + Frontend (vitest)
    ├── quality.yml       Black, isort, Flake8, ESLint, Prettier
    ├── security.yml      Gitleaks, pip-audit, Bandit, npm audit
    ├── docker.yml        Image builds + stack integration test
    ├── backend.yml       Backend-specific: migrations, coverage
    └── frontend.yml      Frontend-specific: build artifact
```

### Running CI Locally

```bash
# Run the same checks CI runs

# Backend
cd backend
black --check app/ main.py
isort --check-only app/ main.py
python -m pytest tests/ -v --cov=app

# Frontend
cd frontend
npm run type-check
npm run lint
npx prettier --check "src/**/*.{ts,tsx}"
npm test
```

---

## Testing Requirements

### Backend

- All new features **must** include tests
- Minimum **60% coverage** enforced in CI (`--cov-fail-under=60`)
- Tests live in `backend/tests/`
- Use `pytest-asyncio` for async tests
- Mark tests with appropriate markers: `@pytest.mark.unit`, `@pytest.mark.integration`

```bash
# Run all backend tests
cd backend
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth_api.py -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=html
```

### Frontend

- All new components **should** include tests
- Tests live in `frontend/src/**/__tests__/` or `*.test.tsx` files
- Use `@testing-library/react` for component tests

```bash
cd frontend
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

---

## Code Style

### Python (Backend)

| Tool | Purpose | Config |
|---|---|---|
| `Black` | Auto-formatter | `pyproject.toml` |
| `isort` | Import sorter | `pyproject.toml` |
| `Flake8` | Style linter | `--max-line-length=100` |
| `MyPy` | Type checker | Advisory |

```bash
# Auto-fix formatting
black app/ main.py
isort app/ main.py
```

### TypeScript (Frontend)

| Tool | Purpose | Config |
|---|---|---|
| `ESLint` | Linter | `.eslintrc` |
| `Prettier` | Formatter | `.prettierrc` |
| `TypeScript` | Type checker | `tsconfig.json` |

```bash
# Auto-fix formatting
npx prettier --write "src/**/*.{ts,tsx,css}"
```

---

## Documentation

- Update `CHANGELOG.md` for every user-facing change
- Update `README.md` if the setup steps change
- Update `DOCKER.md` if infrastructure changes
- Add docstrings to all public Python functions
- Add JSDoc comments to complex TypeScript functions

---

## Questions?

- Open a [GitHub Discussion](https://github.com/your-org/documind-ai/discussions) for questions
- Open an [Issue](https://github.com/your-org/documind-ai/issues) for bugs or features
- Tag `@your-username` in PRs for urgent reviews
