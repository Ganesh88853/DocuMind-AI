# DocuMind AI — Interview Preparation Guide

> 160 technical interview questions with strong model answers based on the DocuMind AI implementation.

---

## Table of Contents

1. [Technical / System Design (20)](#1-technical--system-design)
2. [Architecture (20)](#2-architecture)
3. [Backend / FastAPI (20)](#3-backend--fastapi)
4. [React / Frontend (20)](#4-react--frontend)
5. [PostgreSQL / Database (20)](#5-postgresql--database)
6. [AI / RAG (20)](#6-ai--rag)
7. [DevOps / CI/CD (20)](#7-devops--cicd)
8. [Security (20)](#8-security)

---

## 1. Technical / System Design

**Q1: Walk me through the DocuMind AI system architecture.**

The system follows a three-tier architecture. The frontend is a React 19 SPA deployed to Vercel's global CDN. The backend is a FastAPI async REST API deployed on Render. The database is a hosted PostgreSQL 16 instance on Supabase. For AI, I use Google Gemini for text generation and sentence-transformers locally for generating search embeddings. Files are stored in Supabase Storage (S3-compatible) in production.

---

**Q2: Why did you choose FastAPI over Django or Flask?**

FastAPI has native async support which is critical for a document processing app — I can await database queries, file I/O, and external API calls without blocking the server. It also has automatic OpenAPI docs generation from Python type hints, Pydantic v2 integration for request validation, and excellent performance comparable to Node.js. Django is heavier with synchronous-first ORM, and Flask requires more manual wiring for validation and async.

---

**Q3: How does the document processing pipeline work?**

When a user uploads a file, the request goes through multipart validation and file type verification (magic bytes check, not just extension). The file is saved to storage, a database record is created with `status=processing`, then we extract text based on file type: PyPDF2 for PDFs, python-docx for DOCX, and Tesseract OCR for images. The text is chunked into overlapping segments, each chunk is converted to a 384-dimensional embedding vector using sentence-transformers, and these are stored in the database. Gemini generates a document summary. Finally the status is updated to `ready`.

---

**Q4: How would you scale DocuMind AI to handle 10,000 concurrent users?**

Four main changes: First, move document processing to a Celery + Redis background task queue so uploads return immediately and processing is async. Second, switch from in-memory rate limiting to Redis-backed counters shared across workers. Third, add pgvector for O(log n) similarity search instead of O(n) Python cosine similarity. Fourth, containerize and deploy to Kubernetes with horizontal pod autoscaling. Add a CDN (Cloudflare) for API response caching on read-heavy endpoints.

---

**Q5: Why did you use Supabase instead of a self-hosted PostgreSQL?**

For v1.0.0 the goals were: production-ready, free tier, fast to deploy. Supabase provides managed PostgreSQL 16, built-in daily backups, a storage service, connection pooling via PgBouncer, and a dashboard for monitoring — all on a free tier. Running my own PostgreSQL would require a VPS, backup management, connection pooling setup, and monitoring — significant operational overhead for a v1 project.

---

**Q6: How do you handle token expiry and refresh in your authentication flow?**

Access tokens expire in 15 minutes (JWT `exp` claim). The React frontend's Axios interceptor catches 401 responses, pauses the failing request, calls the refresh endpoint with the stored refresh token, gets a new access token (and a new refresh token — we rotate on every use), then retries the original request. Refresh tokens are stored in the `user_sessions` table with a JTI (JWT ID). On use, the old JTI is invalidated and a new one is issued, preventing refresh token replay attacks.

---

**Q7: What is the Repository pattern and why did you use it?**

The Repository pattern separates data access logic from business logic. In DocuMind, each entity has a Repository class (e.g., `AuthRepository`) responsible only for database queries. Services receive a repository instance via constructor injection and contain the business logic. This means: tests can easily mock the repository, the service is testable without a real database, and if we switch from PostgreSQL to a different store, only the repository changes.

---

**Q8: How did you implement rate limiting?**

I used `slowapi`, a FastAPI-compatible port of `flask-limiter`. It's applied as middleware with sliding window counts per IP. Different limits apply to different endpoint groups: 200 req/min globally, 10/min for auth endpoints, 20/min for uploads, 30/min for AI chat. When exceeded, the middleware returns 429 with `Retry-After` and `X-RateLimit-*` headers. Current limitation: counters are in-process memory, so not shared across workers — a known v1 limitation being addressed in v1.1.

---

**Q9: Explain your storage abstraction design.**

I defined an abstract base class `StorageProvider` with five async methods: `save`, `delete`, `exists`, `get_file`, and `generate_path`. `LocalStorageProvider` implements file system storage with path traversal protection. `SupabaseStorageProvider` implements the same interface using the Supabase SDK. A factory function `get_storage_provider()` reads the `STORAGE_BACKEND` env var and returns the right provider. No service code changes when switching backends — just an env var change.

---

**Q10: How did you design the fail-fast production configuration validator?**

In `config.py`, I added a Pydantic `@model_validator(mode="after")` that runs once when settings are loaded. In production mode, it checks: JWT secret isn't a placeholder, CORS origins don't contain localhost, Gemini API key is real, DEBUG is false, and required Supabase vars are set. If any check fails, it prints descriptive error messages and calls `sys.exit(1)`. This ensures the app refuses to start with a dangerous misconfiguration rather than silently running broken.

---

**Q11: What is semantic search and how did you implement it?**

Semantic search finds documents based on meaning, not keyword matching. When a user uploads a document, I split the text into chunks and use sentence-transformers (`all-MiniLM-L6-v2`) to convert each chunk to a 384-dimensional embedding vector stored in the database. At search time, the query is embedded using the same model, then I compute cosine similarity between the query vector and all chunk vectors, returning the top-K most similar chunks. This finds relevant content even when exact words differ — e.g., "car insurance" finds "vehicle coverage policy."

---

**Q12: How does the AI assistant generate cited responses?**

It's a RAG (Retrieval-Augmented Generation) pipeline: when the user asks a question, I first perform semantic search over their document chunks to retrieve the top-5 most relevant passages. These passages are included in the Gemini prompt as context, along with instructions to cite sources. The prompt explicitly tells the AI to answer only from the provided context and to indicate which passage each claim comes from. The source metadata (document name, chunk index, similarity score) is returned alongside the AI's answer so the frontend can display clickable citations.

---

**Q13: What testing strategy did you use?**

Three layers: Unit tests for isolated functions (JWT utilities, password hashing, schema validation). Integration tests for complete API flows using `httpx.AsyncClient` against a real test PostgreSQL database (seeded fresh for each test via `conftest.py` fixtures). Security tests verify RBAC, authentication boundaries, and response header presence. Frontend uses Vitest + React Testing Library for component and store tests. CI enforces 60% coverage minimum. Total: 149 backend + 26 frontend = 175 tests.

---

**Q14: How do you handle database migrations safely?**

Each migration file has both `upgrade()` and `downgrade()`. I tested that every migration is reversible. In CI, the backend workflow runs `alembic upgrade head`, verifies tables exist, then runs `alembic downgrade -1` and `alembic upgrade head` again to confirm idempotency. In production, migrations run automatically before the server starts via `alembic upgrade head && uvicorn ...` — if migrations fail, the deploy fails and Render keeps the previous healthy deploy running.

---

**Q15: What OWASP security controls did you implement?**

Security headers middleware adds: `X-Content-Type-Options: nosniff` (prevents MIME sniffing), `X-Frame-Options: DENY` (prevents clickjacking), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=()`. Additional controls: CORS allowlist (no wildcard), JWT-based auth with short expiry, bcrypt password hashing (12 rounds), parameterized queries via SQLAlchemy (prevents SQL injection), file type validation (magic bytes), request size limits (prevents DoS), and rate limiting. Gitleaks runs on every commit to detect accidentally committed secrets.

---

**Q16: Describe your CI/CD pipeline architecture.**

Six GitHub Actions workflows with distinct responsibilities: `tests.yml` is the primary gate (backend + frontend tests with a real PostgreSQL service container), `quality.yml` enforces formatting (Black, Prettier) and linting (Flake8, ESLint), `security.yml` runs Gitleaks (hard gate), pip-audit, npm audit, Bandit SAST, and Trivy container scanning, `docker.yml` builds images and runs a full stack smoke test, `backend.yml` runs migration integrity tests and coverage reporting, `frontend.yml` produces a build artifact. All workflows use `concurrency` groups to cancel in-progress runs on new pushes, saving CI minutes.

---

**Q17: Why async/await throughout the backend?**

FastAPI + SQLAlchemy 2.x + asyncpg creates a fully async request pipeline. When a request handler awaits a database query, the event loop can serve other requests during the I/O wait — no thread blocking. For DocuMind specifically, document processing involves multiple I/O operations: file storage, OCR, embedding generation, database writes, and Gemini API calls. Async allows the server to handle multiple uploads concurrently without needing a worker thread per request, reducing memory footprint.

---

**Q18: How did you handle Docker multi-stage builds?**

Backend: Stage 1 (`builder`) installs all pip packages into a `/install` prefix. Stage 2 (`runtime`) starts from `python:3.12-slim`, copies only the installed packages and application code, creates a non-root user (UID 1001), and runs as that user. This keeps the image small (no build tools) and secure (no root). Frontend: Stage 1 (`deps`) installs node_modules. Stage 2 (`build`) runs `npm run build`. Stage 3 (`runtime`) is `nginx:alpine` with only the built static files and nginx config — the smallest possible frontend image.

---

**Q19: What is your approach to error handling?**

Three-layer approach: FastAPI `HTTPException` for expected errors (auth failure, not found, validation). A global exception handler middleware (`add_exception_handlers`) catches all unhandled exceptions, logs them with the request ID, and returns a consistent JSON error schema `{detail, code, request_id}` instead of exposing stack traces. Pydantic v2 validation errors are caught by FastAPI's default handler and formatted consistently. The `request_id` in every error response lets support correlate client-reported errors with server logs.

---

**Q20: How did you approach production environment configuration?**

Three separate environment files: `.env.development` for local work, `.env.testing` for CI (fast bcrypt rounds, fake API keys), `.env.production.example` as a template with every required field labeled. Pydantic `BaseSettings` loads from environment variables with the `.env` file as fallback. A `@model_validator` runs at startup in production mode and calls `sys.exit(1)` with a clear error message if required variables are missing or look like dev placeholders. Render's dashboard stores secrets — they're never in source code.

---

## 2. Architecture

**Q21: Why did you use a monorepo structure?**

For a project of this scope, a monorepo simplifies developer workflow: one `git clone`, shared CI, atomic commits that span backend + frontend changes, and consistent tooling. The tradeoff is that CI must run both backend and frontend jobs on every push — mitigated by path filtering in workflows (backend changes trigger only backend jobs via `paths: ['backend/**']`).

---

**Q22: Explain the middleware stack execution order.**

FastAPI middleware is applied in LIFO (Last In, First Out) order. The last middleware added is the outermost — it executes first on request and last on response. My stack from outer to inner: `RequestIDMiddleware` (outermost — ensures every log has a request ID) → `SecurityHeadersMiddleware` → `GZipMiddleware` → `RateLimiterMiddleware` → `RequestSizeMiddleware` → `CORSMiddleware` (innermost — handles preflight before rate limiting kicks in).

---

**Q23: Why separate layers (Route → Service → Repository)?**

Separation of concerns: Routes handle HTTP protocol concerns (request parsing, response formatting, status codes). Services contain business rules (password strength checks, authorization logic, orchestration of multiple repositories). Repositories contain only database queries with no business logic. This means each layer is independently testable, responsibilities are clear, and changing the database only requires updating repositories.

---

**Q24: How does the frontend handle authentication state across page refreshes?**

Zustand's `authStore` persists to `localStorage` via the `persist` middleware. The access token and user object are stored. On page load, the store is rehydrated from localStorage. If the access token is expired, the Axios interceptor catches the first 401, calls the refresh endpoint, stores the new tokens, and retries. If refresh also fails (expired/revoked), the user is redirected to login and the store is cleared.

---

**Q25: Describe your database connection pooling strategy.**

SQLAlchemy's async engine with `pool_size=5` and `max_overflow=10` maintains a pool of 5 persistent connections with up to 10 overflow connections. `pool_pre_ping=True` tests connections before using them (handles stale connections after DB restart). In production with Supabase, I use the Transaction Pooler (port 6543) which sits in front of PostgreSQL and manages connections more aggressively — critical for serverless environments where many short-lived processes connect.

---

**Q26: How would you add WebSocket support for real-time document processing updates?**

FastAPI natively supports WebSockets. I'd add a WebSocket endpoint at `/ws/documents/{document_id}/status`. The client connects after uploading. The backend emits status events as the document processes. A connection manager (in-memory dict for v1, Redis pub/sub for multi-worker) maps document IDs to WebSocket connections. The processing pipeline sends events at each stage completion. On disconnect, the connection is cleaned up.

---

**Q27: Why did you choose TanStack Query for server state?**

TanStack Query provides: automatic background refetching (stale-while-revalidate), cache invalidation (after a mutation, invalidate the list query), loading/error states without boilerplate, request deduplication (two components requesting the same data share one request), and optimistic updates. The alternative (manual `useEffect` + `useState`) creates race conditions and requires reimplementing caching manually.

---

**Q28: What is the application factory pattern and why use it?**

The `create_application()` function in `main.py` constructs the FastAPI instance, registers middleware, registers routers, and attaches lifecycle hooks. It returns the configured app rather than creating it at module level. Benefits: enables unit testing by creating isolated app instances with different configurations, makes the initialization flow explicit and inspectable, and prevents global state issues.

---

**Q29: How does request tracing work?**

`RequestIDMiddleware` runs first. It reads `X-Request-ID` from the incoming request or generates a UUID4 if absent. It's stored in a `contextvars.ContextVar` for the duration of the request, making it available to any log call without passing it explicitly. The logging formatter includes it in every log line. The same ID is returned in the response header. This means you can search Render logs by `request_id` and see the complete request lifecycle — middleware, handler, service, repository, all tagged.

---

**Q30: How does the frontend router handle protected routes?**

`AppRouter.tsx` uses React Router v6 with a `ProtectedRoute` component. It reads the auth state from `useAuthStore()`. If `user` is null, it redirects to `/login` using `<Navigate>`. If `user` exists, it renders the child route. The Zustand store is initialized from `localStorage` synchronously before the router renders, so there's no flash of the login page for authenticated users.

---

**Q31: How would you implement multi-tenancy (team workspaces)?**

Add a `workspaces` table and a `workspace_members` join table with roles. Every resource table (`documents`, `conversations`, etc.) gets a `workspace_id` foreign key. All repository queries add `WHERE workspace_id = $1 AND (user is member of workspace)`. The JWT payload includes the user's workspace context. Row-Level Security in PostgreSQL can enforce this at the DB level as an additional safety net. This is planned for v1.3.0.

---

**Q32: Why Pydantic v2 over v1?**

Pydantic v2 rewrote the core in Rust, giving 5–50× faster validation. It also introduced `model_validator`, `field_validator` with clearer decorator syntax, `model_config = {}` replacing the inner `Config` class, and better support for `from_attributes=True` (ORM mode). The `BaseSettings` split to `pydantic-settings` is a minor inconvenience but overall v2 is significantly better for production use.

---

**Q33: Describe the document chunk and embedding storage design.**

Each document is split into ~500-character chunks with 50-character overlap (configurable). Each chunk gets its own row in `document_chunks` with: `document_id`, `chunk_index`, `content` (raw text), and `embedding` (the 384-dim vector serialized as JSON or pgvector column). At search time, the query embedding is compared against all chunks in the user's document library. The chunk's `document_id` and `chunk_index` let us show which document and roughly which section the match came from.

---

**Q34: How does the AI assistant maintain conversation context?**

Each conversation has a list of messages with `role` (user/assistant) and `content`. When the user sends a new message, the handler loads the last N messages from the database, prepends them as conversation history in the Gemini prompt, then adds the new question. This gives the AI context about previous exchanges — it can answer follow-up questions that reference earlier parts of the conversation ("What did you mean by that?").

---

**Q35: How would you add streaming responses from Gemini?**

FastAPI supports `StreamingResponse`. I'd change the Gemini call to use the streaming SDK method (`generate_content_stream`), which yields tokens as they're generated. In the route, I'd return a `StreamingResponse` with `media_type="text/event-stream"`. The frontend would use the EventSource API or axios with `onDownloadProgress` to update the chat UI as tokens arrive, similar to ChatGPT's streaming UX. The completed message would still be saved to the database at the end.

---

**Q36: What are the trade-offs of synchronous vs async document processing?**

Current (synchronous): Simple, predictable, easy to debug. User waits for processing to complete. Works fine for documents < 5MB. Problem: long uploads block the response for 30+ seconds, risk of request timeout.

Async (Celery): Upload returns immediately with `{status: "processing"}`, frontend polls for completion. More complex: requires a Celery worker process, Redis broker, task status tracking, failure retry logic. But it scales naturally and doesn't block user requests.

---

**Q37: How does your Docker networking work?**

Docker Compose creates an internal bridge network. Backend, frontend, postgres, and redis containers are on this network and can reach each other by service name (e.g., `postgres:5432`). Only Nginx is exposed to the host on ports 80/443. This means postgres and redis are never directly accessible from outside the Docker network — Nginx is the only entry point. In production, Render and Supabase manage their own networking — Docker is used for development only.

---

**Q38: Explain your approach to error recovery in the frontend.**

TanStack Query's `retry: 3` automatically retries failed requests with exponential backoff. I have an Axios interceptor that handles 401 (token refresh) and 429 (rate limit — shows a toast and waits for `Retry-After`). For 5xx errors, the UI shows a user-friendly error message with a retry button rather than a raw error code. Network failures (offline) are handled by TanStack Query's `networkMode: 'offlineFirst'` setting — queries don't fail immediately when offline.

---

**Q39: Why did you choose Zustand over Redux for state management?**

Zustand is significantly simpler — no actions, reducers, or boilerplate. For DocuMind's needs (auth state, theme, UI state), the stores are under 50 lines each. Zustand's `persist` middleware handles localStorage serialization. Devtools integration works out of the box. Redux would be appropriate for a much more complex state graph with many interconnected domains. For a SaaS app's auth and UI state, Zustand is the right tool.

---

**Q40: How do you prevent N+1 query problems in your repositories?**

Using SQLAlchemy's `selectinload` and `joinedload` options on relationships. For example, loading a list of documents with their chunk counts uses a single query with a subquery count, not N queries. The Repository pattern centralizes data access — if an N+1 is introduced, it's isolated to one place. I also use `EXPLAIN ANALYZE` on slow queries to identify missing indexes or full table scans.

---

## 3. Backend / FastAPI

**Q41: What is a FastAPI dependency and how does it work?**

Dependencies are functions that FastAPI resolves before calling route handlers. They can be injected into handlers, middleware, or other dependencies. I use them for: authentication (`get_current_active_user`), database sessions (`get_db`), rate limiting, and pagination parameters. FastAPI resolves the dependency graph automatically — if two handlers need the same dependency, it's created once per request and shared.

---

**Q42: How does `Depends(get_db)` work?**

`get_db` is an async generator. It yields an `AsyncSession`, the handler runs using that session, then the generator's cleanup code (commit or rollback, then close) runs in the `finally` block. FastAPI manages this via Python's context manager protocol — the session is always cleaned up even if the handler raises an exception. This ensures no connection leaks.

---

**Q43: How do you write async tests with pytest?**

I use `pytest-asyncio` with `asyncio_mode = "auto"` in `pyproject.toml`. Test fixtures for the HTTP client use `httpx.AsyncClient` with the FastAPI `app` as the transport. The test database is a real PostgreSQL instance (created in CI as a service container). `conftest.py` creates all tables before tests and drops them after (using `Base.metadata.create_all` on the async engine). Each test function is `async def` and `await`s the client calls.

---

**Q44: How does Pydantic v2 validate incoming requests?**

FastAPI automatically validates request bodies against the declared Pydantic model. If validation fails, FastAPI returns 422 with a detailed JSON error showing which field failed and why — without any handler code. `field_validator` decorators add custom rules (e.g., password strength). `model_validator` runs after all fields are set (e.g., checking `password == password_confirm`). The validation runs entirely in Python/Rust before the handler is called.

---

**Q45: How do you implement pagination in FastAPI?**

```python
@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    ...
):
    offset = (page - 1) * page_size
    total = await repo.count(user_id)
    items = await repo.list(user_id, offset=offset, limit=page_size)
    return DocumentListResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=ceil(total / page_size)
    )
```

Query params with defaults and validation via `Query()`. The repository uses `OFFSET + LIMIT`.

---

**Q46: Explain Python's GIL and how async helps.**

The GIL (Global Interpreter Lock) prevents true multi-threaded execution of Python bytecode. However, it's released during I/O operations (network, disk, database). Async programming with `asyncio` takes advantage of this — when awaiting an I/O operation, the event loop can run other coroutines. For a web API that spends most time waiting for database and external API responses, async provides near-thread-level concurrency without the complexity of threads. CPU-bound work (OCR, embedding generation) would still need multiprocessing.

---

**Q47: How do you configure SQLAlchemy for async operation?**

```python
engine = create_async_engine(
    DATABASE_URL,  # Must be postgresql+asyncpg://...
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)
```

Key points: URL must use the `asyncpg` driver. `AsyncSession` instead of `Session`. All queries must be `await`ed. `expire_on_commit=False` prevents lazy loading issues after commit.

---

**Q48: How do you handle file upload security?**

Four layers: File extension allowlist (PDF, DOCX, image types). File size limit (50MB, enforced before reading the file). MIME type validation (Content-Type header). Magic byte verification (read the first bytes and check against known file signatures). This prevents: oversized files, renamed executable files (.exe renamed to .pdf), and client MIME type spoofing.

---

**Q49: What is Alembic and how do you use it?**

Alembic is a database migration tool for SQLAlchemy. It maintains a `alembic_version` table tracking which migrations have been applied. Migration files have `upgrade()` (schema changes) and `downgrade()` (reversals). I configure it to use SQLAlchemy's async engine via a synchronous runner in `env.py`. `alembic revision --autogenerate` compares the current DB schema against ORM models and generates a migration automatically. `alembic upgrade head` applies all pending migrations.

---

**Q50: How does BCrypt hashing work and why 12 rounds?**

BCrypt applies a key derivation function that is intentionally slow — controlled by the work factor (rounds). `rounds=12` means 2^12 = 4096 iterations, taking ~300ms per hash on modern hardware. This makes brute-force attacks expensive. The hash includes the salt, so identical passwords produce different hashes. In testing I use `rounds=4` (~10ms) to keep tests fast. The 12-round production setting makes cracking a million passwords take years on typical hardware.

---

**Q51: How do you structure logging in production?**

`setup_logging()` configures Python's standard logging with a custom formatter that outputs JSON-structured logs. Every log includes: timestamp, level, logger name, message, and any `extra` kwargs. The `RequestIDMiddleware` stores the request ID in a `ContextVar` and the logging filter adds it to every log record automatically. In Render, all stdout/stderr is captured and searchable. Log level is `INFO` in production — `DEBUG` would log every SQL query (too noisy).

---

**Q52: How does the RBAC (Role-Based Access Control) work?**

Users have a `role` field: `user` or `admin`. The `get_current_admin_user` dependency calls `get_current_active_user` first, then checks `user.role == "admin"`. If not admin, it raises 403 Forbidden. Admin routes are grouped under `/api/v1/admin` and use this dependency. Resource ownership is enforced separately — even admins can only access their own documents (separate check). Admins can access audit logs and user lists.

---

**Q53: What is `pool_pre_ping=True` in SQLAlchemy?**

Before handing out a pooled connection, SQLAlchemy sends a cheap `SELECT 1` query to verify the connection is still alive. This catches stale connections (the database restarted, network timed out the idle connection, etc.) and refreshes them transparently. Without this, the application would crash with a connection error on the first request after the database restarts.

---

**Q54: How do you test endpoints that require authentication?**

`conftest.py` creates an `auth_client` fixture: it registers a test user via the API, captures the returned access token, and sets it as the default `Authorization: Bearer <token>` header on the `httpx.AsyncClient`. Tests that need auth use `auth_client` instead of the plain `client`. This tests the full auth flow, not just injecting a mock user.

---

**Q55: How does GZip compression work in your middleware?**

FastAPI's built-in `GZipMiddleware` checks the `Accept-Encoding: gzip` header on responses. If the response body exceeds `minimum_size=1024` bytes (1KB), it compresses the body and adds `Content-Encoding: gzip`. Small responses (JSON with one field) aren't compressed to avoid the CPU overhead for negligible savings. API list responses (many documents) benefit most.

---

**Q56: What is `expire_on_commit=False` in SQLAlchemy?**

By default, after a commit SQLAlchemy marks all ORM objects as "expired" — accessing any attribute triggers a new SELECT query. For async code, this is problematic because the session may already be closed. `expire_on_commit=False` keeps the object's attribute values accessible after commit without a DB round-trip. The tradeoff is that you might read stale values if other transactions modify the row — acceptable for a request-scoped session where the object was just written.

---

**Q57: How would you add request validation for query parameters?**

FastAPI uses `Query()` for query parameter validation:
```python
search: str = Query(None, min_length=1, max_length=200),
page: int = Query(1, ge=1),
page_size: int = Query(20, ge=1, le=100),
```
Pydantic validates these automatically — invalid values return 422. For complex filter objects, you can use a Pydantic model as a `Depends()`.

---

**Q58: What is the difference between `@app.on_event` and lifespan?**

`@app.on_event("startup"/"shutdown")` is the older API, deprecated in newer FastAPI. The modern approach is `@asynccontextmanager` lifespan: code before `yield` runs on startup, code after runs on shutdown. This is cleaner (one function, no decorators) and integrates better with testing. DocuMind uses the older API for simplicity in v1.0, with migration to lifespan planned.

---

**Q59: How do you handle `ValidationError` from Pydantic in a route?**

FastAPI automatically catches `RequestValidationError` (which wraps Pydantic's `ValidationError` for request bodies) and returns a 422 response. My global exception handler overrides the default format to include a `request_id` and `code: "VALIDATION_ERROR"` for consistent client error handling. I don't catch `ValidationError` manually in handlers — that's the framework's job.

---

**Q60: What is `asyncpg` and why use it over `psycopg2`?**

`asyncpg` is a fully async PostgreSQL driver written from scratch for Python asyncio — it doesn't use SQLAlchemy's thread-based async shim. It's the fastest Python PostgreSQL driver (2–3× faster than psycopg2 in benchmarks) because it uses PostgreSQL's binary protocol and has no GIL-related overhead. `psycopg2` is synchronous — using it with async SQLAlchemy requires `greenlet` and thread pool overhead. `asyncpg` is the correct choice for async FastAPI applications.

---

## 4. React / Frontend

**Q61: Why React 19 and what new features did you use?**

React 19 introduced: `use()` hook for reading promises and context, actions for form handling, `useOptimistic` for optimistic UI updates, and improved server component support. In DocuMind I primarily use the stable concurrent rendering features from React 18 that carried forward. The upgrade ensures we're on the latest security patches and sets us up for future React Server Components if we migrate to Next.js.

---

**Q62: How does Vite differ from Create React App?**

Vite uses ES modules natively in development (no bundling during dev = instant startup) and only bundles for production (using Rollup). CRA used webpack for both dev and production — slow start times for large projects. Vite's HMR (Hot Module Replacement) is near-instant because only the changed module is updated, not the entire bundle. Build times are 10–30× faster. Vite also has first-class TypeScript support without configuration.

---

**Q63: Explain TanStack Query's stale-while-revalidate strategy.**

When data is fetched, it's cached with a `staleTime` (default: 0). On the next render of the same query, if the data is stale, the cached data is returned immediately (no loading state) while a background fetch updates the cache. When the new data arrives, the component re-renders with fresh data. For DocuMind's document list, this means the user sees their documents instantly, even after navigation, while fresh data loads silently.

---

**Q64: How does the Axios interceptor handle token refresh?**

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { refresh_token } = useAuthStore.getState();
      const { data } = await axios.post("/api/v1/auth/refresh", { refresh_token });
      useAuthStore.getState().setTokens(data);
      error.config.headers.Authorization = `Bearer ${data.access_token}`;
      return api(error.config);  // Retry original request
    }
    return Promise.reject(error);
  }
);
```

The `_retry` flag prevents infinite loops if refresh also fails.

---

**Q65: Why Tailwind CSS over custom CSS or CSS Modules?**

Tailwind's utility-first approach eliminates context switching between HTML and CSS files. Design tokens (colors, spacing, typography) are defined in `tailwind.config.js` and available as classes — no naming conventions needed. The JIT compiler generates only the CSS classes actually used, keeping the production bundle tiny. The main tradeoff: className strings can be verbose (`className="flex flex-col gap-4 rounded-lg bg-gray-900 p-6 shadow-xl"`). Tools like `clsx` and `cn` utilities manage conditional classes cleanly.

---

**Q66: How do you type API responses in TypeScript?**

I define interfaces in `src/types/` mirroring the Pydantic schemas:
```typescript
interface Document {
  id: string;
  original_filename: string;
  status: "processing" | "ready" | "error";
  file_size_bytes: number;
  created_at: string;
}
```
Services return `Promise<Document>`. TanStack Query infers the type from the `queryFn`. This gives full type safety in components — accessing a non-existent field is a compile error.

---

**Q67: What is Zod and how do you use it for form validation?**

Zod is a TypeScript-first schema validation library. I define schemas that mirror the backend Pydantic schemas:
```typescript
const registerSchema = z.object({
  full_name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  password_confirm: z.string(),
}).refine((d) => d.password === d.password_confirm, {
  message: "Passwords must match",
  path: ["password_confirm"],
});
```
React Hook Form's `zodResolver` integrates this with form state — validation runs on change and on submit.

---

**Q68: How do you handle loading and error states consistently?**

All data-fetching pages follow the same pattern:
```tsx
const { data, isLoading, error } = useQuery(...)

if (isLoading) return <LoadingSkeleton />
if (error) return <ErrorState message={error.message} onRetry={refetch} />
if (!data?.items.length) return <EmptyState />
return <DataList items={data.items} />
```
`LoadingSkeleton`, `ErrorState`, and `EmptyState` are shared components ensuring consistent UX across the app.

---

**Q69: What is the purpose of `useAuthStore` and what does it store?**

```typescript
interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  login: (tokens: TokenResponse) => void;
  logout: () => void;
  setUser: (user: User) => void;
}
```
It's the single source of truth for auth state. Persisted to localStorage so auth survives page refresh. The `isAuthenticated` derived value drives protected routes. `logout()` clears state and localStorage, then redirects.

---

**Q70: How do you structure components for reusability?**

Three-tier component hierarchy: `ui/` contains atomic, unstyled or minimally styled primitives (Button, Input, Card, Modal, Badge) with full prop type definitions. `layout/` contains Navbar, Sidebar, and page shells. Feature components in `auth/`, `documents/`, `search/` are composed from `ui/` components and contain feature-specific logic. Pages compose feature components and connect to data services. This prevents prop drilling and keeps components focused.

---

**Q71: How does React Router v6 differ from v5?**

Key differences: `Routes` replaces `Switch` (no more `exact` prop — matching is always exact). `<Outlet>` for nested routes (layouts). `useNavigate` replaces `useHistory`. `loader` and `action` for data loading (though I use TanStack Query instead). Route definitions can be nested to reflect the URL structure. This lets me define `RootLayout` as a wrapper route that all authenticated pages render inside.

---

**Q72: How do you optimize the React build for production?**

Vite automatically: code-splits by route (each page is a separate chunk, loaded on navigation), tree-shakes unused code, minifies with terser, and generates content-hashed filenames for long-term caching. Tailwind's JIT removes unused CSS. The Vercel deployment adds Brotli compression and serves assets from the edge CDN closest to the user.

---

**Q73: How do you implement dark mode?**

Zustand `themeStore` tracks `theme: "light" | "dark"`, persisted to localStorage. A `ThemeToggle` component calls `useThemeStore.setTheme()`. In `main.tsx`, on app load, the store rehydrates from localStorage and applies the theme class to `document.documentElement`. Tailwind's `darkMode: "class"` generates `dark:` variants. The `RootLayout` applies `dark` class to the root element based on the theme store.

---

**Q74: What is framer-motion used for in DocuMind?**

Framer Motion provides the micro-animations: page transition fades, card hover effects, modal slide-in/out, loading skeleton pulse animations, and the AI chat message appear animation. These are defined as `motion.div` with `initial`, `animate`, and `exit` props. The animations make the interface feel responsive and premium without being distracting.

---

**Q75: How do you handle multi-file upload with progress?**

The upload endpoint accepts single files. For multiple uploads, the frontend calls the upload endpoint in parallel using `Promise.all`. Each upload gets its own TanStack Mutation instance tracking `isPending` state. A progress indicator per file is shown using `axios`'s `onUploadProgress` callback which provides loaded/total bytes.

---

**Q76: How does TypeScript's strict mode affect development?**

`"strict": true` in `tsconfig.json` enables: `noImplicitAny` (all variables must be typed), `strictNullChecks` (null/undefined are not assignable to non-null types), `strictFunctionTypes`, and others. This catches many bugs at compile time — accessing a possibly-null value, passing wrong argument types, missing return statements. The cost is more type annotations, but the safety is worth it.

---

**Q77: How do you prevent XSS in the frontend?**

React escapes all values rendered via JSX by default — `{userContent}` never renders as HTML. For user-generated content shown as text, React's escaping is sufficient. If I ever need to render HTML (e.g., AI response formatting), I'd use `DOMPurify` to sanitize before using `dangerouslySetInnerHTML`. The backend also sets `X-Content-Type-Options: nosniff` preventing MIME sniffing attacks.

---

**Q78: What are Radix UI primitives and why use them?**

Radix UI provides unstyled, accessible UI primitives: Dialog, DropdownMenu, Tooltip, ScrollArea. They handle: keyboard navigation (Tab, Arrow keys, Escape), ARIA attributes, focus trapping in modals, and screen reader announcements — correctly, per WAI-ARIA spec. I style them with Tailwind. This gives accessible, keyboard-navigable components without building the accessibility behavior from scratch.

---

**Q79: How do you handle environment variables in Vite?**

Variables prefixed with `VITE_` are inlined into the JS bundle at build time. They're accessed via `import.meta.env.VITE_API_BASE_URL`. Unlike Node.js `process.env`, Vite replaces these statically at build time. This means: the bundle is immutable per environment (different Vercel deployments for prod/preview have different values baked in), and no runtime secrets can be kept in frontend code — all `VITE_` variables are visible in the browser.

---

**Q80: What testing library do you use for the frontend and why?**

Vitest + React Testing Library. Vitest is Vite-native — tests run in the same environment as the app, with compatible TypeScript support and no babel configuration. React Testing Library encourages testing from the user's perspective (click buttons, check text) rather than implementation details (internal state, component structure). The philosophy: test what the user sees and does, not how the component is built internally.

---

## 5. PostgreSQL / Database

**Q81: What is a transaction and how does SQLAlchemy manage them?**

A transaction groups multiple SQL operations that either all succeed or all fail (ACID). SQLAlchemy's session manages transactions automatically. In `get_db()`, a session is created, the handler runs, and if no exception occurs `session.commit()` is called. If an exception occurs, `session.rollback()` is called. This ensures: if inserting a user succeeds but inserting the audit log fails, the entire operation rolls back — no partial data.

---

**Q82: What indexes did you create and why?**

Every foreign key gets an index (`ix_documents_user_id`, `ix_user_sessions_user_id`, etc.) because FK columns are used in `WHERE user_id = ?` queries on every authenticated request. Email gets a unique index for login lookups. The audit log gets a composite index on `(user_id, timestamp)` for filtered admin queries. Without indexes, these would be full table scans — O(n) instead of O(log n).

---

**Q83: What is the difference between `TIMESTAMPTZ` and `TIMESTAMP` in PostgreSQL?**

`TIMESTAMP` stores a naive datetime with no timezone. `TIMESTAMPTZ` (timestamp with timezone) normalizes to UTC internally and converts to the session timezone on output. For a multi-user web app serving users in different timezones, `TIMESTAMPTZ` is always correct — all timestamps are stored in UTC and compared correctly regardless of where the user is. I use `TIMESTAMPTZ` everywhere.

---

**Q84: What is connection pooling and why does it matter?**

Opening a PostgreSQL connection is expensive (~5–10ms, creates a new OS process). Connection pooling maintains a pool of open connections that are reused across requests. Without pooling, a server handling 100 req/s would need 100 simultaneous connections (or queue requests). With a pool of 5 connections, 100 requests share those 5 connections — the pool queues requests when all connections are busy. Supabase's Transaction Pooler (PgBouncer) manages this at the infrastructure level.

---

**Q85: How do UUID primary keys compare to auto-increment integers?**

UUIDs are globally unique, making them safe to generate in the application layer before insert (no DB round-trip to get the new ID). They don't expose record counts (no "user #1234" enumeration attack). They're safe for distributed systems where multiple nodes insert records. Downside: 16 bytes vs 4 bytes for int, slightly less cache-friendly for index traversal, harder to debug manually. For a multi-tenant SaaS, UUIDs are the correct choice.

---

**Q86: What is the N+1 query problem?**

If you query a list of 20 documents and then access `document.chunks` for each (triggering 20 separate `SELECT chunks WHERE document_id=?` queries), that's 21 queries total (1 list + 20 detail = N+1). SQLAlchemy's `selectinload(Document.chunks)` resolves this: one `SELECT documents` query, then one `SELECT chunks WHERE document_id IN (id1, id2, ...)` query — 2 queries total. Critical for list endpoints.

---

**Q87: How does Alembic handle migrations in a team environment?**

Each developer creates migration files with a unique `Revision ID` (UUID-like hash). Alembic maintains a DAG of revisions. When two developers create migrations from the same base, they create a "branch" — Alembic detects this and requires merging. The CI migration test ensures migrations apply cleanly from scratch. We never modify migration files after merging to main — if a change is needed, a new migration is created.

---

**Q88: What is `EXPLAIN ANALYZE` and how do you use it?**

```sql
EXPLAIN ANALYZE SELECT * FROM documents 
WHERE user_id = 'abc' ORDER BY created_at DESC LIMIT 20;
```

It shows the query execution plan (what indexes are used, estimated vs actual row counts, time per step). If I see `Seq Scan` (sequential/full table scan) on a large table instead of `Index Scan`, I add the missing index. The output shows the cost of each operation — expensive operations are optimization targets.

---

**Q89: How does PostgreSQL handle JSONB vs JSON?**

`JSON` stores the raw text verbatim. `JSONB` stores a binary representation — compressed and indexable with GIN indexes. JSONB queries are faster (no need to re-parse text). I use `JSON` for `audit_logs.extra_data` (infrequently queried, rarely filtered) and `documents.metadata` (read-only storage). If we needed to query `WHERE metadata->>'page_count' > 10`, switching to JSONB + GIN index would be necessary.

---

**Q90: What is row-level security (RLS) in PostgreSQL?**

RLS attaches security policies directly to tables. For example:
```sql
CREATE POLICY users_own_documents ON documents
  USING (user_id = current_setting('app.user_id')::uuid);
```
Every SELECT/INSERT/UPDATE/DELETE on `documents` is automatically filtered by this policy. Even if application code has a bug that forgets to filter by `user_id`, the database rejects cross-user access. Supabase uses RLS extensively. Planned for DocuMind v1.3.0 team workspaces.

---

**Q91: How do you handle database schema versioning?**

Alembic tracks the current revision in the `alembic_version` table. Each migration file records `revision` (current) and `down_revision` (parent). Running `alembic upgrade head` applies all unapplied migrations in topological order. `alembic history` shows the full migration lineage. The migration files are committed to git — the schema is versioned alongside the code.

---

**Q92: What is `pool_pre_ping` and when does it matter?**

Without `pool_pre_ping`, if the database restarts, all existing pooled connections are broken. The first request after restart gets a "connection closed" error. With `pool_pre_ping=True`, before handing out a connection, SQLAlchemy pings it — if it's dead, it's discarded and a fresh connection is created. This adds a tiny overhead per request (~1ms) but prevents connection errors after database restarts or network interruptions.

---

**Q93: How would you implement full-text search in PostgreSQL?**

```sql
-- Add a tsvector column
ALTER TABLE documents ADD COLUMN search_vector tsvector;
UPDATE documents SET search_vector = to_tsvector('english', extracted_text);
CREATE INDEX idx_documents_fts ON documents USING GIN(search_vector);

-- Query
SELECT * FROM documents
WHERE search_vector @@ plainto_tsquery('english', 'tax deductions')
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'tax deductions')) DESC;
```

FTS handles stemming (finds "running" when searching "run") and stop words. It's less powerful than semantic search for meaning-based queries but faster and simpler.

---

**Q94: What is an async database session and how does it differ from sync?**

A sync session uses a blocking connection — while waiting for a DB response, the thread is blocked. FastAPI with sync sessions needs a thread pool (default 40 threads) to handle concurrent requests. An async session with asyncpg uses Python's event loop — awaiting a DB query yields control to the event loop, which runs other coroutines while waiting. One thread can handle many concurrent DB operations, reducing memory and OS thread overhead significantly.

---

**Q95: How do you prevent SQL injection with SQLAlchemy?**

SQLAlchemy's ORM and Core both use parameterized queries — user values are never concatenated into SQL strings. Even raw SQL via `text()` uses `:param` style binding:
```python
await db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})
```
The database driver sends the query and parameters separately — the database executes the parameterized query, making injection impossible.

---

**Q96: Explain the difference between `scalar_one_or_none()` and `scalars().all()`.**

`scalar_one_or_none()` expects either 0 or 1 results — returns the ORM object or `None`. Raises `MultipleResultsFound` if more than one row matches. Used for single-entity lookups (get by ID or email). `scalars().all()` returns a list of all matching rows. Used for list queries. `scalar_one()` raises `NoResultFound` if the row doesn't exist — use when you're certain the row must exist.

---

**Q97: How does foreign key cascading work in your schema?**

All user-owned tables have `ON DELETE CASCADE` foreign keys pointing to `users.id`. Deleting a user automatically deletes their documents, sessions, audit logs, conversations, etc. Similarly, `document_chunks` cascade from `documents`. This ensures referential integrity without manual cleanup code and prevents orphaned records.

---

**Q98: What is a database migration downgrade strategy?**

Every `upgrade()` must have a corresponding `downgrade()`. Destructive migrations (dropping columns, tables) are particularly tricky — once dropped, data is gone. Strategy: for column drops, first deploy a version that ignores the column (application no longer reads/writes it), then in the next release drop the column. This "expand-contract" pattern allows zero-downtime schema changes.

---

**Q99: How would you implement audit logging at the database level?**

Using PostgreSQL triggers:
```sql
CREATE OR REPLACE FUNCTION audit_documents()
RETURNS trigger AS $$
BEGIN
  INSERT INTO document_audit_log (document_id, action, changed_by, changed_at)
  VALUES (NEW.id, TG_OP, current_setting('app.user_id'), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_audit
AFTER INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION audit_documents();
```

In DocuMind v1, I use application-level audit logging (inserting into `audit_logs` from the service layer) for more control over what's logged.

---

**Q100: How do you handle database migrations in a CI/CD pipeline?**

In `backend.yml`, a dedicated `migrations` job: creates a fresh database, runs `alembic upgrade head`, verifies expected tables exist with a Python script, runs `alembic downgrade -1` to test the downgrade, then `alembic upgrade head` again to verify idempotency. This runs on every PR — migration regressions are caught before merge. In production, migrations run as part of the startup command before the server accepts traffic.

---

## 6. AI / RAG

**Q101: What is RAG (Retrieval-Augmented Generation)?**

RAG combines retrieval (finding relevant information) with generation (LLM response). Instead of relying on the LLM's training data, RAG retrieves relevant context from your own documents and includes it in the prompt. The LLM generates an answer based on that specific context. Benefits: the AI can answer questions about private/recent documents not in its training data, responses are grounded in facts (less hallucination), and sources can be cited.

---

**Q102: Why split documents into chunks for embedding?**

LLMs and embedding models have token limits. A 50-page PDF might be 100,000 tokens — too long for a context window. Chunking splits the document into smaller segments (e.g., 500 characters with 50-character overlap). Each chunk is embedded separately. At query time, we retrieve only the most relevant chunks (top-K), keeping the context concise and focused. Overlap prevents important content at chunk boundaries from being lost.

---

**Q103: What embedding model did you use and why?**

`sentence-transformers/all-MiniLM-L6-v2`: a 22M parameter model that produces 384-dimensional embeddings. It's fast (runs on CPU in ~10ms per chunk), accurate enough for semantic retrieval, and open-source (no API cost). The tradeoff vs larger models: slightly less accuracy on complex semantic relationships. For DocuMind's use case (document Q&A in business contexts), it performs well. OpenAI's text-embedding-ada-002 would be an alternative (higher quality, has API cost).

---

**Q104: What is cosine similarity and how do you compute it?**

Cosine similarity measures the angle between two vectors — independent of magnitude. Value ranges 0–1 (1 = identical direction = very similar meaning). Formula: `cos(θ) = (A·B) / (|A| × |B|)`. In NumPy:
```python
import numpy as np
def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr = np.array(a)
    b_arr = np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))
```
I compute this for every chunk against the query embedding and sort by score.

---

**Q105: How does Google Gemini compare to GPT-4?**

Gemini 2.5 Flash Lite: fast, low cost, good for retrieval-augmented Q&A. GPT-4: higher reasoning capability, larger context window, more expensive. For DocuMind's use case — generating answers from retrieved context — Gemini Flash performs well at much lower cost. The model selection is configurable via `GEMINI_MODEL` env var, so switching to a different model (including GPT-4 via OpenAI SDK) would require minimal code changes.

---

**Q106: What are the limitations of embedding-based semantic search?**

1. **Vocabulary mismatch**: If training data didn't include domain-specific terms, embeddings may not capture their meaning well.
2. **Exact number/date lookup**: Embeddings find semantic similarity — searching "Q3 2024 revenue" may match "third quarter 2024 earnings" but miss exact numeric matches. Hybrid search (semantic + keyword) is better.
3. **Long documents**: Each chunk is embedded independently — context that spans multiple chunks may be split.
4. **Cold start**: Embeddings must be generated during upload — no instant search for new documents.
5. **Scale**: Python cosine similarity is O(n) — slow for millions of chunks. pgvector with HNSW indexing solves this.

---

**Q107: How would you implement hybrid search (semantic + keyword)?**

Hybrid search combines semantic similarity with BM25 keyword scoring:
```python
# Semantic score from embeddings
semantic_results = cosine_search(query_embedding, top_k=20)

# Keyword score from PostgreSQL FTS
keyword_results = fts_search(query_text, top_k=20)

# Reciprocal Rank Fusion
for result in all_results:
    result.score = (1/semantic_rank) + (1/keyword_rank)
results.sort(key=lambda r: r.score, reverse=True)
```

RRF combines ranks from both systems without needing to normalize scores.

---

**Q108: What is prompt engineering and how did you use it?**

Prompt engineering is designing the text instructions sent to the LLM to get desired output. In DocuMind's assistant:
```
System prompt: "You are a helpful assistant that answers questions based ONLY on the provided documents. 
If the answer is not in the documents, say so. Always cite the source document and passage number."

User: [context chunks] + [conversation history] + [user question]
```

Key techniques: explicit grounding instruction ("ONLY from provided documents"), citation requirement, conversation history injection, and limiting hallucination by telling the model what to do when it doesn't know.

---

**Q109: How do you evaluate the quality of AI responses?**

In production I'd use: LLM-as-judge (have a separate LLM evaluate answer quality), RAGAS metrics (Faithfulness, Answer Relevance, Context Recall, Context Precision), and user feedback (thumbs up/down). For v1, I manually tested responses against known document content, checking that citations are accurate and answers are grounded. The next iteration would add a feedback button in the UI.

---

**Q110: What is the context window and how did it constrain your design?**

Gemini 2.5 Flash Lite has a 1M token context window — very large. However, sending entire documents would be expensive. I limit context to the top-5 most similar chunks plus the last 5 conversation turns. This keeps prompts under ~2,000 tokens — cheap and fast. For very long documents, chunking ensures the most relevant sections are always included rather than diluting context with irrelevant passages.

---

**Q111: How do you prevent the AI from hallucinating?**

Five techniques: (1) Explicit system prompt instruction to only use provided context. (2) Include the source text in the prompt — the model can reference it directly. (3) Tell the model to say "I don't know" when the answer isn't in the documents. (4) Return citations alongside the answer — users can verify. (5) Higher temperature = more creative/hallucinating; lower temperature (0.2) = more factual. I use a low temperature for Q&A tasks.

---

**Q112: What is sentence-transformers and how does it run locally?**

Sentence-transformers is a Python library built on HuggingFace Transformers. On first use, it downloads the model weights (~20MB for MiniLM). The model runs on CPU using PyTorch — no GPU required. Each embedding call tokenizes the input and runs a forward pass through the BERT-based model. The `[CLS]` token's output is used as the sentence embedding. Running locally means no API costs and no data leaving the backend for embedding generation.

---

**Q113: How would you switch from Gemini to Claude or GPT-4?**

The AI service layer is abstracted:
```python
class AIService:
    async def generate_answer(self, context: str, question: str) -> str:
        # Currently: google-genai SDK
        # Replace with: openai.ChatCompletion.create() or anthropic.Anthropic()
```

Swapping the implementation requires: installing the new SDK, updating the API call format, and updating the `GEMINI_API_KEY` env var to `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`. The service interface doesn't change — routes and tests remain the same.

---

**Q114: What are token costs and how did you optimize for them?**

Gemini 2.5 Flash Lite charges per input+output token. Optimizations: limiting context to top-5 chunks (not all chunks), keeping conversation history to last 5 turns, truncating very long chunks. A typical Q&A response uses ~1,000-2,000 input tokens + ~300 output tokens. At Gemini's pricing, this is fractions of a cent per query — well within free tier limits for development.

---

**Q115: What is pgvector and why would you add it?**

pgvector is a PostgreSQL extension adding native vector similarity operations: `<->` (L2 distance), `<=>` (cosine distance), `<#>` (inner product). It supports HNSW (Hierarchical Navigable Small World) indexes for approximate nearest neighbor search — O(log n) instead of O(n). Current DocuMind stores embeddings as JSON and computes similarity in Python. With pgvector, the full search runs in the database — faster, network-efficient, and supports ordering/limiting at the DB level.

---

**Q116: How do you handle the case where no relevant chunks are found?**

In the search service, if all similarity scores are below a threshold (e.g., 0.3), I return an empty results list. In the AI assistant, if no relevant chunks are found, the prompt explicitly includes "No relevant passages found in the user's documents" — the AI responds that it couldn't find relevant information rather than hallucinating an answer. The UI shows a message explaining the limitation.

---

**Q117: What is the difference between zero-shot and few-shot prompting?**

Zero-shot: the prompt gives instructions but no examples. "Summarize this document in 3 bullet points."  
Few-shot: the prompt provides 2–3 examples of input→output before the actual request. The model learns the desired format from examples.  
In DocuMind, I use zero-shot prompting with detailed instructions. Adding few-shot examples (a sample question + ideal cited answer) would improve citation format consistency.

---

**Q118: How would you add support for audio/video transcription?**

Add Whisper (OpenAI's open-source transcription model) to the OCR pipeline. New mime type detection: `audio/mp3`, `video/mp4`. A `WhisperTranscriber` class in the services layer. The transcribed text then goes through the same chunking + embedding pipeline as documents. No changes to the search or assistant — they work on text chunks regardless of source.

---

**Q119: What monitoring would you add for AI features?**

Track: average embedding generation time per document, embedding model load time, search query latency with result count, Gemini API response time and token usage, similarity score distribution (are results actually relevant?), and user satisfaction (future: thumbs up/down). Alert on: Gemini API errors > 5%, search latency > 2s, embedding failures. Structured logging captures these metrics on every request.

---

**Q120: Explain the document chunking strategy in detail.**

Current approach: sliding window with fixed size (~500 chars) and 50-char overlap. Overlap prevents meaningful content at chunk boundaries from being lost. Chunks respect sentence boundaries where possible (split on `. ` or `\n` rather than mid-word). Each chunk stores its `chunk_index` for ordering. Alternative strategies: semantic chunking (split on paragraph/section breaks), hierarchical chunking (store both paragraph and sentence chunks). The current approach is simple and works well for business documents.

---

## 7. DevOps / CI/CD

**Q121: Explain your GitHub Actions workflow architecture.**

Six workflows with single responsibilities: `tests.yml` (primary gate), `quality.yml` (formatting + linting), `security.yml` (scanning), `docker.yml` (image builds + integration), `backend.yml` (deep backend: migrations + coverage), `frontend.yml` (type check + build artifact). Each uses `concurrency` groups to cancel superseded runs. `tests.yml` has a `tests-complete` summary job that's the single required check for branch protection — adding matrix entries never breaks the protection rule.

---

**Q122: What is a Docker multi-stage build and what problem does it solve?**

Multi-stage build uses multiple `FROM` instructions. The "builder" stage installs build dependencies (pip, npm, compilers). The "runtime" stage starts fresh from a minimal base image and copies only what's needed to run the app (installed packages, built files). Build tools, source code, test files, and intermediate artifacts are left behind. Result: smaller image (no pip, no build tools), smaller attack surface, faster pulls.

---

**Q123: What is Dependabot and how did you configure it?**

Dependabot automatically creates PRs to update dependencies. I configured three ecosystems: `pip` (backend, weekly), `npm` (frontend, weekly), `github-actions` (workflow pins, weekly). For pip and npm, I use `groups` to batch related packages into one PR (e.g., all `@radix-ui/*` packages in one PR instead of 8 separate PRs). Each PR runs the full CI suite before it can be merged.

---

**Q124: What is Gitleaks and why is it a hard gate?**

Gitleaks scans the git history for secrets (API keys, passwords, connection strings). It's a "hard gate" meaning the build fails immediately if any secrets are found — no way to override without reverting. `fetch-depth: 0` fetches the complete git history, not just the latest commit. This catches secrets committed weeks ago. If a secret is found: remove it from git history using `git filter-branch` or BFG Repo Cleaner, rotate the exposed credential immediately, then re-push.

---

**Q125: What is Trivy and what does it scan?**

Trivy is a comprehensive vulnerability scanner. It scans Docker images for: OS package vulnerabilities (from the base image), language package vulnerabilities (pip, npm packages in the image), and IaC misconfigurations. I run it on the built backend image and upload results to GitHub's Security tab as SARIF. It runs on push to main (not PRs) because it requires a built image. Critical findings would fail the workflow.

---

**Q126: Explain `concurrency` groups in GitHub Actions.**

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

When a new push arrives while a previous workflow is still running for the same branch, the old run is cancelled and the new one starts. This saves CI minutes — no need to complete a run for a commit that's already superseded. For deployment workflows, I use `cancel-in-progress: false` — never cancel a production deploy mid-flight.

---

**Q127: How does Docker Compose networking work in development?**

Compose creates a default bridge network. All services are on it and can reach each other by service name (e.g., `backend` calls `postgres:5432`, not `localhost:5432`). Port mapping (`ports: "8000:8000"`) exposes container ports to the host. The `depends_on` with `healthcheck` ensures services start in the right order — backend waits for postgres to be ready before starting.

---

**Q128: How does the deploy workflow know when Render is healthy?**

After triggering the deploy hook, the workflow polls `$BACKEND_URL/health` every 15 seconds for up to 10 minutes (40 attempts). If it returns 200, the backend is healthy. If it doesn't respond within 10 minutes, the workflow fails with an error. This acts as a built-in health timeout — if the deploy broke something, the post-deploy smoke tests still run to surface the specific failure.

---

**Q129: What is `npm ci` and why use it over `npm install`?**

`npm ci` (clean install): deletes `node_modules` and installs exact versions from `package-lock.json`. It fails if `package.json` and `package-lock.json` are out of sync. This ensures reproducible installs — every CI run gets exactly the same dependency versions. `npm install` might update `package-lock.json` and install slightly different patch versions. `--frozen-lockfile` on CI prevents accidental lockfile mutations.

---

**Q130: What is the purpose of health checks in Docker?**

Docker health checks run a command periodically inside the container and report `healthy`/`unhealthy`. In `docker-compose.yml`, other services can use `depends_on: service: condition: service_healthy` — they don't start until the dependency is healthy. The backend uses: `CMD curl -f http://localhost:8000/health || exit 1` every 30 seconds. Render uses the health check path to verify deploys succeeded.

---

**Q131: How does Bandit work and what does it detect?**

Bandit is a Python SAST (Static Application Security Testing) tool. It scans Python source code for: hardcoded passwords (`B105`), SQL injection vulnerabilities (`B608`), use of `subprocess.shell=True` (`B603`), use of `eval()` (`B307`), insecure random number generation (`B311`), and many more. In DocuMind, it's advisory — `continue-on-error: true` — because some findings require suppression annotations (`# nosec B501`). Production use would enable strict mode.

---

**Q132: Explain the Docker non-root user pattern.**

```dockerfile
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser
```

Running as root in a container means any container escape gives root privileges on the host. Running as a non-root user limits damage if the container is compromised. The `docker.yml` CI workflow verifies this: `docker run --rm backend id -u` must return `1001`, not `0`. Render and Kubernetes can also enforce non-root via pod security policies.

---

**Q133: What is a smoke test and how does yours work?**

A smoke test is a minimal test that verifies basic system functionality after deployment. `scripts/smoke-test.sh` performs a real end-to-end API flow: registers a test user, retrieves the profile, logs in with credentials, logs out, and verifies the token is invalidated. It uses only `curl` and `python3` — no dependencies. It's conservative (uses a unique test email per run to avoid conflicts) and cleans up after itself.

---

**Q134: How would you add staging environment support?**

Add a `staging` branch. Create a separate Render service (`documind-backend-staging`) and Vercel preview deployment. Update `deploy.yml` to trigger staging deploy on push to `staging` and production deploy on push to `main`. Add a manual approval gate in GitHub Environments between staging and production. Use the same environment variable structure but different values (separate Supabase project, `staging.yourdomain.com` domain).

---

**Q135: What is `pip-audit` and what did it find?**

`pip-audit` scans installed Python packages against the Python Advisory Database (PyPA). It checks if any package version has a known CVE. In DocuMind's CI, it runs `pip-audit -r requirements.txt --format=json` and saves the report as an artifact. I set it to `continue-on-error: true` for now (some older indirect dependencies have low-severity advisories). The report is always visible in CI artifacts for manual review.

---

**Q136: Explain the `paths` filter in GitHub Actions.**

```yaml
on:
  push:
    paths:
      - 'backend/**'
      - 'docker/**'
```

The workflow only triggers when files matching these glob patterns change. This saves CI minutes: a frontend-only commit doesn't trigger backend tests. A documentation change doesn't rebuild Docker images. The tradeoff: if you change a shared config file, you might forget to update the paths filter and miss a related workflow.

---

**Q137: What is Conventional Commits and how does commitlint enforce it?**

Conventional Commits defines a commit message format: `<type>(<scope>): <description>`. Types like `feat`, `fix`, `ci`, `docs` describe the change. `commitlint.config.js` defines valid types and rules (max subject length, lowercase type). A Husky `commit-msg` hook runs `commitlint` before the commit is accepted. This enables: automatic CHANGELOG generation, semantic version bumping (BREAKING CHANGE → major, feat → minor, fix → patch), and searchable git history.

---

**Q138: How does the migration integrity test work in CI?**

```yaml
- name: Test migration integrity
  run: |
    alembic upgrade head          # Apply all migrations
    python -c "                   # Verify tables exist
      import asyncio
      from app.database.database import engine
      from sqlalchemy import text, inspect
      async def check():
          async with engine.connect() as conn:
              result = await conn.execute(text('SELECT tablename FROM pg_tables WHERE schemaname=\'public\''))
              tables = {r[0] for r in result}
              required = {'users', 'documents', 'user_sessions', 'audit_logs'}
              assert required.issubset(tables)
          print('All required tables present')
      asyncio.run(check())
    "
    alembic downgrade -1          # Test rollback
    alembic upgrade head          # Test re-apply
```

---

**Q139: How would you implement zero-downtime deployments?**

Four strategies: (1) Blue-green: maintain two identical environments, switch traffic after the new version is healthy. (2) Rolling: gradually replace old instances with new ones. (3) Canary: send 5% of traffic to the new version, monitor error rates, gradually increase. Render's current approach is restart-based (brief downtime). For true zero-downtime, we'd need: database migrations that are backward-compatible (expand-contract), multiple Render instances, and a load balancer that respects health checks.

---

**Q140: What is `SARIF` in the context of Trivy?**

SARIF (Static Analysis Results Interchange Format) is a JSON format for security scanning results. GitHub's Security tab understands SARIF — when Trivy uploads results as SARIF, findings appear in the repository's Security → Code Scanning page with file locations, severity levels, and fix guidance. This integrates vulnerability scanning into the GitHub developer workflow rather than requiring separate dashboards.

---

## 8. Security

**Q141: How does JWT authentication work in your implementation?**

JWTs have three parts: header (algorithm), payload (claims), signature. I sign with HMAC-SHA256 (`HS256`) using `JWT_SECRET_KEY`. The payload includes: `sub` (user ID), `email`, `jti` (unique token ID), `exp` (expiry timestamp). `python-jose` signs and verifies. The `get_current_user` dependency decodes the JWT, validates the signature and expiry, then fetches the user from the database to ensure they're still active.

---

**Q142: Why use both access tokens AND refresh tokens?**

Short-lived access tokens (15 min) limit the damage window if a token is stolen — the attacker can only act for 15 minutes. But requiring users to re-login every 15 minutes is terrible UX. Refresh tokens solve this: they have long expiry (7 days) but can only be used to get new access tokens, not to call API endpoints. Refresh tokens are rotated on every use — if a refresh token is replayed (attacker used it), the rotation mismatch is detected and the session can be revoked.

---

**Q143: What is refresh token rotation and why is it important?**

On every refresh call, the old refresh token is invalidated and a new one is issued. If an attacker steals a refresh token and uses it after the legitimate user already refreshed, the system detects that the token was already used (JTI is in the `user_sessions` table as inactive) and can revoke all sessions for the user. Without rotation, a stolen refresh token gives indefinite access.

---

**Q144: How does CORS work and how did you configure it?**

CORS (Cross-Origin Resource Sharing) controls which origins can make cross-origin HTTP requests. The browser sends an `Origin` header; the server responds with `Access-Control-Allow-Origin` if the origin is allowed. For preflight (`OPTIONS`) requests, the server responds with allowed methods and headers before the actual request. I configured an allowlist of origins (production frontend URL + dev URL). In production, `localhost` origins are rejected — the production validator checks this.

---

**Q145: What is CSRF and are you protected against it?**

CSRF (Cross-Site Request Forgery) tricks a victim's browser into making authenticated requests to a site they're logged into. Traditional session cookies are vulnerable — browsers send them automatically. JWTs stored in `localStorage` are NOT sent automatically — the JavaScript must explicitly include the token. Since DocuMind uses `Authorization: Bearer` headers (not cookies), CSRF is not a concern. The risk shifts: localStorage is accessible to JavaScript (XSS risk), so CSP and input sanitization are important.

---

**Q146: How does bcrypt protect against password database breaches?**

If the database is breached, an attacker gets bcrypt hashes. Bcrypt's design makes cracking computationally expensive: each hash attempt takes ~300ms (12 rounds). A GPU rig doing 1M attempts/second against a plain MD5 hash takes seconds; against bcrypt (12 rounds) it takes months per password. The random salt means rainbow table precomputation is impossible — each password hash must be brute-forced individually.

---

**Q147: What are security headers and why does each matter?**

- `X-Content-Type-Options: nosniff` — browser must use the declared Content-Type, not sniff (prevents executing a JPEG containing JS as JavaScript)  
- `X-Frame-Options: DENY` — page cannot be embedded in an iframe (prevents clickjacking attacks)  
- `Referrer-Policy: strict-origin-when-cross-origin` — controls what URL is sent in the Referer header (prevents leaking full paths)  
- `Permissions-Policy: camera=(), microphone=()` — page cannot access camera/microphone via browser APIs  
- `X-XSS-Protection: 1; mode=block` — legacy XSS filter for older browsers

---

**Q148: How does file type validation prevent attacks?**

Extension-only validation is trivially bypassed (rename `malware.exe` to `safe.pdf`). I validate three ways: (1) MIME type from the `Content-Type` header (easily spoofed by the client). (2) Magic bytes — read the first ~16 bytes of the file and compare to known file signatures (e.g., PDF starts with `%PDF-`). This is harder to spoof. (3) Allowlist of permitted types — default deny. Even with magic bytes, some attacks (e.g., polyglot files) remain possible, which is why uploads are processed server-side rather than rendered client-side.

---

**Q149: What is RBAC and how did you implement it?**

Role-Based Access Control grants permissions based on user roles. In DocuMind: `user` role (the default) can CRUD their own resources. `admin` role can additionally: view all users, view audit logs, deactivate accounts. Implementation: the `role` column on the `user` model. `get_current_admin_user` dependency checks `user.role == "admin"`. Resource ownership is a separate check: even admins can only modify their own documents (unless an explicit admin operation is provided).

---

**Q150: What is the principle of least privilege and where did you apply it?**

Grant the minimum permissions needed for the task: Database user has `SELECT, INSERT, UPDATE, DELETE` only — no `DROP TABLE` or `CREATE`. The Supabase Storage key used is the service role (needed for admin operations), but it's kept server-side only. Docker containers run as non-root user (UID 1001). The Gemini API key only needs `generativeLanguage` API access, not Cloud Admin. Admin routes require explicit admin role — regular users cannot access them.

---

**Q151: How do you protect against DoS (Denial of Service) attacks?**

Four layers: Rate limiting per IP (200 req/min global, 10/min auth) makes flooding expensive. Request size limits (1MB for non-upload endpoints) prevent large payload attacks. GZip compression is applied on responses, not requests — no decompression bomb risk. The Render infrastructure provides TCP-level protection against volumetric attacks. For a production upgrade: add Cloudflare WAF for Layer 7 protection.

---

**Q152: What is an audit log and what do you log?**

An audit log is an immutable append-only record of security-relevant events. I log: `REGISTER`, `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGED`, `SESSION_REVOKED`, `DOCUMENT_UPLOAD`, `DOCUMENT_DELETE`. Each entry records: `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `timestamp`, and optional `extra_data` (JSON). The table has no `UPDATE` route — entries are never modified. Admin can query logs via `/api/v1/admin/audit-logs`.

---

**Q153: How do you handle secrets in a production environment?**

Never commit secrets to source code (Gitleaks enforces this in CI). Render Dashboard stores production secrets as encrypted environment variables. GitHub Actions secrets store CI-only credentials. `.env.production.example` is a template with placeholder values — the real `.env.production` is listed in `.gitignore`. For local development, `.env.development` has safe placeholder values. The `@model_validator` in config.py detects placeholder values in production and refuses to start.

---

**Q154: What is the X-Request-ID header and how does it help security?**

Every request gets a unique UUID as `X-Request-ID` (auto-generated or from the client). This ID is included in all log lines for that request. When a user reports "I got an error at 3:45pm", support can search logs by the request ID and see the complete request lifecycle. For security investigations: a suspicious action's request ID lets you see all other actions in the same session, the IP address, user agent, and timing.

---

**Q155: How would you implement Content Security Policy?**

CSP restricts which resources a browser can load, preventing XSS by blocking injected scripts:
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' https://documind-backend.onrender.com;
  font-src 'self';
  frame-ancestors 'none'
```
For React SPAs, `'unsafe-inline'` for styles is often needed (emotion, CSS-in-JS). The `nonce` approach for scripts requires server-side rendering to generate unique nonces per request. Vite's build can output a strict-CSP-compatible bundle with nonces.

---

**Q156: How do you prevent session fixation attacks?**

Session fixation: attacker sets a known session ID before login. DocuMind uses JWT with server-generated tokens — there's no session to fix. On login, a new JWT is generated with a new `jti` (JWT ID). The previous access token (if any) expires normally — there's no explicit invalidation on re-login (by design). A session fixation variant is "token fixation" — mitigated by generating tokens server-side only, never accepting client-provided token values.

---

**Q157: What would you add for a compliance audit (SOC 2, ISO 27001)?**

For SOC 2: (1) Log retention policy (30+ days in a tamper-evident store). (2) Change management documentation (CHANGELOG + PR reviews). (3) Access control documentation (RBAC + session management). (4) Incident response procedure. (5) Vulnerability management (Dependabot + Trivy). (6) Data classification policy. (7) Backup and recovery testing. (8) Multi-factor authentication. DocuMind has strong technical controls — the gap is formal documentation and procedures.

---

**Q158: How does request size limiting protect the server?**

Without a size limit, an attacker can send a 10GB request body, forcing the server to read, buffer, and process it — exhausting memory and CPU. `RequestSizeMiddleware` reads the `Content-Length` header before the request body is consumed. If it exceeds `MAX_REQUEST_SIZE_KB` (1MB for non-upload routes), the request is immediately rejected with 413 Payload Too Large. Upload routes are excluded because they legitimately need large bodies (up to 50MB).

---

**Q159: How do you protect API keys in the frontend?**

I don't put API keys in the frontend. All secrets live in the backend environment variables. The frontend only sends requests to the DocuMind backend (`VITE_API_BASE_URL`), which then calls Gemini, Supabase, etc. using server-side secrets. The only "secret" the frontend has is the user's JWT access token (short-lived, user-scoped). This is correct — any `VITE_*` variable is visible in the JavaScript bundle.

---

**Q160: How do you implement defense in depth?**

Defense in depth means multiple independent security controls — if one fails, others compensate. DocuMind's seven layers: (1) Network: HTTPS enforced by Vercel/Render. (2) Application: CORS allowlist, security headers, rate limiting. (3) Authentication: JWT with short expiry, refresh token rotation. (4) Authorization: RBAC, resource ownership checks. (5) Input: Pydantic validation, file type verification, size limits. (6) Data: bcrypt hashing, parameterized queries. (7) Audit: immutable audit log, request ID tracing.

---

*End of Interview Preparation Guide — 160 Questions & Answers*
