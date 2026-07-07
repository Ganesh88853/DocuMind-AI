# DocuMind AI — Developer Guide

> Complete reference for engineers contributing to or extending DocuMind AI.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [Database & Migrations](#database--migrations)
7. [Testing](#testing)
8. [Code Quality](#code-quality)
9. [Git Workflow](#git-workflow)
10. [Adding New Features](#adding-new-features)
11. [API Conventions](#api-conventions)
12. [Environment Variables](#environment-variables)

---

## Project Overview

DocuMind AI is a full-stack monorepo:

```
documind-ai/
├── backend/          FastAPI Python API
├── frontend/         React TypeScript SPA
├── docker/           Nginx + DB config
├── scripts/          Developer helper scripts
├── docs/             Project documentation
└── .github/          CI/CD workflows + templates
```

**Backend:** Python 3.12, FastAPI, SQLAlchemy 2.x async, Alembic, Pydantic v2  
**Frontend:** React 19, TypeScript 6, Vite 8, TanStack Query v5, Zustand, Tailwind CSS 3  
**Infrastructure:** PostgreSQL 16, Redis 7, Nginx, Docker Compose

---

## Development Setup

### Option A — Docker (Recommended)

```bash
# Clone and configure
git clone https://github.com/your-org/documind-ai.git
cd documind-ai
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and JWT_SECRET_KEY

# Start full dev environment with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Services:
# Frontend (Vite HMR):  http://localhost:5173
# Backend (FastAPI):    http://localhost:8000
# API Docs (Swagger):   http://localhost:8000/docs
# Nginx proxy:          http://localhost:80
```

### Option B — Manual Setup

**Backend**
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.development .env          # Safe dev defaults

# Set up PostgreSQL (must have PG running locally)
createdb documind_ai
createdb documind_test

# Apply migrations
alembic upgrade head

# Start backend
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.12+ | https://python.org |
| Node.js | 22 LTS | https://nodejs.org |
| PostgreSQL | 16+ | https://postgresql.org |
| Tesseract | 5.x | `choco install tesseract` (Windows) / `brew install tesseract` (Mac) |
| Docker | 24+ | https://docker.com (optional) |
| Git | 2.40+ | https://git-scm.com |

---

## Project Structure

### Backend Structure

```
backend/
├── main.py                    # Application entry point + factory
├── alembic.ini                # Alembic configuration
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Multi-stage production image
├── docker-entrypoint.sh       # Wait-for-DB + migrate + start
├── render.yaml                # Render deployment config
├── .env.development           # Local dev defaults
├── .env.testing               # CI/test settings
├── .env.production.example    # Production template
├── migrations/
│   ├── env.py                 # Alembic async setup
│   └── versions/              # Migration files (001–009)
├── tests/
│   ├── conftest.py            # Pytest fixtures
│   ├── test_auth_api.py       # Auth endpoint tests
│   ├── test_security_api.py   # Security + RBAC tests
│   ├── test_schemas.py        # Pydantic validation tests
│   └── test_security_utils.py # JWT + bcrypt utility tests
└── app/
    ├── api/
    │   ├── router.py          # Aggregates all route routers
    │   └── routes/
    │       ├── health.py      # GET /health, GET /
    │       ├── auth.py        # Auth endpoints
    │       ├── documents.py   # Document CRUD + upload
    │       ├── search.py      # Semantic search
    │       ├── assistant.py   # AI chat assistant
    │       └── admin.py       # Admin-only endpoints
    ├── core/
    │   ├── config.py          # Settings (Pydantic BaseSettings)
    │   └── logging.py         # Structured logging setup
    ├── database/
    │   └── database.py        # Engine, session factory, Base
    ├── dependencies/
    │   └── auth.py            # FastAPI auth dependencies
    ├── middleware/
    │   ├── cors.py            # CORS configuration
    │   ├── exception_handler.py # Global exception handling
    │   ├── rate_limiter.py    # slowapi rate limiting
    │   ├── request_id.py      # X-Request-ID injection
    │   ├── request_size.py    # Body size limit
    │   └── security_headers.py # OWASP headers
    ├── models/                # SQLAlchemy ORM models
    ├── repositories/          # Data access layer (DAOs)
    ├── schemas/               # Pydantic request/response schemas
    ├── services/              # Business logic
    ├── storage/               # Storage provider abstraction
    ├── utils/                 # Shared utilities
    └── vector/                # Embedding utilities
```

### Frontend Structure

```
frontend/src/
├── main.tsx                   # React app entry point
├── App.tsx                    # Root component
├── routes/AppRouter.tsx       # React Router v6 routes
├── layouts/
│   ├── RootLayout.tsx         # Authenticated app shell (sidebar + navbar)
│   └── PublicLayout.tsx       # Unauthenticated layout
├── pages/                     # One file per route/page
├── components/
│   ├── ui/                    # Atomic UI components
│   ├── layout/                # Navbar, Sidebar, etc.
│   ├── auth/                  # Login/Register forms
│   ├── documents/             # Document cards, lists
│   ├── search/                # Search results
│   └── assistant/             # Chat bubble, conversation
├── services/                  # Axios API clients
├── store/                     # Zustand state stores
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript interfaces
└── utils/                     # Helpers (cn, formatters)
```

---

## Backend Development

### Adding a New Endpoint

Follow the **Route → Service → Repository** pattern:

#### 1. Define the Schema (`app/schemas/`)
```python
# app/schemas/example.py
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class ExampleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str

class ExampleResponse(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

#### 2. Create the Repository (`app/repositories/`)
```python
# app/repositories/example_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.example import Example

class ExampleRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, user_id: str, data: dict) -> Example:
        obj = Example(user_id=user_id, **data)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, id: str, user_id: str) -> Example | None:
        result = await self.db.execute(
            select(Example).where(Example.id == id, Example.user_id == user_id)
        )
        return result.scalar_one_or_none()
```

#### 3. Create the Service (`app/services/`)
```python
# app/services/example_service.py
from app.repositories.example_repository import ExampleRepository
from app.schemas.example import ExampleCreate

class ExampleService:
    def __init__(self, repo: ExampleRepository) -> None:
        self.repo = repo

    async def create_example(self, user_id: str, data: ExampleCreate):
        return await self.repo.create(user_id, data.model_dump())
```

#### 4. Create the Route (`app/api/routes/`)
```python
# app/api/routes/examples.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.dependencies.auth import get_current_active_user
from app.schemas.example import ExampleCreate, ExampleResponse
from app.repositories.example_repository import ExampleRepository
from app.services.example_service import ExampleService
from app.models.user import User

router = APIRouter(tags=["examples"])

@router.post("", response_model=ExampleResponse, status_code=201)
async def create_example(
    data: ExampleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ExampleResponse:
    repo = ExampleRepository(db)
    service = ExampleService(repo)
    return await service.create_example(str(current_user.id), data)
```

#### 5. Register in Router (`app/api/router.py`)
```python
from app.api.routes.examples import router as examples_router
api_router.include_router(examples_router, prefix="/api/v1/examples")
```

#### 6. Write Tests (`tests/`)
```python
# tests/test_examples_api.py
async def test_create_example(auth_client):
    response = await auth_client.post(
        "/api/v1/examples",
        json={"title": "Test", "content": "Content"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test"
```

---

### Dependency Injection Pattern

All handlers use FastAPI dependencies:

```python
# Standard auth dependency
current_user: User = Depends(get_current_active_user)

# Admin-only
current_user: User = Depends(get_current_admin_user)

# Database session
db: AsyncSession = Depends(get_db)
```

### Error Handling

Raise FastAPI `HTTPException` from service layer:
```python
from fastapi import HTTPException, status

raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Document not found"
)
```

The global exception handler in `middleware/exception_handler.py` catches all unhandled exceptions and returns a consistent JSON error format with a `request_id`.

---

## Frontend Development

### Adding a New Page

#### 1. Create the page component (`src/pages/`)
```tsx
// src/pages/ExamplePage.tsx
import { useQuery } from "@tanstack/react-query";
import { exampleService } from "@/services/exampleService";

export default function ExamplePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["examples"],
    queryFn: exampleService.list,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading data</div>;

  return (
    <div>
      {data?.items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  );
}
```

#### 2. Add the route (`src/routes/AppRouter.tsx`)
```tsx
import ExamplePage from "@/pages/ExamplePage";

// Inside the protected routes:
<Route path="/examples" element={<ExamplePage />} />
```

#### 3. Create the service (`src/services/`)
```typescript
// src/services/exampleService.ts
import { apiClient } from "./api";

export const exampleService = {
  list: async () => {
    const { data } = await apiClient.get("/api/v1/examples");
    return data;
  },
  create: async (payload: ExampleCreate) => {
    const { data } = await apiClient.post("/api/v1/examples", payload);
    return data;
  },
};
```

#### 4. Add TypeScript types (`src/types/`)
```typescript
// src/types/example.ts
export interface Example {
  id: string;
  title: string;
  content: string;
  created_at: string;
}
```

### Zustand Store Pattern

```typescript
// src/store/exampleStore.ts
import { create } from "zustand";

interface ExampleState {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export const useExampleStore = create<ExampleState>()((set) => ({
  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),
}));
```

---

## Database & Migrations

### Creating a Migration

```bash
cd backend

# Auto-generate from model changes
alembic revision --autogenerate -m "add example table"

# Or create empty migration
alembic revision -m "add example index"
```

### Migration Template

```python
# migrations/versions/010_add_examples_table.py
"""add examples table

Revision ID: abc123def456
Revises: 009_rename_audit_metadata
Create Date: 2026-07-07
"""

revision = "abc123def456"
down_revision = "009_rename_audit_metadata"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid

def upgrade() -> None:
    op.create_table(
        "examples",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("user_id", PG_UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.TIMESTAMPTZ, server_default=sa.func.now()),
    )
    op.create_index("ix_examples_user_id", "examples", ["user_id"])

def downgrade() -> None:
    op.drop_index("ix_examples_user_id", "examples")
    op.drop_table("examples")
```

### Migration Rules

- Every `upgrade()` must have a corresponding `downgrade()`
- Always test `upgrade` + `downgrade` + `upgrade` in sequence
- Never modify existing migration files after merging to main
- Always create indexes for foreign key columns

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=app --cov-report=html

# Run specific test file
python -m pytest tests/test_auth_api.py -v

# Run specific test
python -m pytest tests/test_auth_api.py::test_register_success -v

# Run with async debugging
python -m pytest tests/ -v -p asyncio_mode
```

### Writing Backend Tests

```python
# tests/test_examples_api.py
import pytest

@pytest.mark.asyncio
async def test_create_example_success(auth_client):
    """Authenticated user can create an example."""
    response = await auth_client.post(
        "/api/v1/examples",
        json={"title": "Test Example", "content": "Some content"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Example"
    assert "id" in data

@pytest.mark.asyncio
async def test_create_example_unauthenticated(client):
    """Unauthenticated request returns 401."""
    response = await client.post(
        "/api/v1/examples",
        json={"title": "Test", "content": "Content"}
    )
    assert response.status_code == 401
```

### Frontend Tests

```bash
cd frontend

npm test                # Run once
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Writing Frontend Tests

```tsx
// src/store/__tests__/exampleStore.test.ts
import { renderHook, act } from "@testing-library/react";
import { useExampleStore } from "../exampleStore";

test("sets selected ID", () => {
  const { result } = renderHook(() => useExampleStore());
  act(() => result.current.setSelectedId("abc-123"));
  expect(result.current.selectedId).toBe("abc-123");
});
```

### Test Fixtures (conftest.py)

Key fixtures available to all tests:

| Fixture | Type | Description |
|---|---|---|
| `client` | `AsyncClient` | Unauthenticated HTTP client |
| `auth_client` | `AsyncClient` | Authenticated as test user |
| `test_user` | `User` | Seeded test user object |
| `db_session` | `AsyncSession` | Database session |

---

## Code Quality

### Python (Backend)

```bash
cd backend

# Format (Black)
black app/ main.py

# Sort imports
isort app/ main.py

# Lint
flake8 app/ main.py --max-line-length=100

# Type check (advisory)
mypy app/ --ignore-missing-imports
```

### TypeScript (Frontend)

```bash
cd frontend

# Format
npx prettier --write "src/**/*.{ts,tsx,css}"

# Lint
npm run lint

# Type check
npm run type-check
```

### Pre-commit (optional local enforcement)

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
npx husky add .husky/pre-push 'cd backend && black --check app/ && cd ../frontend && npm run type-check'
```

---

## Git Workflow

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full guide.

**Quick reference:**

```bash
# Start a feature
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Commit (Conventional Commits)
git add .
git commit -m "feat(auth): add TOTP support"

# Push and open PR
git push origin feature/my-feature
# Open PR against develop on GitHub
```

---

## Adding New Features

### Checklist for New Features

- [ ] Schema defined in `app/schemas/`
- [ ] ORM model in `app/models/` with Alembic migration
- [ ] Repository in `app/repositories/`
- [ ] Service in `app/services/`
- [ ] Route in `app/api/routes/` registered in `router.py`
- [ ] Tests in `tests/` covering happy path + error cases
- [ ] Frontend service in `src/services/`
- [ ] TypeScript types in `src/types/`
- [ ] UI component/page in `src/pages/` or `src/components/`
- [ ] Route registered in `AppRouter.tsx`
- [ ] CHANGELOG.md updated

---

## API Conventions

| Convention | Rule |
|---|---|
| URL format | `kebab-case` — `/api/v1/document-types` |
| Versioning | `/api/v1/` prefix on all routes |
| Response bodies | camelCase in JSON (Pydantic alias) |
| UUIDs | Use `UUID` type, never auto-increment integers |
| Timestamps | Always `TIMESTAMPTZ` (with timezone) |
| Pagination | `page` + `page_size` (not cursor-based) |
| Errors | Always include `detail` + `code` + `request_id` |
| Status codes | 201 for POST creates, 200 for updates, 200 for deletes with body |

---

## Environment Variables

See `.env.development` for a complete annotated list of all variables.

**Key variables for local development:**

| Variable | Local Value |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/documind_ai` |
| `JWT_SECRET_KEY` | Any 32+ char string |
| `GEMINI_API_KEY` | Your real key from https://aistudio.google.com |
| `STORAGE_BACKEND` | `local` |
| `DEBUG` | `true` |
| `ENVIRONMENT` | `development` |

---

## Useful Commands

```bash
# Backend
alembic upgrade head          # Apply all migrations
alembic downgrade -1          # Roll back one migration
alembic history               # Show migration history
alembic current               # Show applied revision

# Frontend
npm run build                 # Production build
npm run preview               # Preview production build locally

# Docker
docker compose logs backend   # Backend logs
docker compose exec backend bash  # Shell into backend
docker compose exec db psql -U postgres documind_ai  # DB shell
docker compose restart backend  # Restart backend

# Scripts (Windows)
.\scripts\dev.ps1 start       # Start dev environment
.\scripts\dev.ps1 test        # Run tests
.\scripts\dev.ps1 migrate     # Run migrations
.\scripts\dev.ps1 seed        # Seed dev users
```
