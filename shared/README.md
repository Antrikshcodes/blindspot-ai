# Shared — Blindspot AI

**Phase 01 compatibility note:** these earlier shared interfaces are retained
for reference, not asserted to match the active backend. Runtime contracts are
`backend/src/phase01/contracts.ts`; use the current API documentation when building
a client. A deliberate shared-contract export/code-generation step can follow the
frontend integration; do not silently use the older Project/Submission shapes.

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
