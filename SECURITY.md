# Security Policy

## Supported Versions

We actively maintain security fixes for the following versions:

| Version | Supported |
|---|---|
| `main` (latest) | ✅ Yes |
| Previous releases | ❌ No — please upgrade |

---

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities as public GitHub Issues.**

Security vulnerabilities disclosed publicly can be exploited by malicious actors before a fix is available.

### How to Report

**Option 1 — GitHub Security Advisory (preferred)**

Use GitHub's private vulnerability reporting:
👉 [Report a vulnerability](https://github.com/your-org/documind-ai/security/advisories/new)

This creates a private advisory that only maintainers can see.

**Option 2 — Encrypted Email**

If GitHub advisories are not available, email the security team:

```
security@documind.ai
```

Include as much of the following as possible:
- Type of vulnerability (SQL injection, XSS, authentication bypass, etc.)
- Full path of the affected source file
- Configuration required to reproduce
- Step-by-step reproduction instructions
- Proof-of-concept or exploit code (if available)
- Impact assessment

### Response Timeline

| Stage | Timeframe |
|---|---|
| Initial acknowledgement | Within 48 hours |
| Severity assessment | Within 5 business days |
| Fix development | Depends on severity (see below) |
| Public disclosure | After fix is released |

### Severity Levels & Fix Timelines

| Severity | CVSS Score | Fix Target |
|---|---|---|
| **Critical** | 9.0–10.0 | Within 24–72 hours |
| **High** | 7.0–8.9 | Within 7 days |
| **Medium** | 4.0–6.9 | Within 30 days |
| **Low** | 0.1–3.9 | Next release cycle |

---

## Security Architecture

DocuMind AI implements the following security controls:

### Authentication & Authorization
- JWT access tokens (15-minute expiry) + refresh tokens (7-day expiry)
- Refresh token rotation on every use
- Session revocation support
- bcrypt password hashing (12 rounds minimum)
- Role-based access control (RBAC): `user` / `admin`

### API Security
- Rate limiting per IP (global: 200/min, auth: 10/min)
- Request size limits (non-upload requests: 1MB max)
- CORS policy — allowlist only
- OWASP security headers on all responses
- Request ID tracing for audit purposes

### Infrastructure
- Non-root Docker containers (uid 1001)
- Network isolation (internal Docker bridge — no direct service exposure)
- Secrets via environment variables (never in source code)
- Dependency vulnerability scanning on every PR (pip-audit, npm audit)
- Secret detection on every commit (Gitleaks)

### Input Validation
- Pydantic v2 schema validation on all API inputs
- Email validation, password strength enforcement
- File type and size validation on uploads

---

## Dependency Security

We use automated tooling to keep dependencies secure:

- **Dependabot** — Weekly PRs for dependency updates
- **pip-audit** — Python CVE scanning (runs on every PR)
- **npm audit** — Node CVE scanning (runs on every PR, fails on HIGH/CRITICAL)
- **Trivy** — Container image scanning (runs on push to main)
- **Bandit** — Python SAST (advisory, runs on every PR)

---

## Known Security Considerations

The following are known limitations / accepted risks:

1. **Tesseract OCR** — Runs in the backend container. Malicious files could potentially exploit tesseract vulnerabilities. Mitigation: file type validation, size limits, process isolation.
2. **Gemini API** — External AI API. User document content is sent to Google's API. Users should be aware of this data flow.
3. **sentence-transformers** — Downloads model weights on first run. Model integrity is not verified beyond HTTPS.

---

## Security Hall of Fame

We appreciate responsible disclosure. Reporters who help us fix security issues will be credited here (with permission).

_No entries yet._

---

## Changelog

| Date | Milestone | Change |
|---|---|---|
| 2026-07-06 | M9 | Rate limiting, security headers, request ID middleware |
| 2026-07-06 | M11 | Automated security testing in CI |
| 2026-07-06 | M13 | Gitleaks + Trivy + Bandit in CI pipeline |
