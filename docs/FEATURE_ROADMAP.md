# Feature Roadmap: Blindspot AI

**Sprint Duration:** 20 Days  
**Hackathon:** CoNSTruct 2.0 (Replit × Newton School of Technology)  
**Team:** Null Theory (Antriksh, Saureet Chakrabarti, Poorvi Gupta, Pavitr Makhija, Jagrit Arora)  
**Document Status:** Approved Baseline  

---

## 1. Roadmap Overview & Timeline

The 20-day engineering sprint is divided into nine sequential, milestone-driven phases. Each phase specifies clear technical objectives, deliverables, expected outcomes, and binary acceptance criteria to ensure disciplined execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       20-DAY SPRINT SCHEDULE                                │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│ Days 1–2     │ Days 3–4     │ Days 5–9     │ Days 10–13   │ Days 14–15      │
│ Audit &      │ Requirements │ Core MVP     │ AI Logic     │ System          │
│ Architecture │ & Schemas    │ Engine       │ & Analysis   │ Integration     │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────────────┤
│ Days 16–17   │ Day 18       │ Day 19       │ Day 20       │                 │
│ UI/UX        │ Testing &    │ Replit Prod  │ Demo & Pitch │                 │
│ Polish       │ Bug Fixing   │ Deployment   │ Finalization │                 │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## 2. Phase-by-Phase Execution Plan

### Phase 1: Repository Audit & Architecture Understanding (Days 1–2)
* **Timeframe:** Day 1 – Day 2
* **Focus:** Codebase audit, documentation synchronization, project hygiene, and repository foundation.

#### Technical Objectives
1. Inspect the entire repository structure and verify implementation status across all directories.
2. Establish a single source of truth for product vision, technical architecture, and team workflows.
3. Configure and verify Git branches, CI security workflows, and environment templates.

#### Deliverables
* Repository Audit Report documenting existing vs. proposed implementation.
* Updated foundational documentation: `README.md`, `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT_SETUP.md`.
* Issue tracker (`docs/KNOWN_ISSUES.md`) and sprint progress log (`docs/DAILY_PROGRESS.md`).
* Updated team collaboration guide (`CONTRIBUTING.md`) with official team roster (Null Theory).

#### Expected Outcomes
* Zero ambiguity regarding what exists vs. what needs to be built.
* All team members aligned on the 7-step validation workflow and Git branching policies.

#### Acceptance Criteria
* [x] Audit report complete with zero fabricated implementation claims.
* [x] All 8 foundational documents updated and cross-linked.
* [x] Documentation committed to `docs/repository-foundation` and ready for pull request into `develop`.
* [x] CI pipeline passing on GitHub without errors.

---

### Phase 2: Product Requirements & Technical Planning (Days 3–4)
* **Timeframe:** Day 3 – Day 4
* **Focus:** API contract definitions, database schemas, prompt engineering specs, and UI component hierarchy.

#### Technical Objectives
1. Define shared TypeScript data interfaces for all entities (Submissions, Assumptions, InterviewQuestions, Feedback, Contradictions, Experiments).
2. Author JSON schemas for structured LLM outputs with validation rules.
3. Finalize database schema migration scripts.
4. Design wireframes and component boundaries for the frontend.

#### Deliverables
* Shared data contracts in `shared/types/`.
* Complete OpenAPI/Swagger or REST API contract specifications in `docs/API_DOCUMENTATION.md`.
* Database schema migration files (Prisma/Drizzle).
* Prompt specifications with few-shot Mom Test examples.

#### Expected Outcomes
* Frontend and backend engineers can develop against agreed API contracts independently and concurrently.

#### Acceptance Criteria
* [ ] All 7 workflow step interfaces defined in TypeScript and validated with Zod/Pydantic schemas.
* [ ] Database migration executes successfully in local environment with zero errors.
* [ ] Mock API server or route contracts validated by both frontend and backend leads.

---

### Phase 3: Core MVP Development (Days 5–9)
* **Timeframe:** Day 5 – Day 9
* **Focus:** Implementation of Step 1 (Idea Submission), Step 2 (Assumption Extraction), and Step 3 (Risk Prioritisation).

#### Technical Objectives
1. Build the frontend Idea Intake form with real-time input validation and guidance.
2. Implement backend persistence for projects, submissions, and assumptions.
3. Implement the Assumption Extraction service using LLM prompt templates.
4. Implement the deterministic 2D Risk Scoring module ($Impact \times Uncertainty$).
5. Build the Assumption Matrix UI with interactive risk sorting and "Lethal Assumption" indicators.

#### Deliverables
* Working `/api/submissions` and `/api/assumptions` REST endpoints.
* Frontend submission wizard and interactive Assumption Risk Matrix view.
* Unit tests for deterministic risk scoring logic.

#### Expected Outcomes
* A founder can input an idea, view AI-extracted assumptions categorized into Problem/Customer/Solution/Viability, and immediately identify the top 3 lethal risks.

#### Acceptance Criteria
* [ ] Submitting a valid idea successfully extracts $\ge 5$ discrete, categorized assumptions.
* [ ] Risk scoring generates correct $1..25$ composite scores and flags lethal risks.
* [ ] UI displays assumptions in a responsive, filterable matrix.

---

### Phase 4: AI Intelligence & Analysis (Days 10–13)
* **Timeframe:** Day 10 – Day 13
* **Focus:** Implementation of Step 4 (Interview Generation), Step 5 (Feedback Analysis), Step 6 (Contradiction Detection), and Step 7 (Experiment Recommendations).

#### Technical Objectives
1. Implement the Mom-Test-compliant Interview Question Generation service.
2. Build the Qualitative Feedback Ingestion parser to link interview quotes with specific assumptions.
3. Develop the Contradiction Detection algorithm to identify conflicting evidence across customer notes.
4. Implement the Experiment Recommendation engine with concrete falsification metrics.

#### Deliverables
* Backend services for interview generation, feedback ingestion, contradiction detection, and experiment synthesis.
* Exportable interview script formatter (Markdown/Text/Clipboard).
* Contradiction evaluation service with evidence citation.

#### Expected Outcomes
* The platform completes the full loop: from initial hypothesis extraction to interview questions, user feedback ingestion, contradiction flagging, and experiment suggestions.

#### Acceptance Criteria
* [ ] Generated interview questions contain zero leading or hypothetical phrasing (*"Would you..."*).
* [ ] System correctly tags ingested user quotes as Supporting, Invalidating, or Neutral.
* [ ] Ingesting conflicting user notes surfaces a flagged contradiction alert with verbatim citations.
* [ ] Experiment recommendations include concrete metric thresholds and execution timelines.

---

### Phase 5: Frontend/Backend System Integration (Days 14–15)
* **Timeframe:** Day 14 – Day 15
* **Focus:** End-to-end integration across all 7 workflow stages, state synchronization, and loading transitions.

#### Technical Objectives
1. Connect all frontend views to live backend API endpoints.
2. Implement optimistic UI updates, loading skeletons, and error boundary components.
3. Standardize API error handling and toast notifications for asynchronous AI tasks.
4. Implement local caching to prevent redundant LLM re-computations.

#### Deliverables
* Unified, working application where a user navigates seamlessly from Step 1 to Step 7.
* Integrated error handling and user feedback state management.

#### Expected Outcomes
* Elimination of mock data; all views operate on real database state and live backend services.

#### Acceptance Criteria
* [ ] Complete end-to-end user walkthrough executed from idea entry to experiment review.
* [ ] Zero uncaught frontend runtime errors during normal or abnormal API responses.
* [ ] Long-running AI requests render responsive loading indicators without freezing the UI.

---

### Phase 6: UI/UX Refinement (Days 16–17)
* **Timeframe:** Day 16 – Day 17
* **Focus:** Visual polish, typography, accessibility, responsive design, and product feel.

#### Technical Objectives
1. Audit and refine typography, contrast ratios, and visual hierarchy.
2. Eliminate unnecessary visual clutter, excessive animations, and generic AI aesthetic tropes.
3. Optimize mobile and tablet responsiveness across all screens.
4. Refine empty states, tooltips, and copy to maintain an authoritative, pedagogical tone.

#### Deliverables
* Polished, minimalist SaaS dashboard interface.
* Responsive layouts tested across common mobile and desktop viewport sizes.
* Cohesive design system tokens (colors, typography, spacing).

#### Expected Outcomes
* Application looks and feels like an enterprise-grade product rather than a hackathon prototype.

#### Acceptance Criteria
* [ ] Passes WCAG 2.1 AA color contrast audits across all primary workflows.
* [ ] Mobile viewport ($375\text{px}$) renders all workflows without horizontal scroll overflow.
* [ ] UI adheres strictly to clean, modern design standards without distracting gimmicks.

---

### Phase 7: Testing & Bug Fixing (Day 18)
* **Timeframe:** Day 18
* **Focus:** End-to-end testing, edge-case hardening, security verification, and performance optimization.

#### Technical Objectives
1. Execute automated unit and integration tests across backend calculation and parsing routines.
2. Test input edge cases (empty strings, extremely long prompts, special characters, prompt injections).
3. Verify zero console errors, memory leaks, or unhandled promise rejections.
4. Verify complete absence of exposed credentials or secrets.

#### Deliverables
* Passing test suite with coverage reports.
* Resolved entries in `docs/KNOWN_ISSUES.md`.
* Performance audit report (bundle size, API latency).

#### Expected Outcomes
* Rock-solid stability under adverse user inputs and transient network conditions.

#### Acceptance Criteria
* [ ] Unit test suite passes with zero failures.
* [ ] All Critical and High severity bugs in `docs/KNOWN_ISSUES.md` marked as Resolved.
* [ ] Prompt injection test cases successfully handled and quarantined.

---

### Phase 8: Deployment & Production Readiness (Day 19)
* **Timeframe:** Day 19
* **Focus:** Replit cloud deployment, environment secret verification, domain configuration, and smoke testing.

#### Technical Objectives
1. Configure `.replit` runtime and Replit Nix environment configuration for zero-friction launch.
2. Store and verify all production environment variables securely in Replit Secrets.
3. Run end-to-end smoke tests on the live public Replit URL.
4. Verify HTTPS enforcement, CORS restrictions, and production build minification.

#### Deliverables
* Fully functional, publicly accessible Replit deployment.
* Verified deployment documentation in `docs/DEVELOPMENT_SETUP.md`.
* Deployment release tag on GitHub (`v1.0.0-mvp`).

#### Expected Outcomes
* Anyone with the public Replit link can interact with the live product without login hurdles or environment errors.

#### Acceptance Criteria
* [ ] Application builds and starts cleanly on Replit with a single click of the "Run" button.
* [ ] Live Replit deployment completes all 7 validation steps without crashes.
* [ ] Production bundle served over HTTPS with no insecure asset warnings.

---

### Phase 9: Final Demonstration & Presentation Preparation (Day 20)
* **Timeframe:** Day 20
* **Focus:** Pitch deck, live demo script, screen recordings, architecture diagrams, and submission package.

#### Technical Objectives
1. Record a high-definition product walkthrough video demonstrating the 7-step validation process.
2. Prepare an interactive live demo project pre-populated with realistic startup scenarios.
3. Update `assets/screenshots/` and `assets/diagrams/` with final production captures.
4. Prepare the final submission documentation for CoNSTruct 2.0 evaluators.

#### Deliverables
* 3-minute video demonstration.
* Live demo walkthrough script for judges.
* Final submission package on Replit and GitHub.

#### Expected Outcomes
* Clear, persuasive presentation demonstrating why Blindspot AI solves a critical startup failure mode.

#### Acceptance Criteria
* [ ] Demo walkthrough rehearsed with backup offline video recording available.
* [ ] Repository `README.md` includes working deployment links and demo credentials/instructions.
* [ ] All hackathon submission deliverables completed on time.
