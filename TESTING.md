# DocuMind AI — Testing Guide

## Overview

DocuMind AI uses a comprehensive automated testing strategy covering unit tests, integration tests, and frontend component tests.

| Layer | Framework | Coverage Target |
|---|---|---|
| Backend Unit | pytest | ≥ 85% |
| Backend Integration | pytest + real PostgreSQL | key flows |
| Frontend Unit | Vitest + Testing Library | ≥ 80% |

---

## Backend Testing

### Setup

```bash
cd backend

# 1. Create a test database
python -c "
import asyncio, asyncpg
async def main():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5432/postgres')
    await conn.execute('CREATE DATABASE documind_test')
    await conn.close()
asyncio.run(main())
"

# 2. Install dependencies
pip install -r requirements.txt
```

### Running Tests

```bash
# All tests (unit + integration)
pytest tests/

# Unit tests only (no DB — very fast)
pytest tests/test_security_utils.py tests/test_schemas.py tests/test_file_scanner.py

# Integration tests only
pytest tests/test_health.py tests/test_auth_api.py tests/test_security_api.py tests/test_documents_api.py

# With coverage report
pytest tests/ --cov=app --cov-report=html

# Open coverage report
start htmlcov/index.html   # Windows
open htmlcov/index.html    # macOS/Linux
```

### Environment Variables for Tests

| Variable | Default Value | Purpose |
|---|---|---|
| `TEST_DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/documind_test` | Test DB |
| `JWT_SECRET_KEY` | set in conftest | JWT signing key |
| `BCRYPT_ROUNDS` | `4` | Fast hashing in tests |
| `GEMINI_API_KEY` | `fake-key-for-tests` | Mocked AI key |

### Test Structure

```
backend/tests/
├── conftest.py              # Fixtures: DB setup, client, factories
├── test_security_utils.py   # Unit: hashing, JWT, tokens
├── test_schemas.py          # Unit: Pydantic schema validation
├── test_file_scanner.py     # Unit: file extension/MIME checks
├── test_health.py           # Integration: health check endpoints
├── test_auth_api.py         # Integration: full auth workflow
├── test_security_api.py     # Integration: RBAC, headers, input validation
└── test_documents_api.py    # Integration: document upload/list
```

### Architecture Notes

- **NullPool** is used for the test database engine to avoid connection reuse across asyncio event loops (Windows compatibility).
- Tables are created **once synchronously** using `asyncio.run()` before the test session starts.
- Each test gets a **rolled-back session** — state never persists between tests.
- Unit tests have **zero DB dependency** and run in under 1 second.

---

## Frontend Testing

### Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# With coverage
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Test Structure

```
frontend/src/
├── test/
│   └── setup.ts              # Global: matchMedia mock, jest-dom, cleanup
└── store/
    ├── authStore.test.ts     # Zustand auth state: setAuth, clearAuth, loading
    └── themeStore.test.ts    # Zustand theme: dark/light, DOM class toggling
```

### Writing New Tests

```tsx
// Component test example
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
```

---

## CI/CD

The GitHub Actions workflow (`.github/workflows/tests.yml`) runs:

1. **Backend tests** — Spins up a PostgreSQL service, runs all 149 tests
2. **Frontend tests** — Installs Node.js, runs Vitest with coverage
3. **Lint** — ESLint check

Triggered on: `push` to `main`/`develop`, `pull_request` to `main`/`develop`

---

## Test Counts (Milestone 11 Baseline)

| Suite | Tests | Status |
|---|---|---|
| `test_security_utils.py` | 34 | ✅ All pass |
| `test_schemas.py` | 16 | ✅ All pass |
| `test_file_scanner.py` | 18 | ✅ All pass |
| `test_health.py` | 7 | ✅ All pass |
| `test_auth_api.py` | 37 | ✅ All pass |
| `test_security_api.py` | 32 | ✅ All pass |
| `test_documents_api.py` | 5 | ✅ All pass |
| **Backend Total** | **149** | **✅ 149 pass** |
| `authStore.test.ts` | 15 | ✅ All pass |
| `themeStore.test.ts` | 11 | ✅ All pass |
| **Frontend Total** | **26** | **✅ 26 pass** |
| **Grand Total** | **175** | **✅ 175 pass** |
