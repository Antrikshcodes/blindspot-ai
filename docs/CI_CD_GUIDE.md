# Blindspot AI — Continuous Integration & Continuous Deployment (CI/CD) Guide

## Overview

Blindspot AI employs a dual-stage GitHub Actions workflow suite to guarantee code quality, secret isolation, migration integrity, and reliable production deployments.

---

## 1. Workflow Architecture

```mermaid
flowchart LR
    subgraph PullRequest ["Pull Request Pipeline (ci.yml)"]
        PR_Code["PR / Feature Push"] --> Job_Backend["backend-quality<br/>(Node 20, tsc, Vitest 133 tests)"]
        PR_Code --> Job_Frontend["frontend-quality<br/>(Vite build, Node test runner 32 tests)"]
        PR_Code --> Job_Security["security-compliance<br/>(No .env committed, Docs check)"]
    end

    subgraph MergeMain ["Main Branch Deployment (deploy-production.yml)"]
        Merge["Push to main"] --> Job_Preflight["Pre-flight Build Verification"]
        Job_Preflight --> Job_Migrate["migrate-database<br/>(npm run db:migrate:prod)"]
        Job_Preflight --> Job_DeployFrontend["deploy-frontend<br/>(Vercel / Cloudflare Pages)"]
        Job_Migrate --> Job_DeployBackend["deploy-backend<br/>(Railway / Render Webhook)"]
        Job_DeployBackend --> Job_HealthCheck["verify-production-health<br/>(GET /health with retries)"]
        Job_DeployFrontend --> Job_HealthCheck
    end
```

---

## 2. GitHub Secrets Configuration

To enable automated deployment, configure the following secrets in GitHub Repository Settings (`Settings` -> `Secrets and variables` -> `Actions`):

| Secret Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | Production PostgreSQL connection string for migration runner | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key injected during frontend Vite build | `pk_live_...` or `pk_test_...` |
| `VITE_API_BASE_URL` | Deployed backend URL for frontend API proxy | `https://api.blindspot-ai.com` |
| `RAILWAY_TOKEN` | Railway CLI auth token (if deploying backend to Railway) | Personal / Team API Token |
| `RENDER_DEPLOY_HOOK` | Render Deploy Hook URL (if deploying backend to Render) | `https://api.render.com/deploy/srv-...?key=...` |
| `VERCEL_TOKEN` | Vercel Token (if deploying frontend to Vercel via CLI) | Personal Token from Vercel account |
| `VERCEL_ORG_ID` | Vercel Organization ID | From `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel Project ID | From `.vercel/project.json` |

---

## 3. Local Verification Commands

Before creating a pull request or pushing to `main`, run the local verification suite:

```bash
# 1. Typecheck and build backend
npm --prefix backend run build

# 2. Run backend test suite (133 tests)
npm --prefix backend test

# 3. Typecheck and build frontend
npm --prefix frontend run build

# 4. Run frontend test suite (32 tests)
npm --prefix frontend test

# 5. Verify no sensitive .env files exist in working tree
git status
```

---

## 4. Troubleshooting Common Failures

### Issue A: "Unsafe environment file detected"
- **Cause**: An active `.env` or `.env.local` was accidentally added to git staging.
- **Fix**: Run `git rm --cached .env .env.local backend/.env frontend/.env` and ensure `.gitignore` lists all `.env*` except `.env.example`.

### Issue B: "connect EPERM 127.0.0.1:..." during backend tests
- **Cause**: Testing in a sandbox environment that restricts loopback port binding.
- **Fix**: In CI (Ubuntu-latest runner), TCP loopback is unconstrained. Locally, execute tests with permitted loopback permissions.

### Issue C: "DATABASE_URL is required to run production migrations"
- **Cause**: Migration runner executed in production without connection secret.
- **Fix**: Verify `DATABASE_URL` secret is configured in the GitHub repository or deployment environment.

---

## 5. Rollback & Emergency Hotfix Protocol

If a production release introduces unexpected runtime errors:
1. **Frontend Rollback**:
   - In Vercel or Cloudflare Pages console, navigate to Deployments and click **"Promote to Production"** on the previous known healthy deployment. Instant rollback takes `< 5 seconds`.
2. **Backend Rollback**:
   - In Railway or Render console, trigger rollback to the previous container image hash.
3. **Database Safeguard**:
   - Because all schema migrations follow the **expand-and-contract** policy, previous backend code remains 100% compatible with the migrated database schema.
