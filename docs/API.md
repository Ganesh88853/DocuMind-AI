# DocuMind AI — API Reference

> Base URL: `https://documind-backend.onrender.com` (production)  
> Local: `http://localhost:8000`  
> OpenAPI Spec: `GET /openapi.json` (only when `DEBUG=true`)  
> Interactive Docs: `GET /docs` (only when `DEBUG=true`)

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

Access tokens expire in **15 minutes**. Use the refresh endpoint to obtain a new one.

---

## Table of Contents

1. [System](#system)
2. [Authentication](#authentication-endpoints)
3. [Documents](#documents)
4. [Search](#search)
5. [AI Assistant](#ai-assistant)
6. [Admin](#admin)
7. [Error Reference](#error-reference)
8. [Pagination](#pagination)

---

## System

### Health Check

```http
GET /health
```

No authentication required. Returns application health status.

**Response 200**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "production",
  "database": "ok",
  "timestamp": "2026-07-06T15:00:00Z"
}
```

### Application Root

```http
GET /
```

**Response 200**
```json
{
  "name": "DocuMind AI",
  "version": "1.0.0",
  "status": "running"
}
```

---

## Authentication Endpoints

Base path: `/api/v1/auth`

---

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

**Request Body**
```json
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `full_name` | string | ✅ | 2–100 chars |
| `email` | string | ✅ | valid email format |
| `password` | string | ✅ | min 8 chars, 1 uppercase, 1 digit |
| `password_confirm` | string | ✅ | must match `password` |

**Response 201**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "d7e184f4-713a-4336-8494-553bb84fb795",
    "full_name": "Jane Smith",
    "email": "jane@example.com",
    "role": "user",
    "is_active": true,
    "is_verified": false,
    "created_at": "2026-07-06T15:00:00Z"
  }
}
```

**Error Responses**
| Status | Code | Description |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Invalid email or weak password |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |

---

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

**Request Body**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass123!"
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": { ... }
}
```

**Error Responses**
| Status | Code | Description |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `ACCOUNT_DISABLED` | Account has been deactivated |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts (10/min) |

---

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

**Request Body**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

> **Note:** Refresh tokens rotate on every use. The old token is immediately invalidated.

**Error Responses**
| Status | Code | Description |
|---|---|---|
| 401 | `INVALID_TOKEN` | Token is expired, malformed, or revoked |

---

### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "id": "d7e184f4-713a-4336-8494-553bb84fb795",
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "role": "user",
  "is_active": true,
  "is_verified": false,
  "profile_image": null,
  "created_at": "2026-07-06T15:00:00Z",
  "last_login": "2026-07-06T16:00:00Z"
}
```

---

### Update Profile

```http
PATCH /api/v1/auth/me
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body** (all fields optional)
```json
{
  "full_name": "Jane M. Smith"
}
```

**Response 200** — Updated user object (same schema as GET /me)

---

### Change Password

```http
POST /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "current_password": "SecurePass123!",
  "new_password": "NewSecurePass456!",
  "new_password_confirm": "NewSecurePass456!"
}
```

**Response 200**
```json
{ "message": "Password changed successfully" }
```

---

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

Revokes the current session's refresh token.

**Response 200**
```json
{ "message": "Logged out successfully" }
```

---

### List Active Sessions

```http
GET /api/v1/auth/sessions
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "sessions": [
    {
      "id": "a1b2c3d4-...",
      "device_hint": "Chrome on Windows",
      "ip_address": "192.168.1.1",
      "created_at": "2026-07-06T12:00:00Z",
      "last_activity": "2026-07-06T16:00:00Z",
      "is_current": true
    }
  ]
}
```

---

### Revoke Session

```http
DELETE /api/v1/auth/sessions/{session_id}
Authorization: Bearer <access_token>
```

**Response 200**
```json
{ "message": "Session revoked" }
```

---

## Documents

Base path: `/api/v1/documents`

---

### Upload Document

```http
POST /api/v1/documents/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | file | ✅ | PDF, DOCX, PNG, JPG, GIF, BMP, TIFF |
| `title` | string | ❌ | defaults to filename |
| `description` | string | ❌ | optional note |

**Limits:** 50MB per file · Rate limit: 20 uploads/min

**Response 201**
```json
{
  "id": "f1a2b3c4-...",
  "original_filename": "annual-report-2026.pdf",
  "status": "processing",
  "mime_type": "application/pdf",
  "file_size_bytes": 1048576,
  "created_at": "2026-07-06T16:00:00Z",
  "message": "Document uploaded and queued for processing"
}
```

---

### List Documents

```http
GET /api/v1/documents
Authorization: Bearer <access_token>
```

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number (1-indexed) |
| `page_size` | int | 20 | Items per page (max 100) |
| `status` | string | — | Filter: `processing`, `ready`, `error` |
| `search` | string | — | Filter by filename |

**Response 200**
```json
{
  "items": [
    {
      "id": "f1a2b3c4-...",
      "original_filename": "annual-report-2026.pdf",
      "status": "ready",
      "mime_type": "application/pdf",
      "file_size_bytes": 1048576,
      "created_at": "2026-07-06T16:00:00Z",
      "updated_at": "2026-07-06T16:05:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 20,
  "pages": 3
}
```

---

### Get Document

```http
GET /api/v1/documents/{document_id}
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "id": "f1a2b3c4-...",
  "original_filename": "annual-report-2026.pdf",
  "status": "ready",
  "mime_type": "application/pdf",
  "file_size_bytes": 1048576,
  "extracted_text": "Annual Report 2026...",
  "summary": "This document covers fiscal year 2026 results...",
  "metadata": {
    "page_count": 24,
    "ocr_method": "pypdf2",
    "word_count": 8420
  },
  "created_at": "2026-07-06T16:00:00Z",
  "updated_at": "2026-07-06T16:05:00Z"
}
```

---

### Download Document

```http
GET /api/v1/documents/{document_id}/download
Authorization: Bearer <access_token>
```

**Response 200** — File bytes with appropriate `Content-Type` and `Content-Disposition: attachment` headers.

---

### Delete Document

```http
DELETE /api/v1/documents/{document_id}
Authorization: Bearer <access_token>
```

Deletes the document record and the stored file.

**Response 200**
```json
{ "message": "Document deleted successfully" }
```

---

## Search

Base path: `/api/v1/search`

---

### Semantic Search

```http
GET /api/v1/search
Authorization: Bearer <access_token>
```

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | Natural language search query |
| `limit` | int | 10 | Max results (1–50) |
| `document_id` | UUID | — | Restrict search to one document |

**Example Request**
```http
GET /api/v1/search?q=tax+deductions+for+home+office&limit=5
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "query": "tax deductions for home office",
  "results": [
    {
      "document_id": "f1a2b3c4-...",
      "document_name": "tax-guide-2026.pdf",
      "chunk_index": 12,
      "excerpt": "...home office deductions apply when the space is used exclusively for business...",
      "similarity_score": 0.89,
      "created_at": "2026-07-06T16:05:00Z"
    }
  ],
  "total": 5,
  "query_time_ms": 185
}
```

---

## AI Assistant

Base path: `/api/v1/assistant`

Rate limit: 30 requests/min

---

### List Conversations

```http
GET /api/v1/assistant/conversations
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "conversations": [
    {
      "id": "c1d2e3f4-...",
      "title": "Questions about tax filing",
      "message_count": 12,
      "created_at": "2026-07-06T14:00:00Z",
      "updated_at": "2026-07-06T16:00:00Z"
    }
  ]
}
```

---

### Create Conversation

```http
POST /api/v1/assistant/conversations
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "title": "Questions about annual report"
}
```

**Response 201**
```json
{
  "id": "c1d2e3f4-...",
  "title": "Questions about annual report",
  "created_at": "2026-07-06T16:00:00Z"
}
```

---

### Send Message

```http
POST /api/v1/assistant/conversations/{conversation_id}/messages
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "content": "What was the company's revenue in Q3 2026?",
  "document_ids": ["f1a2b3c4-...", "f5a6b7c8-..."]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | ✅ | User's question |
| `document_ids` | UUID[] | ❌ | Restrict context to these documents |

**Response 200**
```json
{
  "id": "m1a2b3c4-...",
  "role": "assistant",
  "content": "According to the annual report, the company's revenue in Q3 2026 was $12.4 million, representing a 23% increase year-over-year.",
  "sources": [
    {
      "document_id": "f1a2b3c4-...",
      "document_name": "annual-report-2026.pdf",
      "excerpt": "Q3 2026 revenue: $12.4M (+23% YoY)",
      "chunk_index": 8,
      "similarity_score": 0.94
    }
  ],
  "created_at": "2026-07-06T16:01:00Z"
}
```

---

### Get Conversation Messages

```http
GET /api/v1/assistant/conversations/{conversation_id}/messages
Authorization: Bearer <access_token>
```

**Response 200**
```json
{
  "conversation_id": "c1d2e3f4-...",
  "messages": [
    {
      "id": "m1a2b3c4-...",
      "role": "user",
      "content": "What was the revenue in Q3?",
      "sources": null,
      "created_at": "2026-07-06T16:00:00Z"
    },
    {
      "id": "m5a6b7c8-...",
      "role": "assistant",
      "content": "The revenue in Q3 2026 was $12.4 million...",
      "sources": [ ... ],
      "created_at": "2026-07-06T16:01:00Z"
    }
  ]
}
```

---

### Delete Conversation

```http
DELETE /api/v1/assistant/conversations/{conversation_id}
Authorization: Bearer <access_token>
```

**Response 200**
```json
{ "message": "Conversation deleted" }
```

---

## Admin

Base path: `/api/v1/admin`  
**Requires role: `admin`**

---

### List All Users

```http
GET /api/v1/admin/users
Authorization: Bearer <admin_access_token>
```

**Response 200**
```json
{
  "users": [
    {
      "id": "d7e184f4-...",
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "role": "user",
      "is_active": true,
      "document_count": 12,
      "created_at": "2026-07-06T10:00:00Z"
    }
  ],
  "total": 156
}
```

---

### Get Audit Logs

```http
GET /api/v1/admin/audit-logs
Authorization: Bearer <admin_access_token>
```

**Query Parameters:** `user_id`, `action`, `page`, `page_size`

**Response 200**
```json
{
  "logs": [
    {
      "id": "a1b2c3d4-...",
      "user_id": "d7e184f4-...",
      "action": "LOGIN",
      "resource_type": "auth",
      "ip_address": "192.168.1.1",
      "timestamp": "2026-07-06T16:00:00Z"
    }
  ],
  "total": 1240,
  "page": 1
}
```

---

## Error Reference

All errors follow this schema:

```json
{
  "detail": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "request_id": "req_abc123"
}
```

### HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | OK — request succeeded |
| 201 | Created — resource created |
| 204 | No Content — delete succeeded |
| 400 | Bad Request — malformed request |
| 401 | Unauthorized — invalid or missing token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource does not exist |
| 409 | Conflict — resource already exists |
| 413 | Payload Too Large — file exceeds 50MB |
| 415 | Unsupported Media Type — invalid file type |
| 422 | Unprocessable Entity — validation failed |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error — unexpected error |
| 503 | Service Unavailable — dependency down |

### Common Error Codes

| Code | Description |
|---|---|
| `INVALID_CREDENTIALS` | Wrong email or password |
| `TOKEN_EXPIRED` | Access token has expired |
| `TOKEN_INVALID` | Token signature invalid or malformed |
| `SESSION_REVOKED` | Refresh token has been revoked |
| `EMAIL_ALREADY_EXISTS` | Registration with duplicate email |
| `DOCUMENT_NOT_FOUND` | Document ID does not exist or not owned by user |
| `FILE_TOO_LARGE` | File exceeds 50MB limit |
| `UNSUPPORTED_FILE_TYPE` | File type not allowed |
| `DOCUMENT_PROCESSING` | Operation blocked — document not yet processed |
| `RATE_LIMIT_EXCEEDED` | Too many requests — includes `Retry-After` header |

---

## Pagination

List endpoints support cursor-free offset pagination:

```http
GET /api/v1/documents?page=2&page_size=20
```

**Pagination Response Fields**

| Field | Description |
|---|---|
| `items` | Array of results |
| `total` | Total record count |
| `page` | Current page (1-indexed) |
| `page_size` | Items per page |
| `pages` | Total number of pages |

---

## Rate Limits

| Endpoint Group | Limit | Window |
|---|---|---|
| Global | 200 requests | 1 minute per IP |
| Auth (login, register, refresh) | 10 requests | 1 minute per IP |
| Upload | 20 requests | 1 minute per IP |
| AI Chat | 30 requests | 1 minute per IP |

Exceeded limits return `429 Too Many Requests` with:
```http
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720281600
```

---

## Request Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | Protected routes | `Bearer <access_token>` |
| `Content-Type` | POST/PATCH | `application/json` or `multipart/form-data` |
| `X-Request-ID` | Optional | Custom request ID (auto-generated if absent) |

## Response Headers

| Header | Description |
|---|---|
| `X-Request-ID` | Unique request identifier for log correlation |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Encoding` | `gzip` (if response > 1KB) |
