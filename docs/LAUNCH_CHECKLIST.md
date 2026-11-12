# Blindspot AI — Official Production Launch Checklist

## Pre-Launch Verification

- [x] **Repository Integrity**: Git working copy clean on `main` branch.
- [x] **Code Quality & Builds**:
  - [x] Backend TypeScript build (`npm --prefix backend run build`) compiles with zero errors.
  - [x] Frontend Vite bundle (`npm --prefix frontend run build`) compiles with zero circular dependencies and all chunks under 400 kB.
  - [x] Backend automated test suite (133 tests) passing 100%.
  - [x] Frontend integration test suite (32 tests) passing 100%.
- [x] **Database Safety**:
  - [x] Forward-only migrations (`0000` through `0006`) tested on PostgreSQL 15+.
  - [x] Connection pooling configured with SSL `require`.
  - [x] Automated daily backup and point-in-time recovery enabled.
- [x] **Security & Secret Isolation**:
  - [x] Zero hardcoded secrets, API keys, or active `.env` files in git tree.
  - [x] Identity & tenancy: All queries scoped to verified Clerk `owner_id`.
  - [x] IDOR defense: Accessing foreign projects returns HTTP 404.
  - [x] Rate limiting: Express rate limits active on API and AI endpoints.
  - [x] Security headers: Helmet and CSP headers configured.
- [x] **Infrastructure & Deployment Manifests**:
  - [x] Backend Dockerfile (multi-stage Node 20 LTS with non-root user).
  - [x] Frontend Dockerfile & Nginx reverse proxy configuration.
  - [x] Vercel deployment manifest (`frontend/vercel.json`) with SPA fallback and security headers.
  - [x] Cloudflare / Netlify SPA redirects (`frontend/public/_redirects`).
  - [x] Multi-container local/staging orchestration (`docker-compose.yml`).
- [x] **SEO & Public Launch Assets**:
  - [x] Search engine crawler configuration (`frontend/public/robots.txt`).
  - [x] Canonical sitemap (`frontend/public/sitemap.xml`).
  - [x] Social share card (`frontend/public/og-image.svg`).
  - [x] Open Graph & Twitter summary card tags in `frontend/index.html`.

---

## Production Environment Variables Checklist

Ensure the following variables are configured in production hosting environments:

### Backend Hosting (Railway / Render / Fly.io)
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CORS_ORIGIN=https://blindspot-ai.com,https://blindspot-ai.vercel.app
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-proj-...
GITHUB_TOKEN=ghp_...
HUGGINGFACE_TOKEN=hf_...
API_RATE_LIMIT=120
AI_RATE_LIMIT=10
CACHE_TTL=900
```

### Frontend Hosting (Vercel / Cloudflare Pages)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_BASE_URL=https://api.blindspot-ai.com
```

---

## DNS & Domain Routing Setup

1. **Frontend Apex Domain (`blindspot-ai.com`)**:
   - `A` Record: `@` -> Host IP / Vercel Edge `76.76.21.21`
   - `CNAME` Record: `www` -> `cname.vercel-dns.com`
2. **Backend API Subdomain (`api.blindspot-ai.com`)**:
   - `CNAME` Record: `api` -> Host target (e.g. `blindspot-backend.up.railway.app` or `srv-....onrender.com`)
3. **Clerk Domain Whitelist**:
   - In Clerk Dashboard -> API Keys / Domains, add `blindspot-ai.com` and `api.blindspot-ai.com` to Allowed Origins and Authorized Redirects.

---

## Post-Deploy Smoke Verification (Step-by-Step)

1. **Health Probe**:
   ```bash
   curl -i https://api.blindspot-ai.com/health
   # Expected: HTTP 200 {"success":true,"data":{"status":"ok","database":"connected"}}
   ```
2. **Landing Page Access**:
   - Navigate to `https://blindspot-ai.com`. Verify hero animations, editorial typography, and interactive deconstruction visual.
3. **Founder Authentication**:
   - Click "Get Started Free" / "Sign In". Complete Clerk auth flow. Confirm seamless transition to `/dashboard` or `/projects`.
4. **Project Creation & Real AI Analysis**:
   - Create a test startup project (e.g. "Campus peer tutoring marketplace").
   - Click "Start AI Analysis". Verify streaming/completion of 5x5 interactive risk matrix.
5. **Customer Discovery & Experiments**:
   - Generate Mom Test interview questions.
   - Record feedback notes and verify contradiction detection.
   - Create a validation experiment and transition status to `IN_PROGRESS`.
6. **Resource Library**:
   - Search across GitHub and Hugging Face. Bookmark a candidate resource.

---

## Rollback Triggers & Procedure

Trigger immediate rollback if:
- Health check returns HTTP 503 for > 60 consecutive seconds.
- Clerk authentication fails for valid user credentials.
- Database query latency exceeds 2,000ms.

**Rollback Action**:
- Frontend: Click "Instant Rollback" in Vercel/Cloudflare console.
- Backend: Rollback deployment image in Railway/Render dashboard.
