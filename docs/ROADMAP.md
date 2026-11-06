# Product Roadmap: Blindspot AI

## Phase 01 status

### Implemented and verified

- Modular backend: Express / TypeScript / PostgreSQL / Drizzle / Zod.
- Project CRUD and versioned analysis with risk-ranked untested assumptions.
- Structured AI adapters with schema validation and explicit failures.
- Mapped interview questions, original notes, cited evidence, themes,
  contradictions, evidence gaps and unsupported conclusions.
- Explicit evidence-backed review states and measurable experiments.
- Real-source GitHub/HF/UCI discovery; optional Kaggle; reviewed technical resources.
- Normalization/deduplication, separate relevance/metadata signals, transparent
  configurable ranking, TTL cache, provider statuses and project saves.
- Versioned development migrations, isolated tests, rate limiting, bounded HTTP,
  structured logging and fail-closed production access.

### Not implemented

1. Real authentication and project-owner authorization; the production guard must
   remain until this is tested.
2. Frontend intake, analysis/evidence/interview/experiment screens and Library UI.
3. Semantic/multi-query retrieval evaluation, more API/dataset catalogs and a
   benchmark of recommendation usefulness.
4. Shared cache/limits, background refresh, job queues, monitoring and a production
   operating/release procedure.
5. Reviewed import of existing SQLite data, if records exist in teammates' environments.
6. Automated legal license compatibility, source code security review or proof
   that an idea has a validated market. These are **not** claims of the product.

Kaggle is implemented but disabled by default and was transport-mocked, not live
credential-tested. Live smoke verification covered GitHub/HF retrieval, UCI empty
result handling, development PostgreSQL and one real AI idea analysis.

## Historical sprint plan — dates and older stack assumptions are not current status

> **Notice:** This document has been superseded by the 20-day engineering sprint roadmap.  
> Please refer to [**`docs/FEATURE_ROADMAP.md`**](FEATURE_ROADMAP.md) for detailed phase deliverables, technical objectives, expected outcomes, and acceptance criteria.

---

## 20-Day Sprint Schedule (Summary)

* **Phase 1 (Days 1–2):** Repository Audit & Architecture Understanding
* **Phase 2 (Days 3–4):** Product Requirements & Technical Planning
* **Phase 3 (Days 5–9):** Core MVP Development (Steps 1–3: Intake, Assumptions, Risk Scoring)
* **Phase 4 (Days 10–13):** AI Intelligence & Analysis (Steps 4–7: Interviews, Feedback, Contradictions, Experiments)
* **Phase 5 (Days 14–15):** Frontend/Backend System Integration
* **Phase 6 (Days 16–17):** UI/UX Refinement & SaaS Polish
* **Phase 7 (Day 18):** Testing & Bug Fixing
* **Phase 8 (Day 19):** Deployment & Replit Production Readiness
* **Phase 9 (Day 20):** Final Demonstration & Presentation Preparation

For full milestone breakdowns and acceptance criteria, see [`docs/FEATURE_ROADMAP.md`](FEATURE_ROADMAP.md).
