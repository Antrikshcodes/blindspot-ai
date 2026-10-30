# Backend — Blindspot AI

> RESTful API server, AI orchestration engine, and persistence layer for Blindspot AI.

---

## Overview

The backend subsystem powers the 7-step product validation pipeline:
1. **Idea Intake Service:** Ingests and persists founder problem and audience statements.
2. **Assumption Engine:** Prompts LLMs with strict JSON schemas to extract unstated premises across Problem, Customer, Solution, and Viability domains.
3. **Scoring Engine:** Deterministically computes $Impact \times Uncertainty$ risk scores and flags lethal assumptions.
4. **Interview Discovery Service:** Generates non-leading Mom Test interview guides.
5. **Feedback & Contradiction Service:** Ingests unstructured customer notes, maps evidence to hypotheses, and highlights contradictory signals.
6. **Experiment Engine:** Prescribes concrete falsification experiments with defined failure thresholds.

---

## Architecture & Technology

* **Runtime:** Node.js (v18+ LTS)
* **Framework:** Express / Fastify (TypeScript)
* **Validation:** Zod schemas for all request payloads and LLM outputs
* **Persistence:** SQLite for local development (`dev.db`), PostgreSQL on Replit deployments
* **ORM:** Prisma / Drizzle ORM

---

## Planned Directory Structure

```text
backend/
├── src/
│   ├── controllers/      # Route request/response handlers
│   ├── middleware/       # Auth, error handling, CORS, rate limiting
│   ├── services/
│   │   ├── project.service.ts
│   │   ├── assumption.service.ts
│   │   ├── scoring.service.ts
│   │   ├── interview.service.ts
│   │   ├── feedback.service.ts
│   │   ├── contradiction.service.ts
│   │   └── ai/
│   │       ├── client.ts
│   │       ├── prompts.ts
│   │       └── schema.ts
│   ├── models/           # Database entity models
│   └── config/           # Environment variables and app constants
├── tests/                # Backend unit and integration tests
├── package.json          # Scheduled for Day 2 initialization
└── tsconfig.json
```

---

## Status

* **Day 1 Audit:** Baseline directory structure and architectural specifications complete.
* **Phase 2 (Days 3–4):** API contracts, database migration scripts, and prompt definitions.
* **Phase 3 (Days 5–9):** Core MVP engine implementation (Steps 1–3).

For complete API contracts, refer to [`docs/API_DOCUMENTATION.md`](../docs/API_DOCUMENTATION.md).
