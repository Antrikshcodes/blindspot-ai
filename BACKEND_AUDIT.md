# Backend Architecture Audit: Blindspot AI

**Document:** `BACKEND_AUDIT.md`  
**Date:** 2026-11-03  
**Status:** Complete  
**Auditor:** Senior Software Architect & Technical Lead  
**Repository:** [https://github.com/Antrikshcodes/blindspot-ai](https://github.com/Antrikshcodes/blindspot-ai)  
**Assigned Backend Engineer:** Pavitr Makhija (`pavitr` branch)  
**Assigned AI/Full-Stack Engineer:** Saureet Chakrabarti (`saureet` branch)  

---

## 1. Executive Summary

This audit assesses the current state of the backend subsystem for **Blindspot AI** before active backend implementation begins. The objective is to identify existing assets, evaluate architectural blueprints, catalogue missing dependencies and components, and establish a disciplined, risk-mitigated implementation sequence.

### Key Audit Verdict
The backend directory (`backend/`) is currently in an **uninitialized, documentation-only scaffold state**. There are **0 lines of backend application code**, **no package manifest**, **no database migrations**, **no active API endpoints**, and **no runnable test suites**. 

However, foundational shared contracts exist in `shared/types/` and `shared/constants/`, providing strict TypeScript interfaces and validation bounds that must be preserved and consumed during implementation.

---

## 2. Detailed Findings

### 2.1 Existing Backend Framework
* **Identified Framework in Code:** **None.**
* **Documented Target Framework:** Node.js (v18+ LTS) with Express (or Fastify) in TypeScript, specified in `backend/README.md` and `docs/ARCHITECTURE.md`.
* **Current Operational State:**
  * No `package.json` exists in `backend/` or the repository root.
  * No server entry point (`server.ts`, `app.ts`, `index.js`) exists.
  * No HTTP server is listening on any port.

### 2.2 Existing API Endpoints
* **Implemented Endpoints:** **0 active endpoints.**
* **Documented Target Contracts (`docs/API_DOCUMENTATION.md`):**
  1. **Project & Submission Lifecycle:**
     * `POST /api/v1/projects` — Initialize founder workspace.
     * `GET /api/v1/projects/:id` — Retrieve project metadata.
     * `POST /api/v1/projects/:id/submissions` — Ingest problem statement, target audience, and solution concept (Step 1).
     * `GET /api/v1/projects/:id/submissions` — Retrieve submission iteration history.
  2. **Assumption Deconstruction & Risk Prioritization:**
     * `POST /api/v1/submissions/:id/assumptions/extract` — Trigger AI extraction across Problem, Customer, Solution, Monetization domains (Step 2).
     * `GET /api/v1/submissions/:id/assumptions` — Retrieve categorized assumptions with deterministic risk scores (Step 3).
     * `PATCH /api/v1/assumptions/:id` — Adjust assumption category or user-overridden score.
  3. **Mom Test Interview Discovery:**
     * `POST /api/v1/assumptions/:id/interview-questions` — Generate non-leading behavioral questions (Step 4).
     * `GET /api/v1/projects/:id/interview-script` — Export aggregated interview script.
  4. **Feedback Ingestion & Contradiction Detection:**
     * `POST /api/v1/projects/:id/feedback` — Ingest raw qualitative notes/transcripts (Step 5).
     * `GET /api/v1/projects/:id/contradictions` — Expose conflicting evidence between customer notes (Step 6).
  5. **Experiment Generation:**
     * `POST /api/v1/assumptions/:id/experiments` — Generate falsifiable experiment recommendations (Step 7).
     * `GET /api/v1/projects/:id/experiments` — List project experiment cards.

### 2.3 Database Configuration
* **Active Database:** **None.**
* **Configuration Specification:**
  * `.env.example` defines `DATABASE_URL=your_database_url_here`.
  * `docs/ARCHITECTURE.md` specifies a dual-database strategy:
    * **Development:** SQLite (`backend/data/dev.db`) for zero-configuration local runs.
    * **Production (Replit Cloud):** PostgreSQL via connection string.
* **ORM / Query Engine:** Documented as Prisma or Drizzle ORM.
* **Schema & Migrations:** **0 migration files or schema definitions exist.** No SQL schemas or ORM configuration files (`schema.prisma` / `drizzle.config.ts`) are present.

### 2.4 Existing AI Integrations
* **Active LLM Client:** **None.**
* **Configuration Specification:**
  * `.env.example` contains generic placeholder `AI_API_KEY=your_ai_api_key_here`.
  * Architecture prescribes OpenAI / Anthropic / Groq structured JSON outputs with temperature set to $0.2–0.4$.
* **Current Operational State:**
  * No AI provider SDKs (`openai`, `@anthropic-ai/sdk`, etc.) are installed.
  * No prompt templates or system instructions exist in code.
  * No Zod runtime schema validators exist for parsing LLM JSON outputs.

### 2.5 Execution Check
* **Can the backend run?** **No.**
* **Verification Command:**
  ```bash
  cd backend && npm run dev
  ```
* **Result:** Fails immediately with `npm ERR! enoent ENOENT: no such file or directory, open 'backend/package.json'`.

### 2.6 Test Suite Execution Check
* **Can existing tests run?** **No.**
* **Verification Command:**
  ```bash
  npm test
  ```
* **Result:** No test runner (Vitest/Jest) or test files (`*.test.ts`, `*.spec.ts`) exist. Only descriptive documentation exists in `tests/README.md`.

---

## 3. Existing Assets to Preserve

The audit confirmed the following assets are fully functional, correctly typed, and must be strictly preserved without breaking changes:

1. **`shared/types/index.ts`:**
   * Core data contracts: `Project`, `Submission`, `Assumption`, `InterviewQuestion`, `InterviewNote`, `FeedbackMapping`, `Contradiction`, `Experiment`.
   * Standard response envelopes: `ApiResponse<T>` and `ApiErrorResponse`.
2. **`shared/constants/index.ts`:**
   * Enums: `AssumptionCategory`, `AssumptionStatus`, `ProbeType`, `EvidenceSentiment`, `ExperimentType`.
   * Scoring bounds: `RISK_SCORING.MIN_SCORE (1)`, `RISK_SCORING.MAX_SCORE (5)`, `RISK_SCORING.LETHAL_THRESHOLD (15)`.
   * Validation boundaries: `VALIDATION_LIMITS` for product name, target audience, and problem statement character lengths.
3. **`shared/index.ts`:**
   * Root barrel export for shared modules.
4. **`.github/workflows/ci.yml`:**
   * Baseline security CI workflow that scans for committed `.env` secrets.

---

## 4. Technical Problems & Vulnerabilities

| ID | Issue Description | Severity | Impact | Mitigation Plan |
|:---|:---|:---:|:---|:---|
| **TP-01** | Missing `backend/package.json` | **High** | Cannot install dependencies or start HTTP server. | Initialize Node.js/TypeScript package manifest. |
| **TP-02** | Missing TypeScript Configuration | **High** | Cannot compile TypeScript or resolve `@shared` imports. | Add `backend/tsconfig.json` with path aliases. |
| **TP-03** | Missing Database Engine & Schema | **High** | Cannot persist projects or validation pipeline data. | Initialize SQLite/PostgreSQL with Prisma or Drizzle ORM. |
| **TP-04** | Ambiguous AI Provider Key in `.env.example` | **Medium** | Developers do not know which provider/model is expected. | Update `.env.example` with specific provider keys (e.g. `OPENAI_API_KEY`, `OPENAI_MODEL`). |
| **TP-05** | No Runtime Schema Validation | **Medium** | High risk of runtime crashes if LLM returns malformed JSON. | Implement Zod schemas corresponding to `shared/types/`. |
| **TP-06** | No CORS or Error Handling Middleware | **Medium** | Client-server communication will fail or leak stack traces. | Scaffold centralized Express middleware. |

---

## 5. Required Dependencies

To establish a production-grade, Replit-compatible backend, the following dependencies must be declared:

### 5.1 Production Dependencies
```json
{
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8",
    "better-sqlite3": "^11.5.0",
    "prisma": "^5.21.0",
    "@prisma/client": "^5.21.0",
    "openai": "^4.68.0"
  }
}
```

### 5.2 Development & Build Dependencies
```json
{
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^20.17.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/better-sqlite3": "^7.6.11",
    "tsx": "^4.19.1",
    "vitest": "^2.1.3"
  }
}
```

---

## 6. Recommended Implementation Order (Phased Execution)

To preserve system stability and enable parallel work between Pavitr (Backend) and Saureet (AI Engine), implementation should proceed strictly in the following 6 phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BACKEND IMPLEMENTATION ORDER                    │
│                                                                        │
│  [Phase 1: Environment & Tooling Scaffold]                             │
│     • backend/package.json, tsconfig.json, tsx dev runner              │
│                                │                                       │
│                                ▼                                       │
│  [Phase 2: Database Layer & Relational Models]                         │
│     • Prisma / Drizzle schema setup (Projects, Submissions, etc.)       │
│     • Local SQLite dev.db migration scripts                            │
│                                │                                       │
│                                ▼                                       │
│  [Phase 3: Core HTTP Server & Health Endpoints]                        │
│     • Express app initialization, CORS, global error middleware        │
│     • GET /api/v1/health & request logging                             │
│                                │                                       │
│                                ▼                                       │
│  [Phase 4: CRUD Endpoints (Step 1: Projects & Submissions)]            │
│     • POST /api/v1/projects                                            │
│     • POST /api/v1/projects/:id/submissions                            │
│     • Input validation using Zod and VALIDATION_LIMITS                 │
│                                │                                       │
│                                ▼                                       │
│  [Phase 5: Deterministic Scoring & AI Adapter (Steps 2–3)]             │
│     • Deterministic 2D risk calculation (Impact x Uncertainty)         │
│     • OpenAI/Anthropic structured JSON prompt service                  │
│     • POST /api/v1/submissions/:id/assumptions/extract                 │
│                                │                                       │
│                                ▼                                       │
│  [Phase 6: Advanced Validation Services (Steps 4–7)]                   │
│     • Mom Test Interview Generation                                    │
│     • Feedback Ingestion & Contradiction Detection                     │
│     • Experiment Recommendation Engine                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Milestone Checklist for Engineering Team

- [ ] **Phase 1 Complete:** `backend/package.json` and `backend/tsconfig.json` configured; `npm run dev` starts a minimal server.
- [ ] **Phase 2 Complete:** Database models generated from `shared/types/`; SQLite database created and seeded with a test project.
- [ ] **Phase 3 Complete:** Express server responds with `200 OK` on `/api/v1/health` with typed `ApiResponse<HealthCheck>`.
- [ ] **Phase 4 Complete:** Endpoints for Project creation and Submission creation pass unit tests.
- [ ] **Phase 5 Complete:** Pure risk scoring function verified by unit tests; LLM assumption extraction returns validated schema.
- [ ] **Phase 6 Complete:** Complete 7-step pipeline testable via REST client or curl.

