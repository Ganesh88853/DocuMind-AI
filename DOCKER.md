# DocuMind AI — Docker & Development Environment

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd DocuMind-Ai

# 2. Create your environment file
cp .env.example .env
# Edit .env — set GEMINI_API_KEY and JWT_SECRET_KEY at minimum

# 3. Start everything (hot reload enabled)
./scripts/start.sh

# OR — start production build
docker compose up -d
```

| Service | URL | Notes |
|---|---|---|
| **Frontend** (Vite HMR) | http://localhost:5173 | Dev mode only |
| **Frontend** (nginx) | http://localhost | Production / nginx route |
| **Backend API** | http://localhost:8000 | Direct, for testing |
| **API Docs** (Swagger) | http://localhost:8000/docs | When DEBUG=true |
| **PostgreSQL** | localhost:5432 | Direct DB access |
| **Redis** | localhost:6379 | Direct cache access |

---

## Architecture

```
┌─────────────────────── documind-network ──────────────────────┐
│                                                               │
│  ┌──────────────┐   /api/*   ┌──────────────┐               │
│  │              │───────────▶│              │                │
│  │  nginx       │            │  backend     │──┐             │
│  │  :80 (ext)   │   /*       │  :8000       │  │             │
│  │              │──────────┐ └──────────────┘  │             │
│  └──────────────┘          │                   ▼             │
│                            │  ┌──────────────────────────┐   │
│                            │  │  postgres   │  redis     │   │
│                            │  │  :5432      │  :6379     │   │
│                            │  └──────────────────────────┘   │
│                            ▼                                  │
│                  ┌──────────────────┐                        │
│                  │  frontend        │                        │
│                  │  (nginx static)  │                        │
│                  └──────────────────┘                        │
└───────────────────────────────────────────────────────────────┘
```

### Traffic Flow

1. **External requests** arrive at `nginx` (port 80)
2. Requests to `/api/*` are **proxied** to `backend:8000`
3. All other requests serve the **React SPA** (static files from the frontend image)
4. Backend connects to `postgres:5432` and `redis:6379` over the internal network
5. No service except nginx is directly accessible from outside in production

---

## Container Descriptions

### `postgres` — Database
- **Image**: `postgres:16-alpine` (smallest official Postgres image)
- **Purpose**: Primary relational database for users, documents, sessions, audit logs
- **Data**: Persisted in the `documind_postgres_data` named volume
- **Init**: `docker/postgres/init.sql` creates the `documind_test` database on first start
- **Health**: `pg_isready` command — other services wait for this

### `redis` — Cache & Session Store
- **Image**: `redis:7-alpine`
- **Purpose**: Rate limiting counters, session caching, task queuing
- **Config**: `docker/redis/redis.conf` — LRU eviction, 256MB max memory, RDB persistence
- **Data**: Persisted in `documind_redis_data` volume

### `backend` — FastAPI Application
- **Build**: Multi-stage (`builder` → `runtime`) from `backend/Dockerfile`
- **User**: Runs as non-root `appuser` (uid 1001)
- **Startup**: `docker-entrypoint.sh` waits for PostgreSQL, runs migrations, then starts uvicorn
- **Health**: `curl http://localhost:8000/health`
- **Volumes**: `uploads` (user files), `logs` (application logs)

### `frontend` — React Application  
- **Build**: Multi-stage (`deps` → `builder` → `runner`) from `frontend/Dockerfile`
- **Production**: Vite builds static assets → served by nginx inside the image
- **Development**: Replaced by Vite HMR dev server via `Dockerfile.dev`
- **Health**: `wget http://localhost/health`

### `nginx` — Reverse Proxy
- **Image**: `nginx:1.27-alpine`
- **Config**: `docker/nginx.conf` (production) or `docker/nginx.dev.conf` (dev)
- **Responsibilities**: TLS termination (future), compression, security headers, routing

---

## Compose Files

### `docker-compose.yml` (Base / Production)
Full production configuration. All services use built images, no source mounts.

```bash
docker compose up -d        # start production stack
docker compose down         # stop
docker compose ps           # service status
docker compose logs -f      # all logs
```

### `docker-compose.dev.yml` (Development Override)
Extends base compose with developer-friendly settings:
- Backend source code mounted → uvicorn `--reload` detects changes
- Frontend replaced with Vite HMR server (port 5173)
- Debug logging enabled
- Direct port exposure (5432, 6379)

```bash
# Start development stack (always use both files)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Shortcut via script
./scripts/start.sh
```

---

## Volumes

| Volume Name | Mount Point | Purpose |
|---|---|---|
| `documind_postgres_data` | `/var/lib/postgresql/data` | All database tables and indexes |
| `documind_redis_data` | `/data` | Redis RDB snapshots |
| `documind_uploads` | `/app/uploads` | User-uploaded documents |
| `documind_logs` | `/app/logs` | Application log files |

> **Data Safety**: Volumes persist across `docker compose down`. Only `docker compose down --volumes` or `./scripts/clean.sh` will delete them.

---

## Networks

| Network | Type | Purpose |
|---|---|---|
| `documind-network` | bridge | Internal service communication |

All services communicate over this single bridge network using container names as hostnames (e.g., `backend` → `postgres:5432`). Only nginx exposes port 80 externally.

---

## Health Checks

Every service has a Docker health check. Dependent services won't start until their dependencies are healthy.

```
postgres  →  backend  →  frontend  →  nginx
redis     ↗
```

| Service | Check Command | Interval | Start Period |
|---|---|---|---|
| postgres | `pg_isready` | 10s | 10s |
| redis | `redis-cli ping` | 10s | 5s |
| backend | `curl /health` | 30s | 45s |
| frontend | `wget /health` | 30s | 10s |
| nginx | `wget /health` | 30s | — |

---

## Dockerfile Decisions

### Backend — Why Multi-Stage?
```
builder (python:3.12-slim + gcc):
  - Compiles asyncpg, Pillow, psycopg2 native extensions
  - gcc and libpq-dev only needed at compile time

runtime (python:3.12-slim, no gcc):
  - Copies compiled packages from builder
  - ~40% smaller final image (no compiler toolchain)
  - Only libpq5 runtime library needed
```

### Frontend — Why Three Stages?
```
deps (node:22-alpine):
  - npm ci only — cached unless package.json changes

builder (node:22-alpine):
  - Runs npm run build
  - Output: /app/dist (static HTML/CSS/JS)

runner (nginx:1.27-alpine):
  - Zero Node.js in final image
  - Only ~50MB image size
  - nginx serves assets directly (no Node overhead)
```

### Non-Root User
Both backend and frontend containers run as non-root users:
- Backend: `appuser` (uid 1001)
- Frontend: nginx default user (uid 101)

This limits blast radius if a vulnerability is exploited.

---

## Developer Scripts

All scripts are in `./scripts/`. Run `chmod +x scripts/*.sh` once on Linux/Mac.

| Script | Command | Description |
|---|---|---|
| `start.sh` | `./scripts/start.sh` | Start dev environment (hot reload) |
| `stop.sh` | `./scripts/stop.sh` | Stop all services |
| `logs.sh` | `./scripts/logs.sh [service]` | Tail logs |
| `shell.sh` | `./scripts/shell.sh [service]` | Shell into container |
| `dbshell.sh` | `./scripts/dbshell.sh [db]` | PostgreSQL interactive shell |
| `migrate.sh` | `./scripts/migrate.sh [cmd]` | Run Alembic migrations |
| `test.sh` | `./scripts/test.sh` | Run test suite in containers |
| `seed.sh` | `./scripts/seed.sh` | Create dev seed data |
| `clean.sh` | `./scripts/clean.sh` | Nuclear reset (destroys data!) |

### Examples

```bash
# Rebuild only the backend image
./scripts/start.sh --build backend

# Open a Python shell in backend
./scripts/shell.sh backend
# > python

# Inspect the database
./scripts/dbshell.sh
# > \dt   — list tables
# > \q    — quit

# Roll back last migration
./scripts/migrate.sh downgrade -1

# Run just auth tests
./scripts/test.sh tests/test_auth_api.py

# Seed users for development
./scripts/seed.sh
# admin@documind.ai / Admin@123
# user@documind.ai  / User@1234
```

---

## Environment Configuration

### Required Variables

| Variable | Description |
|---|---|
| `JWT_SECRET_KEY` | Must be ≥32 chars. Generate: `openssl rand -hex 32` |
| `GEMINI_API_KEY` | Google AI key from https://aistudio.google.com/app/apikey |
| `POSTGRES_PASSWORD` | Change from default in production |

### Dev vs Production

| Variable | Development | Production |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` |
| `DEBUG` | `true` | `false` |
| `CORS_ORIGINS` | `http://localhost:5173,...` | your domain |
| `TRUSTED_PROXIES` | `127.0.0.1` | Docker CIDR or load balancer IP |

---

## Troubleshooting

### Backend won't start
```bash
# Check entrypoint logs
./scripts/logs.sh backend

# Common causes:
# 1. PostgreSQL not healthy yet — wait and retry
# 2. Migration failed — check: ./scripts/migrate.sh current
# 3. Bad .env variable — check DATABASE_URL format
```

### Database connection refused
```bash
# Verify postgres is healthy
docker compose ps postgres

# Connect directly
./scripts/dbshell.sh

# Check pg_isready
docker exec documind-postgres pg_isready -U postgres
```

### Frontend HMR not working
```bash
# Ensure Vite listens on 0.0.0.0 (required inside Docker)
# Check docker-compose.dev.yml frontend command has --host 0.0.0.0

# Check nginx WebSocket proxy is routing /_vite/ correctly
./scripts/logs.sh nginx
```

### Port already in use
```bash
# Find what's using port 5432
netstat -ano | findstr :5432   # Windows
lsof -i :5432                  # Linux/Mac

# Change port in .env
POSTGRES_PORT=5433
```

### Volumes have stale data
```bash
# Reset only the database volume
docker volume rm documind_postgres_data
./scripts/start.sh

# OR full nuclear reset
./scripts/clean.sh --all
```

### Windows-specific: line endings in entrypoint.sh
If the entrypoint fails on Windows with `not found` errors:
```bash
# Convert CRLF → LF
dos2unix backend/docker-entrypoint.sh

# Or in PowerShell
(Get-Content backend/docker-entrypoint.sh -Raw) -replace "`r`n","`n" | Set-Content backend/docker-entrypoint.sh -NoNewline
```

---

## Common Commands Reference

```bash
# Build all images without cache
docker compose build --no-cache

# Scale backend to 3 replicas (prod)
docker compose up -d --scale backend=3

# View disk usage by volume
docker system df -v

# Remove unused images and build cache
docker system prune -a

# Copy file from container
docker cp documind-backend:/app/logs/app.log ./app.log

# View real-time resource usage
docker stats
```
