# Shared — Blindspot AI

> Shared TypeScript data contracts, validation schemas, and constants for Blindspot AI.

---

## Purpose

The `shared/` package serves as the single source of truth for data models shared across the client (`frontend/`) and server (`backend/`):
* **TypeScript Interfaces:** Submissions, Assumptions, RiskScores, Questions, Notes, Contradictions, Experiments.
* **Validation Schemas:** Zod schemas shared across frontend form validation and backend route controllers.
* **Constants & Enums:** Risk levels, assumption categories (`PROBLEM`, `CUSTOMER`, `SOLUTION`, `MONETIZATION`), question probe types, and HTTP status codes.

---

## Planned Directory Structure

```text
shared/
├── types/
│   ├── submission.types.ts
│   ├── assumption.types.ts
│   ├── interview.types.ts
│   ├── feedback.types.ts
│   └── experiment.types.ts
├── schemas/
│   ├── submission.schema.ts
│   ├── assumption.schema.ts
│   └── feedback.schema.ts
└── constants/
    └── index.ts
```
