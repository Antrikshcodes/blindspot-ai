# Database Schema Specification: Blindspot AI

**Document:** `DATABASE_SCHEMA.md`  
**ORM:** Prisma ORM (v6.4.0)  
**Development Engine:** SQLite (`file:./dev.db`)  
**Production Engine:** PostgreSQL (Replit Cloud via `DATABASE_URL`)  
**Schema File:** [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)  

---

## 1. Database Architecture & Strategy

To support rapid, zero-setup local development and frictionless deployment on Replit Cloud:
* **Local Development:** SQLite database file managed in `backend/prisma/dev.db`.
* **Production Deployment:** PostgreSQL hosted instance configured through the standard connection string format:
  ```text
  postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
  ```

---

## 2. Entity Relationship Diagram (Conceptual)

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────┐          1:N           ┌──────────────────┐
│   Project    │───────────────────────<│  FeedbackNote    │
└──────┬───────┘                        └────────┬─────────┘
       │                                         │ 1:N
       │ 1:N                                     ▼
       ▼                                ┌──────────────────┐
┌──────────────┐          1:N           │     Evidence     │
│  Assumption  │───────────────────────<│ (Supports/Inval) │
└──────┬───────┘                        └──────────────────┘
       │
       ├─────────────────────┬─────────────────────┐
       │ 1:N                 │ 1:N                 │ 1:N
       ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Interview   │      │Contradiction │      │  Experiment  │
│(Mom Test Qs) │      │  (Conflict)  │      └──────┬───────┘
└──────────────┘      └──────────────┘             │ 1:N
                                                   ▼
                                            ┌──────────────┐
                                            │ExperimntRsult│
                                            └──────────────┘
```

---

## 3. Detailed Model Specifications

### 3.1 `User` (`users`)
Represents registered platform members.
* `id` (`String`, `@id`, `@default(cuid())`): Unique identifier.
* `email` (`String`, `@unique`): Login email address.
* `name` (`String?`): User's full name.
* `passwordHash` (`String?`): Hashed password (Phase 9).
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
* *Relations:* `projects` (`Project[]`).

### 3.2 `Project` (`projects`)
Founder's workspace container storing problem validation iterations.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `name` (`String`): Project title.
* `problemStatement` (`String`): Stated customer problem.
* `targetAudience` (`String`): Target user persona.
* `proposedSolution` (`String?`): Concept under validation.
* `productDescription` (`String?`): Expanded context notes.
* `userId` (`String?`): Foreign key to `User`.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
* *Relations:* `assumptions`, `interviews`, `feedbackNotes`, `contradictions`, `experiments`.

### 3.3 `Assumption` (`assumptions`)
Hypotheses deconstructed across four venture risk domains.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `projectId` (`String`): Foreign key to `Project`.
* `statement` (`String`): The atomic belief statement.
* `category` (`String`): `PROBLEM` | `CUSTOMER` | `SOLUTION` | `MONETIZATION`.
* `explanation` (`String?`): AI rationale for why this assumption is required.
* `impactScore` (`Int`, `@default(3)`): 1 to 5.
* `uncertaintyScore` (`Int`, `@default(3)`): 1 to 5.
* `compositeRisk` (`Int`, `@default(9)`): Deterministic $Impact \times Uncertainty$ (1 to 25).
* `isLethal` (`Boolean`, `@default(false)`): Flagged true if `compositeRisk >= 15`.
* `validationMethod` (`String?`): Suggested inquiry method.
* `status` (`String`, `@default("UNVERIFIED")`): `UNVERIFIED` | `SUPPORTED` | `INVALIDATED`.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
* *Relations:* `interviews`, `evidence`, `contradictions`, `experiments`.

### 3.4 `Interview` (`interviews`)
Mom-Test-compliant discovery questions.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `projectId` (`String`): Foreign key to `Project`.
* `assumptionId` (`String?`): Targeted assumption.
* `questionText` (`String`): Non-leading question focused on past behavior.
* `probeType` (`String`): `PAST_BEHAVIOR` | `CURRENT_EXPENDITURE` | `WORKAROUND` | `EMOTIONAL_INTENSITY`.
* `listenFor` (`String?`): What behavioral clues indicate evidence.
* `originalScript` (`String?`): Formatted interview guide text.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.

### 3.5 `FeedbackNote` (`feedback_notes`)
Preserves unmodified qualitative interview notes and call transcripts.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `projectId` (`String`): Foreign key to `Project`.
* `intervieweeIdentifier` (`String`): Customer identifier (e.g. "Founder #3").
* `rawText` (`String`): Full transcript or raw notes.
* `notes` (`String?`): Contextual observations.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
* *Relations:* `evidence` (`Evidence[]`).

### 3.6 `Evidence` (`evidence`)
Atomic excerpts mapped directly to specific assumptions.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `feedbackNoteId` (`String`): Foreign key to `FeedbackNote`.
* `assumptionId` (`String`): Foreign key to `Assumption`.
* `quote` (`String`): Verbatim excerpt from user transcript.
* `sentiment` (`String`): `SUPPORTING` | `INVALIDATING` | `NEUTRAL`.
* `reasoning` (`String?`): Explanation of classification.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.

### 3.7 `Contradiction` (`contradictions`)
Conflicts identified between distinct user feedback entries.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `projectId` (`String`): Foreign key to `Project`.
* `assumptionId` (`String?`): Connected assumption.
* `contradictionSummary` (`String`): Core tension description.
* `quoteA` (`String`): Citation from Customer A.
* `quoteB` (`String`): Conflicting citation from Customer B.
* `recommendation` (`String?`): Suggested audience segmentation or further inquiry.
* `status` (`String`, `@default("CANDIDATE")`): `CANDIDATE` | `CONFIRMED` | `DISMISSED`.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.

### 3.8 `Experiment` (`experiments`)
Pragmatic, falsifiable de-risking tests.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `projectId` (`String`): Foreign key to `Project`.
* `assumptionId` (`String?`): Targeted assumption.
* `name` (`String`): Experiment title.
* `hypothesis` (`String`): Testable proposition.
* `executionMethod` (`String`): `SMOKE_TEST` | `CONCIERGE_TEST` | `LANDING_PAGE` | `PROTOTYPE_WALKTHROUGH` | `PRE_SALE`.
* `requiredResources` (`String?`): Tools or budget needed.
* `metric` (`String`): Measurable quantitative parameter.
* `failureThreshold` (`String`): Quantitative condition invalidating assumption.
* `durationDays` (`Int`, `@default(7)`): Suggested timeframe.
* `resultInterpretation` (`String?`): What success or failure implies.
* `status` (`String`, `@default("PLANNED")`): `PLANNED` | `IN_PROGRESS` | `COMPLETED` | `ABANDONED`.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
* *Relations:* `results` (`ExperimentResult[]`).

### 3.9 `ExperimentResult` (`experiment_results`)
Outcome logs recorded after experiment execution.
* `id` (`String`, `@id`, `@default(cuid())`): Primary key.
* `experimentId` (`String`): Foreign key to `Experiment`.
* `outcome` (`String`): `VALIDATED` | `INVALIDATED` | `INCONCLUSIVE`.
* `metricsObserved` (`String?`): Final measured values.
* `validated` (`Boolean`, `@default(false)`): Boolean flag.
* `notes` (`String?`): Post-mortem insights.
* `createdAt`, `updatedAt` (`DateTime`): Audit timestamps.
