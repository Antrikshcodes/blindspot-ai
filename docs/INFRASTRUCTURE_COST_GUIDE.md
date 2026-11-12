# Blindspot AI — Infrastructure Cost & Resource Management Guide

## 1. Executive Summary

Blindspot AI is engineered specifically for early-stage startup teams and student founders. The infrastructure design emphasizes **near-zero fixed overhead**, leveraging robust free-tier allocations and highly cost-efficient consumption models for AI and compute.

Under baseline launch volumes (< 500 active founders), the total monthly operating cost is estimated between **$0.00 and $12.00 / month**.

---

## 2. Infrastructure Tier Cost Matrix

| Component | Recommended Provider | Tier / Plan | Free Allocation Limits | Estimated Cost (Baseline) | Estimated Cost (1,000 MAU) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Hosting** | Vercel or Cloudflare Pages | Free / Hobby | 100 GB bandwidth/mo, unlimited requests, global CDN edge | **$0.00** | **$0.00** (Within free tier) |
| **Backend API** | Railway or Render | Starter / Hobby | Railway $5 free credit/mo; Render Starter at $7/mo (512 MB RAM, 0.5 CPU) | **$0.00 - $7.00** | **$7.00 - $14.00** |
| **Managed Database** | Neon Serverless PostgreSQL | Free Tier | 0.5 GB storage, auto-suspend compute (300 hours/mo active) | **$0.00** | **$0.00 - $5.00** (Storage expansion) |
| **Authentication** | Clerk Auth | Free Plan | 10,000 Monthly Active Users (MAU), unlimited logins | **$0.00** | **$0.00** (Up to 10k MAU) |
| **AI Analysis Engine** | OpenAI API (`gpt-4o-mini`) | Pay-as-you-go | \$0.15 / 1M input tokens, \$0.60 / 1M output tokens | **~$0.003 per analysis** (~$3.00 for 1,000 runs) | **$15.00 - $25.00** |
| **Resource APIs** | GitHub / Hugging Face / APIs.guru | Public / Free | GitHub PAT: 5,000 req/hr; HF: 30,000 req/mo; APIs.guru: Open | **$0.00** | **$0.00** |
| **Telemetry / Logs** | Sentry Developer / Pino Stdout | Developer Free | 5,000 error events/mo, 10,000 performance transactions | **$0.00** | **$0.00** |
| **Total Monthly** | — | — | — | **$3.00 - $10.00 / mo** | **$22.00 - $44.00 / mo** |

---

## 3. Unit Economics per AI Analysis

Each Blindspot AI validation analysis executes structured hypothesis extraction and Mom Test interview generation:

- **Prompt Input Context**: Project problem statement, solution, target audience, and existing alternatives (~800 to 1,200 tokens).
- **Structured Schema Output**: 5 to 10 scored assumptions, taxonomy classifications, why it matters, validation methods, and interview questions (~1,200 to 1,800 tokens).
- **Cost Calculation using `gpt-4o-mini`**:
  - Input: $1,000 \text{ tokens} \times \$0.15 / 1,000,000 = \$0.00015$
  - Output: $1,500 \text{ tokens} \times \$0.60 / 1,000,000 = \$0.00090$
  - Total marginal cost per full AI analysis: **\$0.00105 (approximately one-tenth of one cent)**.
  - Even with `gpt-4o` for deep multidimensional analysis (~$2.50 / 1M input, $10.00 / 1M output), cost is **~$0.0175 per run** (under 2 cents).

---

## 4. Built-in Cost Safeguards & Throttles

The Blindspot AI codebase enforces architectural safeguards to protect against accidental cost runaways:

1. **Per-IP Rate Limiting**:
   - General API endpoints: 120 requests/minute.
   - AI-generating routes: 10 requests/minute (`express-rate-limit`).
2. **In-Memory Query Result Caching**:
   - External provider search results are cached for 15 minutes (`CACHE_TTL=900`) with a 100-result LRU cache.
   - Identical search queries execute zero outbound HTTP requests to external APIs.
3. **Strict Payload Bounds**:
   - Project problem statement: max 4,000 characters.
   - Additional market context: max 6,000 characters.
   - Max assumptions per analysis: 15.
   - Prevents prompt-injection token ballooning attacks.
4. **Timeouts & Failure Circuit Breakers**:
   - AI generation timeout: 45 seconds (`AI_TIMEOUT_MS=45000`).
   - External provider timeout: 8 seconds (`EXTERNAL_TIMEOUT_MS=8000`).
   - Provider concurrency capped at 3 simultaneous requests.

---

## 5. Scaling Inflection Points & Upgrade Triggers

| Milestone | Key Cost Drivers | Recommended Action | Expected Monthly Budget |
| :--- | :--- | :--- | :--- |
| **0 – 1,000 MAU (MVP)** | Baseline hosting | Free tiers across Vercel, Neon, Clerk; Starter backend | **$5 – $15** |
| **1,000 – 10,000 MAU** | Database storage & connection pooling | Upgrade Neon to Launch plan ($19/mo) for dedicated CPU; Redis cache | **$35 – $75** |
| **10,000 – 50,000 MAU** | Clerk user tier & AI token volume | Clerk Pro ($25/mo + $0.02/extra user); bulk OpenAI volume discounting | **$150 – $350** |
