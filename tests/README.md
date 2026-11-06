# Tests — Blindspot AI

> Automated testing suites for Blindspot AI.

---

## Test Organization

The test directory is organized into three distinct testing tiers:

```text
tests/
├── unit/             # Unit tests for business logic, scoring algorithms, and schemas
│   ├── scoring.test.ts        # Tests deterministic 2D risk calculations
│   └── validation.test.ts     # Tests schema constraints (e.g., minimum prompt length)
├── integration/      # Integration tests for API endpoints and database queries
│   ├── submissions.test.ts    # Tests submission persistence and retrieval
│   └── feedback.test.ts       # Tests customer note ingestion and quote mapping
└── e2e/              # End-to-end tests for critical user validation journeys
    └── validation-flow.test.ts# Full walkthrough from idea intake to experiment board
```

---

## Testing Principles

1. **Deterministic Logic First:** Pure functions (e.g., composite risk scoring, lethal assumption filtering) must achieve 100% test coverage.
2. **Mock External Providers:** In automated CI environments, LLM provider calls must use deterministic mock responses to prevent test flakiness, rate limiting, and unnecessary API cost.
3. **No Phantom Assertions:** Tests must assert against real database state and HTTP response payloads.
