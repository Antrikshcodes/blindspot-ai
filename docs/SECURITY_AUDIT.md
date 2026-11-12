# BLINDSPOT AI — SECURITY AUDIT & THREAT MODEL
**Phase 15 Security Review**  
**Repository:** [https://github.com/Antrikshcodes/blindspot-ai](https://github.com/Antrikshcodes/blindspot-ai)  
**Date:** November 12, 2026

---

## 1. Threat Model & Trust Boundaries

Blindspot AI processes early-stage startup intellectual property, proprietary assumptions, qualitative customer interview verbatim transcripts, and technical architectural requirements. Security of project boundaries and user isolation is critical.

### Trust Boundary Architecture
```
[ Browser / React SPA ]
       │  (Clerk JWT in Authorization Header / Same-Origin Cookie)
       ▼
[ Cloudflare / Reverse Proxy ]
       │  (Strict TLS, Origin Verification)
       ▼
[ Express API Server ]
       │  ├─ helmet() (Security Headers)
       │  ├─ express-rate-limit (API: 60/min, AI: 10/min)
       │  ├─ clerkMiddleware() (Cryptographic JWT Verification)
       │  └─ Zod Contract Parsers (.strict() validation)
       ▼
[ PostgreSQL / PGlite ]
          (Owner-Scoped Queries: WHERE owner_id = :owner)
```

---

## 2. Security Assessment Matrix

| Vulnerability Category | OWASP Ref | Implementation Defense | Status |
| :--- | :--- | :--- | :---: |
| **Broken Object Level Auth (IDOR)** | API1:2023 | All project, analysis, and notification queries filter strictly by `ownerId(res)`. | **VERIFIED** |
| **Broken Authentication** | API2:2023 | Clerk asymmetric cryptographic verification. Malformed bearer tokens rejected fail-closed. | **VERIFIED** |
| **Broken Object Property Level Auth** | API3:2023 | Zod schemas enforce `.strict()`; unexpected payload fields trigger 400 Validation Error. | **VERIFIED** |
| **Unrestricted Resource Consumption** | API4:2023 | Separate rate limiters for general API endpoints and AI orchestration routes. Payload size limited to 128 KB. | **VERIFIED** |
| **Security Misconfiguration** | API5:2023 | `helmet()` enabled, `x-powered-by` disabled, `Cache-Control: no-store` on authenticated API responses. | **VERIFIED** |
| **Server-Side Request Forgery (SSRF)** | API6:2023 | Resource intelligence providers validate public URLs; loopback and private IPv4/IPv6 ranges rejected. | **VERIFIED** |
| **Cross-Site Request Forgery (CSRF)** | API7:2023 | State-changing requests verify `Origin` header against authorized hostnames. | **VERIFIED** |
| **Information Disclosure** | API8:2023 | Express error handler returns structured `{ success: false, error: { code, message } }`; stack traces omitted. | **VERIFIED** |
| **Injection (SQL & NoSQL)** | API9:2023 | Drizzle ORM uses parameterized SQL queries exclusively; no raw string interpolation in queries. | **VERIFIED** |

---

## 3. Secret Management Audit
- Secrets are sourced solely from environment variables (`CLERK_SECRET_KEY`, `DATABASE_URL`, `OPENAI_API_KEY`).
- No hardcoded private keys or production secrets exist in the repository tree.
- Logging via `pino` redacts sensitive request headers and authorization credentials.
