# System Architecture: Blindspot AI

**Document Version:** 1.1.0  
**Status:** Architecture Blueprint & Repository Audit  
**Author:** Technical Leadership & Engineering Architecture Team (Null Theory)  
**Project:** Blindspot AI  
**Hackathon:** CoNSTruct 2.0 (Replit × Newton School of Technology)  

---

## 1. Executive Summary & Audit Baseline

This document specifies the technical architecture for **Blindspot AI**, an AI-powered product validation engine built to challenge startup assumptions before founders commit engineering resources.

To maintain strict engineering integrity, this architecture distinguishes between:
1. **Existing Implementation Status (Audited Day 1):** The operational state of the repository at the start of the sprint.
2. **Proposed Target Architecture (Sprint Implementation):** The modular, production-ready system to be developed across the 20-day development cycle.

---

## 2. Existing Repository Audit (Current Baseline)

A thorough audit of commit history, directory structures, and configuration files was completed prior to drafting this architecture:

| Subsystem | Existing State in Repository | Implementation Reality |
|:---|:---|:---|
| **Frontend** | Directory `frontend/` contains only `README.md` | **0% implemented.** No web framework, bundler, or view components exist. |
| **Backend** | Directory `backend/` contains only `README.md` | **0% implemented.** No runtime server, router, or API controller code exists. |
| **Database** | No ORM, migrations, or database client configuration | **0% implemented.** No persistent schema or connection logic exists. |
| **AI Integration** | `.env.example` contains placeholder `AI_API_KEY` | **0% implemented.** No LLM client, prompt templates, or orchestration logic exists. |
| **Authentication** | Generic placeholder JWT/Session secrets in `.env.example` | **0% implemented.** No auth middleware, token verification, or session store exists. |
| **Dependencies** | No `package.json`, `requirements.txt`, or `pyproject.toml` | **No runtime dependencies declared yet.** Clean slate for stack selection. |
| **Testing** | Directory `tests/` contains only `README.md` | **0% implemented.** No test harness or automated test suites exist. |
| **DevOps / CI** | `.github/workflows/ci.yml` active on `main` and `develop` | **Functional baseline.** Verifies folder structure, documentation presence, and scans against committed `.env` secrets. |
| **Deployment** | Documentation references Replit | **Unconfigured.** No `.replit` configuration or Nix environment manifests exist yet. |

---

## 3. Target System Architecture (Proposed)

The target architecture is structured as a decoupled client-server application optimized for rapid, reliable execution on the Replit cloud runtime.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                              │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                  Single Page Application (SPA)                 │   │
│   │                                                                │   │
│   │  ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐  │   │
│   │  │ Idea Intake   │ │ Assumption    │ │ Interview Question   │  │   │
│   │  │ Wizard        │ │ Risk Matrix   │ │ Generator & Exporter │  │   │
│   │  └───────────────┘ └───────────────┘ └──────────────────────┘  │   │
│   │  ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐  │   │
│   │  │ Raw Feedback  │ │ Contradiction │ │ Experiment Action    │  │   │
│   │  │ Ingestion Hub │ │ & Bias Viewer │ │ Recommendation Board │  │   │
│   │  └───────────────┘ └───────────────┘ └──────────────────────┘  │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │ HTTPS / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                              │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway & Routing Layer                   │  │
│  │             (CORS, Request Validation, Error Handling)            │  │
│  └───────┬──────────────────────┬──────────────────────┬────────────┘  │
│          │                      │                      │               │
│          ▼                      ▼                      ▼               │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐       │
│  │ Project & Auth│      │ Validation    │      │ Feedback &    │       │
│  │ Service       │      │ Engine Core   │      │ Contradiction │       │
│  └───────┬───────┘      └───────┬───────┘      └───────┬───────┘       │
│          │                      │                      │               │
│          │              ┌───────┴───────┐              │               │
│          │              │ AI Provider   │              │               │
│          │              │ Adapter (LLM) │              │               │
│          │              └───────┬───────┘              │               │
│          │                      │                      │               │
│          ▼                      ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                       Data Access Layer (ORM)                    │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │ SQL Queries / Migrations
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                            │
│                  Relational Database (PostgreSQL / SQLite)             │
│                                                                        │
│  • Projects & Submissions      • Categorized Assumptions               │
│  • Risk Scores (Impact/Uncert) • Interview Question Scripts            │
│  • Ingested Feedback Notes     • Contradiction & Experiment Models     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Subsystem Breakdown

### 4.1 Frontend Architecture
* **Primary Responsibilities:**
  * Render an intuitive, distraction-free SaaS interface adhering to high typographic and visual hierarchy standards.
  * Guide users through the 7-step validation process without overwhelming cognitive load.
  * Visualize multi-dimensional risk scores via a 2D matrix (Impact vs. Uncertainty).
  * Render structured interview question guides with copy/export capabilities.
  * Provide inline highlighting for conflicting evidence detected across customer feedback transcripts.
* **Component Hierarchy:**
  ```text
  frontend/src/
  ├── components/
  │   ├── common/             # Button, Input, Card, Modal, Badge, Tooltip
  │   ├── layout/             # Header, Navigation, Sidebar, PageContainer
  │   ├── submission/         # IdeaInputForm, CharacterCounter, ProblemDefiner
  │   ├── assumptions/        # AssumptionCard, RiskMatrix2D, LethalBadge
  │   ├── interviews/         # QuestionList, MomTestTipBanner, ScriptExporter
  │   ├── feedback/           # FeedbackIngestModal, TranscriptMapper
  │   ├── contradictions/     # ContradictionAlert, QuoteEvidenceCard
  │   └── experiments/        # ExperimentCard, FalsificationMetricBadge
  ├── hooks/                  # Custom API and state hooks
  ├── services/               # API client abstraction (fetch/axios)
  ├── types/                  # Shared TypeScript data contracts
  └── views/                  # Top-level screen views
  ```

### 4.2 Backend Architecture
* **Primary Responsibilities:**
  * Expose RESTful endpoints with strict request-payload schema validation.
  * Orchestrate the AI validation engine and manage prompt templates.
  * Enforce strict JSON output parsing from LLM responses to ensure determinism.
  * Manage persistence, transactions, and relational data integrity.
* **Service Layout:**
  ```text
  backend/src/
  ├── controllers/            # HTTP request/response handlers
  ├── middleware/             # Error handling, request logging, CORS, auth
  ├── services/
  │   ├── project.service     # CRUD operations for founder projects
  │   ├── assumption.service  # Business logic for assumption management
  │   ├── scoring.service     # Deterministic risk computation logic
  │   ├── feedback.service    # Feedback ingestion and text parsing
  │   └── ai/
  │       ├── client          # Provider-agnostic LLM interface
  │       ├── prompts         # Version-controlled prompt engineering templates
  │       └── parsers         # Schema validation for raw LLM JSON outputs
  ├── models/                 # Database entity definitions / ORM models
  └── config/                 # Environment validation and application settings
  ```

### 4.3 Database Schema Design (Target)

The relational schema ensures full auditability from the initial raw idea through to specific interview quotes that validated or invalidated each assumption:

```
┌──────────────┐       1:N       ┌──────────────┐
│   projects   │────────────────<│  submissions │
└──────────────┘                 └──────┬───────┘
                                        │ 1:N
                                        ▼
                                 ┌──────────────┐
                                 │  assumptions │
                                 └──────┬───────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 │ 1:N                  │ 1:N                  │ 1:N
                 ▼                      ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │interview_questns│    │ interview_notes │    │   experiments   │
        └─────────────────┘    └────────┬────────┘    └─────────────────┘
                                        │ 1:N
                                        ▼
                               ┌─────────────────┐
                               │ contradictions  │
                               └─────────────────┘
```

#### Schema Specifications:
1. **`projects`**: Workspace container (`id`, `title`, `created_at`, `updated_at`).
2. **`submissions`**: Versioned idea iterations (`id`, `project_id`, `product_name`, `target_audience`, `problem_statement`, `solution_concept`).
3. **`assumptions`**: Individual hypotheses extracted by AI (`id`, `submission_id`, `category` [PROBLEM|CUSTOMER|SOLUTION|MONETIZATION], `statement`, `impact_score` [1-5], `uncertainty_score` [1-5], `composite_risk`, `is_lethal`, `status` [UNVERIFIED|SUPPORTED|INVALIDATED]).
4. **`interview_questions`**: Discovery questions tied to assumptions (`id`, `assumption_id`, `question_text`, `rationale`, `probe_goal`).
5. **`interview_notes`**: Customer feedback transcripts (`id`, `project_id`, `interviewee_identifier`, `raw_text`, `created_at`).
6. **`feedback_mappings`**: Mapping notes to assumptions (`id`, `note_id`, `assumption_id`, `sentiment` [SUPPORTING|INVALIDATING|NEUTRAL], `excerpt_quote`).
7. **`contradictions`**: Detected conflicts (`id`, `assumption_id`, `quote_a`, `quote_b`, `analysis_summary`).
8. **`experiments`**: Recommended de-risking actions (`id`, `assumption_id`, `experiment_type`, `description`, `metric`, `falsification_threshold`, `duration_days`).

---

## 5. AI Processing Workflow & Guardrails

To prevent hallucination, prompt injection, and generic outputs, all AI interactions must adhere to four strict architectural constraints:

```
[Raw User Input]
       │
       ▼
[Input Sanitizer & Length Validator]
       │
       ▼
[System Prompt + Few-Shot Mom Test Examples + Context]
       │
       ▼
[LLM Provider API Call (Temperature: 0.2–0.4)]
       │
       ▼
[Strict JSON Schema Validator (Zod / Pydantic)]
 ├── Success ──> [Deterministic Risk Scoring & Persist] ──> [Client Response]
 └── Failure ──> [Automatic Single Retry with Repair Prompt]
                  └── Failure ──> [Graceful Fallback Error Response]
```

### 5.1 Deterministic Grounding
* **Prompt Isolation:** Raw user input is passed as isolated data variables rather than concatenated directly into system instructions to prevent prompt injection.
* **Temperature Setting:** Set low ($0.2$ to $0.4$) to minimize probabilistic variance and enforce consistent analytical rigor.
* **Deterministic Risk Scoring:** The AI outputs discrete integer assessments for Impact ($1..5$) and Uncertainty ($1..5$) along with qualitative rationales. Composite scoring ($Impact \times Uncertainty$) is calculated deterministically in backend application code, never delegated to LLM arithmetic.

---

## 6. Authentication Flow (Target Design)

While Day 1 operates in an open development prototype state, the target production authentication flow will provide isolated user workspaces:
1. **Token Generation:** Stateless JSON Web Tokens (JWT) signed with `JWT_SECRET`.
2. **Access Control:** Middleware verifies the `Authorization: Bearer <token>` header on all non-public endpoints.
3. **Workspace Isolation:** Every data query scopes implicitly by `user_id` or `project_id` associated with the authenticated session.

---

## 7. Security & Compliance Architecture

* **Zero Committed Secrets:** Repository actively enforces this via `.github/workflows/ci.yml` scanning and `.gitignore`.
* **Environment Separation:** API keys, database URLs, and session secrets are loaded strictly from environment variables or Replit Secrets.
* **Data Sanitization:** All incoming text is sanitized against HTML and script injection before persistence and rendering.
* **Rate Limiting:** API endpoints will enforce tiered rate limits to prevent denial-of-service and runaway AI token consumption.

---

## 8. Technology Stack Selection (Sprint Decision)

Based on the sprint timeline (20 days) and target deployment platform (Replit), the engineering team has selected the following stack:

| Tier | Technology Choice | Architectural Justification |
|:---|:---|:---|
| **Language** | TypeScript (Full-Stack) | Shared data schemas between frontend and backend; end-to-end type safety. |
| **Frontend** | React + Vite + Tailwind CSS | Fast development velocity, minimal bundle footprint, rapid hot-reloading on Replit. |
| **Backend** | Node.js + Express (or Fastify) | High I/O concurrency for async AI calls; seamless TypeScript execution via `tsx`/`ts-node`. |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Zero-configuration local startup with immediate migration path to hosted Postgres on Replit. |
| **ORM / Query** | Prisma or Drizzle ORM | Type-safe migrations and queries aligned with TypeScript contracts. |
| **AI Integration**| OpenAI API / Anthropic API / Groq | Industry-standard structured JSON mode outputs with fast latency. |
| **Deployment** | Replit Cloud | Direct compliance with CoNSTruct 2.0 hackathon hosting requirements. |
