# DocuMind AI — System Architecture

> Complete architectural reference for the DocuMind AI platform (v1.0.0)

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema (ER Diagram)](#database-schema)
6. [Authentication Flow](#authentication-flow)
7. [Document Processing Pipeline](#document-processing-pipeline)
8. [AI Processing Pipeline](#ai-processing-pipeline)
9. [Semantic Search Flow](#semantic-search-flow)
10. [Deployment Architecture](#deployment-architecture)
11. [Security Architecture](#security-architecture)
12. [Middleware Stack](#middleware-stack)

---

## Overview

DocuMind AI is a full-stack SaaS platform for AI-powered document analysis. Users upload documents (PDF, DOCX, images), which are processed through an OCR and embedding pipeline. They can then query their document library in natural language and receive AI-generated answers with source citations.

**Tech Stack Summary:**

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | PostgreSQL 16, SQLAlchemy 2.x async |
| AI | Google Gemini (gemini-2.5-flash-lite) |
| Embeddings | sentence-transformers |
| OCR | Tesseract, PyPDF2, python-docx |
| Cache | Redis 7 |
| Storage | Local / Supabase Storage |
| Proxy | Nginx |
| CI/CD | GitHub Actions (6 workflows) |
| Hosting | Vercel + Render + Supabase |

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        B["🌐 Browser<br/>(React 19 SPA)"]
    end

    subgraph "CDN / Proxy"
        V["⚡ Vercel<br/>(Global CDN)"]
        N["🔀 Nginx<br/>(Reverse Proxy)"]
    end

    subgraph "Application Layer"
        API["⚙️ FastAPI<br/>(Python 3.12)<br/>Render / Docker"]
    end

    subgraph "Data Layer"
        PG["🐘 PostgreSQL 16<br/>(Supabase)"]
        RD["⚡ Redis 7<br/>(Rate Limiting)"]
        ST["📁 Storage<br/>(Local / Supabase)"]
    end

    subgraph "AI Layer"
        GM["🤖 Google Gemini<br/>(gemini-2.5-flash-lite)"]
        EM["🔢 sentence-transformers<br/>(all-MiniLM-L6-v2)"]
    end

    B -->|"HTTPS"| V
    B -->|"API calls /api/v1/*"| N
    N -->|"Proxy"| API
    V -->|"Static assets"| B
    API -->|"asyncpg / SSL"| PG
    API -->|"Rate limit counters"| RD
    API -->|"File I/O"| ST
    API -->|"AI generation"| GM
    API -->|"Embeddings"| EM
```

---

## Frontend Architecture

```mermaid
graph TD
    subgraph "React Application"
        RT["React Router v6<br/>(Client-side routing)"]

        subgraph "Pages"
            PL["📄 Landing Page"]
            PA["🔐 Auth Pages<br/>(Login / Register)"]
            PD["📊 Dashboard"]
            PU["📤 Upload Page"]
            PC["💬 Chat / Assistant"]
            PS["🔍 Search Page"]
            PB["🔖 Bookmarks"]
            PR["⏰ Reminders"]
            PP["👤 Profile"]
        end

        subgraph "State Management"
            ZU["Zustand<br/>(Auth Store)"]
            TQ["TanStack Query v5<br/>(Server State)"]
        end

        subgraph "Services"
            AX["Axios Client<br/>(+ interceptors)"]
            AS["Auth Service"]
            DS["Document Service"]
            CS["Chat Service"]
            SS["Search Service"]
        end

        subgraph "UI Components"
            BC["Base Components<br/>(Button, Card, Input, Modal)"]
            LC["Layout Components<br/>(Navbar, Sidebar)"]
            FC["Feature Components<br/>(DocumentCard, ChatBubble)"]
        end
    end

    RT --> PL & PA & PD & PU & PC & PS & PB & PR & PP
    PA --> ZU
    PD & PU & PC & PS --> TQ
    TQ --> AX
    AX --> AS & DS & CS & SS
    PD & PU --> FC
    FC --> BC
    LC --> BC
```

### Key Frontend Patterns

| Pattern | Implementation |
|---|---|
| Auth state | Zustand store persisted to localStorage |
| Server state | TanStack Query with stale-while-revalidate |
| API client | Axios with request/response interceptors |
| Protected routes | HOC checks Zustand auth store |
| Token refresh | Axios interceptor retries 401s with refresh token |
| Forms | React controlled components + Pydantic-aligned validation |

---

## Backend Architecture

```mermaid
graph TD
    subgraph "Request Lifecycle"
        REQ["HTTP Request"]

        subgraph "Middleware Stack (outermost → innermost)"
            M1["RequestIDMiddleware<br/>(X-Request-ID header)"]
            M2["SecurityHeadersMiddleware<br/>(OWASP headers)"]
            M3["GZipMiddleware<br/>(min 1KB compression)"]
            M4["RateLimiterMiddleware<br/>(sliding window per-IP)"]
            M5["RequestSizeMiddleware<br/>(1MB limit non-upload)"]
            M6["CORSMiddleware<br/>(allowlist origins)"]
        end

        subgraph "Route Handlers"
            R_AUTH["auth.py"]
            R_DOC["documents.py"]
            R_SRCH["search.py"]
            R_CHAT["assistant.py"]
            R_BKM["bookmarks.py"]
            R_REM["reminders.py"]
            R_ADM["admin.py"]
        end

        subgraph "Service Layer"
            S_AUTH["AuthService"]
            S_DOC["DocumentService"]
            S_OCR["OCRService"]
            S_AI["AIService"]
            S_SRCH["SearchService"]
            S_CHAT["AssistantService"]
        end

        subgraph "Repository Layer"
            RP_AUTH["AuthRepository"]
            RP_DOC["DocumentRepository"]
            RP_AUD["AuditRepository"]
        end

        DB["PostgreSQL"]
    end

    REQ --> M1 --> M2 --> M3 --> M4 --> M5 --> M6
    M6 --> R_AUTH & R_DOC & R_SRCH & R_CHAT & R_BKM & R_REM & R_ADM
    R_AUTH --> S_AUTH --> RP_AUTH --> DB
    R_DOC --> S_DOC --> S_OCR
    S_DOC --> S_AI --> DB
    R_SRCH --> S_SRCH --> DB
    R_CHAT --> S_CHAT --> DB
    RP_AUTH --> RP_AUD --> DB
```

### Layer Responsibilities

| Layer | Responsibility | Pattern |
|---|---|---|
| **Routes** | HTTP request/response, schema validation | FastAPI dependencies |
| **Services** | Business logic, orchestration | Plain async classes |
| **Repositories** | Database queries, no business logic | Repository pattern |
| **Models** | ORM entity definitions | SQLAlchemy 2.x mapped_column |
| **Schemas** | Request/response validation | Pydantic v2 BaseModel |

---

## Database Schema

```mermaid
erDiagram
    users {
        UUID id PK
        VARCHAR full_name
        VARCHAR email UK
        VARCHAR password_hash
        VARCHAR profile_image
        BOOLEAN is_active
        BOOLEAN is_verified
        VARCHAR role
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
        TIMESTAMPTZ last_login
    }

    user_sessions {
        UUID id PK
        UUID user_id FK
        VARCHAR refresh_jti UK
        VARCHAR ip_address
        VARCHAR user_agent
        VARCHAR device_hint
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ last_activity
        TIMESTAMPTZ expires_at
    }

    audit_logs {
        UUID id PK
        UUID user_id FK
        VARCHAR action
        VARCHAR resource_type
        VARCHAR resource_id
        VARCHAR ip_address
        VARCHAR user_agent
        JSON extra_data
        TIMESTAMPTZ timestamp
    }

    documents {
        UUID id PK
        UUID user_id FK
        VARCHAR original_filename
        VARCHAR stored_filename
        VARCHAR storage_path
        VARCHAR mime_type
        INTEGER file_size_bytes
        VARCHAR status
        TEXT extracted_text
        JSON metadata
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    document_chunks {
        UUID id PK
        UUID document_id FK
        INTEGER chunk_index
        TEXT content
        VECTOR embedding
        TIMESTAMPTZ created_at
    }

    conversations {
        UUID id PK
        UUID user_id FK
        VARCHAR title
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    messages {
        UUID id PK
        UUID conversation_id FK
        VARCHAR role
        TEXT content
        JSON sources
        TIMESTAMPTZ created_at
    }

    bookmarks {
        UUID id PK
        UUID user_id FK
        UUID document_id FK
        VARCHAR note
        TIMESTAMPTZ created_at
    }

    reminders {
        UUID id PK
        UUID user_id FK
        UUID document_id FK
        TEXT message
        TIMESTAMPTZ remind_at
        BOOLEAN is_sent
        TIMESTAMPTZ created_at
    }

    users ||--o{ user_sessions : "has"
    users ||--o{ audit_logs : "generates"
    users ||--o{ documents : "owns"
    users ||--o{ conversations : "has"
    users ||--o{ bookmarks : "creates"
    users ||--o{ reminders : "sets"
    documents ||--o{ document_chunks : "split into"
    documents ||--o{ bookmarks : "bookmarked as"
    documents ||--o{ reminders : "reminded about"
    conversations ||--o{ messages : "contains"
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as FastAPI
    participant DB as PostgreSQL
    participant AU as AuditLog

    B->>API: POST /api/v1/auth/register {email, password, name}
    API->>API: Validate password strength
    API->>API: bcrypt hash password (12 rounds)
    API->>DB: INSERT user (is_active=true, is_verified=false)
    API->>AU: LOG action=REGISTER
    API-->>B: {access_token, refresh_token, user}

    Note over B,AU: Login Flow

    B->>API: POST /api/v1/auth/login {email, password}
    API->>DB: SELECT user WHERE email=?
    API->>API: bcrypt.verify(password, hash)
    API->>DB: UPDATE last_login
    API->>DB: INSERT user_session (refresh_jti, device_hint)
    API->>AU: LOG action=LOGIN
    API-->>B: {access_token (15min), refresh_token (7 days)}

    Note over B,AU: Token Refresh

    B->>API: POST /api/v1/auth/refresh {refresh_token}
    API->>API: Verify JWT signature + expiry
    API->>DB: SELECT session WHERE refresh_jti=?
    API->>API: Rotate refresh token (revoke old JTI)
    API->>DB: UPDATE session new_jti
    API-->>B: {new_access_token, new_refresh_token}

    Note over B,AU: Protected Request

    B->>API: GET /api/v1/documents [Authorization: Bearer <token>]
    API->>API: Verify JWT, extract user_id
    API->>DB: SELECT user WHERE id=?
    API->>API: Check is_active, is_verified
    API-->>B: {documents[]}
```

---

## Document Processing Pipeline

```mermaid
flowchart TD
    U["📤 User Uploads File<br/>(multipart/form-data)"] 
    V["🛡️ Validate<br/>(type, size, magic bytes)"]
    S["💾 Store File<br/>(LocalStorage / Supabase)"]
    DB1["📝 Create Document Record<br/>(status=processing)"]
    
    subgraph "OCR Pipeline (async)"
        DT["Detect File Type"]
        PDF["📄 PDF → PyPDF2<br/>(text extraction)"]
        DOCX["📝 DOCX → python-docx<br/>(paragraph extraction)"]
        IMG["🖼️ Image → Tesseract<br/>(pytesseract OCR)"]
        CLEAN["🧹 Clean Text<br/>(normalize whitespace)"]
    end

    subgraph "AI Processing Pipeline"
        CHUNK["✂️ Chunk Text<br/>(sliding window, overlap)"]
        EMBED["🔢 Generate Embeddings<br/>(sentence-transformers<br/>all-MiniLM-L6-v2)"]
        SUM["📊 Generate Summary<br/>(Google Gemini)"]
        STORE["💾 Store Chunks + Vectors<br/>(document_chunks table)"]
    end

    DB2["✅ Update Status<br/>(status=ready)"]

    U --> V --> S --> DB1 --> DT
    DT -->|PDF| PDF
    DT -->|DOCX| DOCX
    DT -->|Image| IMG
    PDF & DOCX & IMG --> CLEAN --> CHUNK --> EMBED --> STORE
    CHUNK --> SUM
    STORE --> DB2
    SUM --> DB2
```

---

## AI Processing Pipeline (RAG)

```mermaid
flowchart LR
    Q["💬 User Question"]
    
    subgraph "Retrieval Phase"
        QE["🔢 Embed Question<br/>(sentence-transformers)"]
        VS["🔍 Vector Similarity Search<br/>(cosine similarity<br/>top-K chunks)"]
        RE["📚 Retrieved Chunks<br/>(with source metadata)"]
    end

    subgraph "Augmentation Phase"
        CTX["📋 Build Context<br/>(question + chunks)"]
        SYS["⚙️ System Prompt<br/>(citation instructions)"]
    end

    subgraph "Generation Phase"
        GM["🤖 Google Gemini<br/>(gemini-2.5-flash-lite)"]
        ANS["✨ AI Answer<br/>(with citations)"]
    end

    subgraph "Storage Phase"
        MSG["💾 Save Message<br/>(conversation history)"]
    end

    Q --> QE --> VS --> RE --> CTX
    SYS --> CTX --> GM --> ANS --> MSG
```

---

## Semantic Search Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as FastAPI
    participant EM as Embeddings Model
    participant DB as PostgreSQL

    U->>API: GET /api/v1/search?q=tax+deductions&limit=10
    API->>EM: embed("tax deductions")
    EM-->>API: vector[384 dims]
    API->>DB: SELECT chunks ORDER BY embedding <-> query_vector LIMIT 10
    Note over DB: pgvector cosine similarity
    DB-->>API: [{chunk, document, similarity_score}]
    API->>API: Group by document, deduplicate
    API->>API: Format results with excerpts
    API-->>U: [{document, excerpt, score, page}]
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Internet"
        USER["👤 Users"]
    end

    subgraph "Vercel (Frontend)"
        CDN["🌍 Global CDN<br/>100+ edge locations"]
        FE["⚛️ React SPA<br/>(static assets)"]
    end

    subgraph "Render (Backend)"
        LB["⚖️ Load Balancer<br/>(Render managed)"]
        SVC["⚙️ FastAPI Service<br/>uvicorn 2 workers"]
    end

    subgraph "Supabase"
        PG["🐘 PostgreSQL 16<br/>Transaction Pooler :6543"]
        ST["📁 Storage<br/>(S3-compatible)"]
    end

    subgraph "External APIs"
        GM["🤖 Google Gemini API"]
    end

    subgraph "GitHub"
        GH["📦 Repository"]
        CI["⚙️ GitHub Actions<br/>6 CI/CD workflows"]
    end

    USER -->|"HTTPS"| CDN
    USER -->|"API calls"| LB
    CDN --> FE
    LB --> SVC
    SVC -->|"asyncpg + SSL"| PG
    SVC -->|"HTTP"| ST
    SVC -->|"HTTPS"| GM
    GH --> CI
    CI -->|"Deploy hook"| SVC
    CI -->|"Git push"| CDN
```

---

## Security Architecture

```mermaid
graph TD
    subgraph "Defence in Depth"
        L1["Layer 1: Network<br/>HTTPS / TLS everywhere<br/>Vercel + Render auto-certs"]
        L2["Layer 2: Application<br/>CORS allowlist<br/>Security headers (OWASP)<br/>Rate limiting (slowapi)"]
        L3["Layer 3: Authentication<br/>JWT (HS256, 15min access)<br/>Refresh token rotation<br/>Session revocation"]
        L4["Layer 4: Authorization<br/>RBAC: user / admin<br/>Resource ownership checks"]
        L5["Layer 5: Input Validation<br/>Pydantic v2 strict schemas<br/>File type + size validation<br/>Magic byte verification"]
        L6["Layer 6: Data<br/>bcrypt password hashing<br/>UUID primary keys<br/>Parameterized queries (SQLAlchemy)"]
        L7["Layer 7: Audit<br/>Immutable audit_logs table<br/>All auth events logged<br/>Request ID tracing"]
    end

    L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7
```

---

## Middleware Stack

Middleware is applied in LIFO order (last added = outermost = first to execute):

```
Incoming Request
      │
      ▼
┌─────────────────────────────────────┐
│  1. RequestIDMiddleware             │  Adds X-Request-ID header
│     (outermost)                     │  All logs tagged with request ID
├─────────────────────────────────────┤
│  2. SecurityHeadersMiddleware       │  X-Frame-Options: DENY
│                                     │  X-Content-Type-Options: nosniff
│                                     │  Referrer-Policy: strict-origin
├─────────────────────────────────────┤
│  3. GZipMiddleware                  │  Compress responses > 1KB
├─────────────────────────────────────┤
│  4. RateLimiterMiddleware           │  Global: 200/min per IP
│                                     │  Auth: 10/min
│                                     │  Upload: 20/min, Chat: 30/min
├─────────────────────────────────────┤
│  5. RequestSizeMiddleware           │  Reject non-upload requests > 1MB
├─────────────────────────────────────┤
│  6. CORSMiddleware                  │  Allowlist only configured origins
│     (innermost)                     │  Handles OPTIONS preflight
└─────────────────────────────────────┘
      │
      ▼
 Route Handlers → Services → Repositories → Database
```
