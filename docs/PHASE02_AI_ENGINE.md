# Phase 02 — Core idea analysis engine

## Status and scope

Implemented on top of the existing Express/TypeScript/PostgreSQL/Drizzle backend.
No frontend was built. Resource Intelligence and feedback analysis were not rebuilt
or expanded. Existing endpoints and historical records remain available.

The server transforms a **submitted idea** into structured hypotheses and
description-level assessments. It does not certify market demand, conduct external
competition research, validate food/medical/legal compliance or guarantee success.

## Pipeline

1. **Input understanding:** load a validated project snapshot and optional
   `marketContext`/`additionalContext`. Treat all descriptions as untrusted data.
2. **Decomposition:** core problem, primary user, solution, value proposition,
   functionality, technical requirements and business assumptions.
3. **Assumption extraction:** explicitly consider all ten categories; retain
   3–15 distinct material assumptions rather than forcing irrelevant ones.
4. **Risk assessment:** the LLM proposes impact/uncertainty and separate
   rationales. Code checks ranges, computes priority and sorts assumptions.
5. **Blindspots and questions:** two independent, concurrency-bounded stages.
   Findings must link to supplied server-created assumption IDs. Generate 8–12
   distinct, non-leading questions about actual behavior.
6. **Synthesis:** grounded problem/audience/solution assessments, seven dimensions,
   summary, missing information, risks/uncertainties and actionable next steps.
7. **Server evidence policy:** force demand score to null/INSUFFICIENT_EVIDENCE;
   keep missing/unassessed dimensions null; assign all assumptions UNTESTED.
8. **Persistence:** atomically save the complete output and relational assumptions.
   Lock the project briefly to allocate the next version. Failed stages save no
   partial successful analysis.

The provider sees no database credentials or other environment secrets. External
research is explicitly false, and competition output lists the submitted
alternatives rather than fabricating named competitors.

## Risk scoring

```text
priorityScore = impact × uncertainty
impact: integer 1–5
uncertainty: integer 1–5
priorityScore: 1–25

20–25  CRITICAL
13–19  HIGH
 7–12  MEDIUM
 1–6   LOW
```

`riskScore` remains an alias of `priorityScore` for existing clients. This is a
prioritization heuristic, not a statistically calibrated probability.
`impactRationale` and `uncertaintyRationale` explain the proposed inputs separately.
Scoring code is independent of any AI provider.

**Compatibility:** new analyses use these thresholds, superseding Phase 01's
HIGH≥16/MEDIUM≥8. Existing historical risk labels are not silently recalculated.
Clients must accept CRITICAL and the expanded category enum.

## Schemas and evidence rules

Authoritative Zod contracts: `backend/src/phase01/analysis/contracts.ts`.

### Assumption

| Field | Contract |
| --- | --- |
| id | Server-created UUID |
| title / description | Specific falsifiable premise |
| category | PROBLEM, CUSTOMER, DEMAND, BEHAVIOUR, WILLINGNESS_TO_PAY, TECHNICAL, DISTRIBUTION, BUSINESS_MODEL, COMPETITIVE, OPERATIONAL |
| whyItMatters / explanation | Impact on the submitted idea; explanation retains the older alias |
| impact / uncertainty | Independent integers 1–5 |
| priorityScore / riskScore | Computed product |
| riskLevel | CRITICAL / HIGH / MEDIUM / LOW |
| impactRationale / uncertaintyRationale | Separate explanations |
| evidenceRequired / validationMethod | What to observe and how |
| targetAudience | Whom to investigate |
| suggestedInterviewQuestion | Non-leading question about past experience |
| grounding / sourceQuote | SUBMITTED with an exact original-input quote, or explicit UNCERTAINTY |
| status | Server-owned UNTESTED on generation |

Older SOLUTION/MONETIZATION categories remain readable for compatibility.
No AI output can add a validation status to extraction; unknown keys are rejected.

### Analysis

The analysis row stores `id`, `projectId`, increasing `version`, `engineVersion`,
`projectSnapshot`, `marketContext`, `additionalContext`, `model`,
`providerMetadata`, `createdAt` and `result`.

`result` contains:

- `decomposition`, with SUBMITTED/UNCERTAINTY/MISSING grounding.
- `problemAssessment`, `audienceAssessment`, `solutionAssessment`.
- Legacy `problemClarity`, `audienceClarity`, `nextSteps`.
- Seven `validationDimensions`: problemClarity, audienceSpecificity,
  solutionClarity, evidenceOfDemand, differentiation, technicalFeasibility,
  validationReadiness. Each has score, support, rationale and evidenceNeeded.
- Full scored `assumptions`, linked `blindspots`, linked `interviewQuestions`.
- `overallSummary`, strengths, missingInformation, productRisks,
  marketAndDemandUncertainties, technicalFeasibilityConcerns and competitiveUncertainties.
- `consideredCategories`, submitted competition context, evidence-policy flags,
  assessmentType and disclaimer.

Dimensions have an integer score 0–100 **only** for a DESCRIPTION_ONLY assessment
that can be made. INSUFFICIENT_EVIDENCE/UNASSESSED scores are null, not zero.
Demand is always unscored in this description-only pipeline, even if a founder
claims thousands of customers in the input. Such claims have not been verified.
There is no aggregate probability-of-startup-success score.

The stored `result.assumptions` are an immutable generation snapshot. The outer
analysis response's relational `assumptions` reflect current human-reviewed status.
Later feedback/status changes do not rewrite the original analysis.

### Blindspot

Server-created ID, title, explanation, severity, relatedAssumptionId, whyOverlooked,
suggestedAction, evidenceRequired, grounding and sourceQuote.
Specificity is prompted; every finding is source-grounded or explicitly uncertain.
Quote validation does not prove that the interpretation is correct.

### Question

Server-created ID, question, relatedAssumptionId, purpose, evidenceToLookFor,
followUpQuestion. Exactly 8–12 per completed Phase 02 analysis.
Known leading/hypothetical endorsement patterns are rejected in addition to the
prompt rules. This is not a complete linguistic detector.

`POST /api/projects/:id/interviews` reuses these stored questions for a Phase 02
analysis, avoiding a second conflicting generation. Legacy session fields
`assumptionId` and `listenFor` remain as aliases. Historical Phase 01 analyses
retain their original session-generation path.

## API

All routes retain the existing `{success,data}` / safe `{success:false,error,...}`
envelopes and production authorization boundary.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/projects/:id/analyze` | Six-stage generation, atomic save, 201 |
| GET | `/api/projects/:id/analysis` | Latest version, 200 |
| GET | `/api/analyses/:id` | Exact historical analysis and current assumptions |
| GET | `/api/analyses/:id/assumptions` | Existing paginated ranked list |
| GET | `/api/analyses/:id/blindspots` | `{analysisId,projectId,version,engineVersion,available,items}` |
| GET | `/api/analyses/:id/interview-questions` | Same artifact envelope, 8–12 questions |
| GET | `/api/analyses/:id/summary` | Grounded assessments, dimensions, summary, next steps, metadata |

Parameters must be UUIDs. Context strings are bounded; extra body fields return
400. Model/provider/grounding/reference/structured-output failures are safe
502/503 errors; AI_TIMEOUT is 504; rate/concurrency saturation is 429.

For a Phase 01 analysis, new artifact endpoints return `available:false` and an
explicit historical reason, not fabricated artifacts. Legacy summary fields
remain available, with new unassessed fields null.

### Example requests

First create a project with the existing project API, then use its returned UUID.

```http
POST /api/projects/00000000-0000-4000-8000-000000000000/analyze
Content-Type: application/json
```

```json
{
  "marketContext": "Campus canteens and students looking for evening meals.",
  "additionalContext": "Preliminary idea only; no interviews or demand measurements yet."
}
```

The UUID above is a placeholder. The body can also be `{}`, using stored project
description/problem/audience/solution/alternatives.

### Example response excerpt

This is **abridged illustrative JSON**, not a complete schema-valid payload or
verified customer finding; complete fields are specified in the Zod contracts.

```json
{
  "success": true,
  "data": {
    "version": 1,
    "engineVersion": "2.0",
    "result": {
      "overallSummary": "A plausible workflow whose demand and operational assumptions remain untested.",
      "validationDimensions": {
        "evidenceOfDemand": {
          "score": null,
          "support": "INSUFFICIENT_EVIDENCE",
          "rationale": "Only an idea description was supplied; no independently verified demand evidence was assessed.",
          "evidenceNeeded": "Real customer behavior, credible spending/workaround evidence and explicit validation experiments."
        }
      },
      "evidenceBackedValidation": {
        "assessed": false,
        "verifiedEvidenceCount": 0,
        "explanation": "This pipeline assesses an idea description and generates hypotheses; it does not verify customer demand."
      }
    }
  }
}
```

## Provider architecture, prompts and configuration

`LLM.generate(task,input,schema,options)` is provider-independent. Pipeline code
does not import the OpenAI SDK. The existing adapter supports Replit-managed
OpenAI and externally configured OpenAI-compatible JSON-schema endpoints.
Other providers can implement the same interface without changing scoring/storage.

Prompts are versioned independently in `analysis/prompts.ts`:
decomposition, extraction, risk, blindspots, questions and synthesis.
Provider metadata stores `promptVersion=phase02-1`, configured provider/model,
per-stage duration and observed token usage.
Unknown usage is null, never invented. Usage totals sum observed responses,
including structured-output retry responses where the provider reports usage;
they are not a billing reconciliation.

| Variable | Purpose |
| --- | --- |
| AI_PROVIDER | replit / openai / disabled |
| AI_MODEL | Configurable; existing default gpt-5.4-mini retained |
| AI_INTEGRATIONS_OPENAI_BASE_URL / AI_INTEGRATIONS_OPENAI_API_KEY | Managed by Replit for replit mode; no user API key needed |
| AI_API_KEY / AI_BASE_URL | External OpenAI-compatible configuration |
| AI_TIMEOUT_MS | Per-attempt timeout; default 45000 |
| AI_MAX_ATTEMPTS | One total retry budget, 1–3 attempts, default 2 |
| AI_RATE_LIMIT | Existing route-level request limit |

Use workspace Secrets controls for real values. Do not put credentials into docs,
requests, source or database rows. Replit AI use is billed to workspace credits.

The adapter uses strict JSON schemas, Zod validation, per-attempt abort, exponential
backoff and a maximum of two active AI operations. SDK retries are disabled so
they cannot multiply the explicit attempt budget. Independent stages use the
integration batch utility with concurrency 2 and no additional retry multiplication.
There is no fake-result fallback.

## History and migrations

The additive migration:

- Extends the category enum without removing old values.
- Adds version/engineVersion/context/provider metadata and richer assumption columns.
- Numbers existing analyses by project and historical timestamp/ID before creating
  the unique project/version index.
- Leaves original JSON, snapshots and historical risk classifications intact.

New version allocation locks the project only during the short save transaction,
not while waiting for AI. A removed project is not silently recreated.
Input edits during generation do not change the captured original snapshot.
The existing `blindspot_phase01` namespace and entry points are deliberately
retained to avoid an unrelated architecture migration.

## Verification

- Active and retained legacy TypeScript builds passed.
- 89 current backend tests passed, including 46 new Phase 02/provider/migration
  checks; 28 retained SQLite tests also passed.
- Regression check confirms interview sessions reuse analysis questions without
  a second AI call.
- Development PostgreSQL migration applied.
- A real six-stage analysis returned **12 assumptions, 10 blindspots, 11 questions**.
  All assumptions were UNTESTED; demand was null. All analysis read endpoints were
  checked. The temporary project was removed.
- Observed live usage: 23,497 prompt + 7,750 completion = 31,247 total tokens.
  This is one verification request, not a performance/cost benchmark.

Normal tests use mocked LLMs and isolated PostgreSQL-compatible storage. They do
not require external credentials or make live AI requests.

```sh
cd backend
npm run build
npm test
npm run test:legacy
npm run build:legacy
npm run db:migrate                  # explicit development-only operation
node scripts/smoke-phase02.mjs      # optional REAL, billed six-stage verification
```

The manual smoke script defaults to the Replit local proxy origin; set
SMOKE_BASE_URL for another development server. It has a five-minute request
timeout and cleans up its temporary project.

## Unresolved limits

- No UI, new authorization layer or production release in this phase.
- Schema/quote/ID checks cannot prove semantic correctness or fully prevent prompt injection.
- Description quality scores are subjective and uncalibrated. No external competitor,
  technical benchmark or customer-demand verification is performed.
- Six AI stages cost more and take longer than the old single call. Calls are
  synchronous; a job/status queue is future work. A disconnected client does not
  currently cancel all remaining pipeline stages.
- Token usage depends on provider reporting. Failed-analysis usage is not stored
  as a successful analysis or a durable billing ledger.
- Process-local concurrency/rate limits remain; concurrent analyses can receive
  meaningful busy responses. No distributed scheduling is claimed.
- Existing four moderate development-only Drizzle/esbuild-chain audit findings
  remain outside this analysis-engine change.

## Updated backend directory tree

Dependencies/build output omitted. Legacy source remains untouched except the
previously documented compatibility updates.

```text
backend/
├── .env.example
├── README.md
├── package.json
├── package-lock.json
├── drizzle.config.ts
├── tsconfig.json
├── tsconfig.phase01.json
├── prisma/schema.prisma
├── scripts/
│   ├── test.mjs
│   ├── smoke-phase01.mjs
│   └── smoke-phase02.mjs
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/{database,env,logger}.ts
│   ├── middleware/{errorHandler,requestLogger,validateRequest}.ts
│   ├── modules/
│   │   ├── health/{health.controller,health.routes}.ts
│   │   └── library/{library.routes,library.schemas,library.service,library.url}.ts
│   ├── utils/response.ts
│   └── phase01/
│       ├── app.ts
│       ├── server.ts
│       ├── config.ts
│       ├── contracts.ts
│       ├── ai/
│       │   ├── provider.ts
│       │   └── batch.ts
│       ├── analysis/
│       │   ├── contracts.ts
│       │   ├── prompts.ts
│       │   ├── risk.ts
│       │   ├── grounding.ts
│       │   ├── blindspots.service.ts
│       │   ├── engine.ts
│       │   └── service.ts
│       ├── db/
│       │   ├── client.ts
│       │   ├── schema.ts
│       │   ├── migrate.ts
│       │   └── migrations/
│       │       ├── 0000_tense_captain_universe.sql
│       │       ├── 0001_cool_psylocke.sql
│       │       ├── 0002_fantastic_vance_astro.sql
│       │       └── meta/{0000_snapshot,0001_snapshot,0002_snapshot,_journal}.json
│       ├── validation/service.ts
│       └── resource-intelligence/{types,http,providers,normalize,ranking,cache,search.service}.ts
└── tests/
    ├── database.test.ts
    ├── error.test.ts
    ├── health.test.ts
    ├── library.test.ts
    └── phase01/
        ├── fixtures.ts
        ├── api.test.ts
        ├── config.test.ts
        ├── resources.test.ts
        ├── analysis.fixtures.ts
        ├── analysis.test.ts
        ├── analysis-migration.test.ts
        └── provider.test.ts
```
