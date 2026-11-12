# API Documentation: Blindspot AI

## Authentication and project privacy

All `/api` endpoints except `GET /api/health` require a verified **Clerk
session**. Replit-managed Clerk is provisioned separately for development and
production. The `/api/__clerk` provider proxy is public infrastructure in
production; it does not grant access to project data.

- Browser clients use Clerk session cookies on same-origin requests. Do not
  add browser bearer-token plumbing. Cookie-authenticated writes also require a
  matching `Origin` and reject `Sec-Fetch-Site: cross-site`.
- Non-browser API clients may use `Authorization: Bearer <Clerk session JWT>`.
  The server verifies signatures, expiry and the authorized party. It accepts
  session tokens, not API keys or machine tokens.
- The verified provider subject is the sole owner identity. `X-User-Id`,
  custom `userId` claims, body IDs and query IDs are never identity proof.
  Owner/user fields are rejected in project input and cannot transfer ownership.
- Project lists are filtered by owner before pagination. Reads/writes of
  analyses, assumptions/evidence, interviews/notes, feedback summaries,
  experiments, resource searches/history and saved resources check their owning
  project. Foreign and absent records both return `404 NOT_FOUND`.
- A resource ID is readable only after retrieval for an owned project.
  Resource metadata may be globally deduplicated public-source metadata;
  queries, recommendations, explanations and saves remain project-scoped.
- Existing projects have `owner_id = NULL` and are quarantined, including their
  descendants. They are neither deleted nor assigned to the next signed-in user.
  There is no public claim/transfer endpoint.

Missing provider keys return `503 AUTH_NOT_READY`, in production **and**
development. Missing/invalid sessions return `401 UNAUTHENTICATED`; rejected
cookie-write origins return `403 ORIGIN_REJECTED`. Positive owner and
cross-account rejection tests now cover the real signature-verification
middleware, so configured production uses authenticated access rather than the
former unconditional 503. No publication is automatic.

Apply the additive checked-in ownership migration before running this version.
Development uses `npm run db:migrate`; production schema changes must use the
managed release flow, never startup DDL. The existing website has not yet been
wired to Clerk sign-in: until its separate integration, anonymous browser API
requests correctly return 401 instead of exposing data.

## User profile and roles

- `GET /api/user/profile` returns the authenticated Clerk subject, saved display
  name (or `null` before it is set), and server-derived role (`USER` or `ADMIN`).
  The first read creates a profile row for that verified subject.
- `PATCH /api/user/profile` accepts only `{ "displayName": string | null }`.
  Names are trimmed and limited to 100 characters. Role and owner fields are
  rejected; callers cannot promote themselves or write another user's profile.
- Admins are configured with the server-only `ADMIN_USER_IDS` environment
  variable as a comma-separated allowlist of verified Clerk subject IDs. Empty
  or omitted configuration makes every profile `USER`. Never expose this
  variable to the browser.

## Phase 03 resource API

Existing resource endpoints retain their fields and add normalized aliases and
source provenance. POST search now supports providers, topics, tasks,
includeArchived, page, limit, minRelevance and sort (`relevance`/`lastUpdated`).
Query remains optional for AI-generated provider-specific planning.

Added routes:

- GET `/api/projects/:id/resources/searches` — paginated history/query diagnostics.
- GET `/api/projects/:id/resources/saved` — saved list with the existing resource filters.
- DELETE `/api/resources/:id/save` — JSON body `{projectId}`; older project-scoped DELETE remains.

GET project resources accepts category, provider, minRelevance, sort, saved, page,
limit. POST returns generatedQueries, analysisId, providerStatuses, cached,
partial, explanationStatus/explanationError, items and pagination.total.
Failed searches retain HTTP 503 and persist diagnostics. Explanations never
replace missing provider resources.

[Complete Phase 03 request/response examples, contracts and limitations](PHASE03_RESOURCE_INTELLIGENCE.md).

## Phase 02 analysis API

The existing POST analyze now runs the six-stage engine and accepts optional
`additionalContext` (1–6000 characters) as well as `marketContext` (1–4000).
Empty `{}` remains valid. No identity, IDs, scores or statuses may be supplied.

Analysis responses retain earlier fields and add version, engineVersion,
additionalContext, providerMetadata and a richer result with decomposition,
seven evidence-aware dimensions, assumptions, blindspots, 8–12 interview questions,
summary/risks/missing information, competition context and evidence disclaimers.

Additional implemented routes:

| Method | Path | Data |
| --- | --- | --- |
| GET | `/api/analyses/:id/blindspots` | Linked findings, artifact availability and version |
| GET | `/api/analyses/:id/interview-questions` | Linked questions with purpose/evidence/follow-up |
| GET | `/api/analyses/:id/summary` | Assessments, dimensions, summary, actions and AI metadata |

New analyses consider PROBLEM, CUSTOMER, DEMAND, BEHAVIOUR, WILLINGNESS_TO_PAY,
TECHNICAL, DISTRIBUTION, BUSINESS_MODEL, COMPETITIVE and OPERATIONAL assumptions.
Older categories remain readable.

**Risk thresholds:** priority = impact × uncertainty; 20–25 CRITICAL, 13–19 HIGH,
7–12 MEDIUM, 1–6 LOW. This replaces the older analysis thresholds below.
Demand remains null/INSUFFICIENT_EVIDENCE in this description-only pipeline.
New hypotheses always start UNTESTED. Interview session creation reuses the stored
Phase 02 questions, retaining legacy assumptionId/listenFor field aliases.

The new GET artifacts return `available:false` for historical Phase 01 analyses;
they do not fabricate missing content. AI_TIMEOUT errors use HTTP 504.
Other existing envelopes, routes, pagination and production guards remain.

See [complete Phase 02 contract/examples](PHASE02_AI_ENGINE.md).

## Implemented Phase 01 API

**Base: `/api`**, not the historical `/api/v1` contract below.
All UUID parameters and inputs are validated. Unknown body/query keys are rejected.
All non-health routes require the authenticated owner checks described above.
Missing authentication configuration returns 503 `AUTH_NOT_READY`; there is no
anonymous development bypass.

### Envelopes, pagination and errors

Success: `{ "success": true, "data": ... }`.
Error: `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`.
Rate-limit errors use the same error structure and include rate-limit headers.
Default pagination: `page=1&limit=20`, maximum page 10000 / limit 100.
Lists use `{ items, pagination }`; most pagination objects report page/limit,
not an inferred total count. An empty list is not an error.

Typical status codes: 200 read/update/delete; 201 creation/analysis/search;
400 validation or invalid evidence; 404 missing resource/project/analysis;
409 invalid state transition; 413 body/feedback limits; 429 request/AI capacity;
502 invalid/unavailable upstream output; 503 disabled configuration, provider
unavailability or production authorization boundary. Errors never expose raw
database, provider or credential details.

### Project and analysis endpoints

| Method | Path | Request | Response data |
| --- | --- | --- | --- |
| GET | `/api/health` | None | status/database/service; 503 if DB is unreachable |
| POST | `/api/projects` | Project fields below | Created project, 201 |
| GET | `/api/projects` | page/limit | Paginated projects |
| GET | `/api/projects/:id` | UUID | Project |
| PATCH | `/api/projects/:id` | Nonempty subset of project fields | Updated project; omitted fields preserved |
| DELETE | `/api/projects/:id` | UUID | `{deleted:true,id}`; cascades project-owned records, not global sources |
| POST | `/api/projects/:id/analyze` | `{}` or `{marketContext}` | New versioned analysis + ranked UNTESTED assumptions, 201 |
| GET | `/api/projects/:id/analysis` | UUID | Latest analysis with assumptions; 404 before first analysis |
| GET | `/api/analyses/:id` | UUID | That analysis and assumptions |
| GET | `/api/analyses/:id/assumptions` | page/limit | Ranked assumptions with evidenceRecords |
| PATCH | `/api/assumptions/:id` | `{status,evidenceIds?}` | Updated assumption; transition/evidence rules below |

Project creation:

```json
{
  "name": "Idea name",
  "productDescription": "What the proposed product does.",
  "problemStatement": "A specific recurring problem described in at least twenty characters.",
  "targetAudience": "A concrete audience segment",
  "proposedSolution": "The proposed approach.",
  "existingAlternatives": ["Current workaround"]
}
```

Limits: name 100, product/problem/solution 4000, audience 1000 characters.
Alternatives default to an empty array, maximum 20 × 300 characters.
Analysis market context is optional, maximum 4000 characters.
Analysis clarity/assumptions/next steps come from validated AI JSON. Impact and
uncertainty are 1–5. Server-owned risk score = impact × uncertainty; HIGH ≥16,
MEDIUM ≥8, otherwise LOW. Initial status is always UNTESTED.

Assumption transitions:
`UNTESTED → TESTING → SUPPORTED | INVALIDATED | INCONCLUSIVE`.
Any outcome can be reopened to TESTING. Direct untested-to-supported is 409.
An outcome requires evidence IDs linked to that assumption; SUPPORTED requires
at least one supporting record, INVALIDATED an invalidating record.
The API caller is explicitly requesting review of those citations. This is a
human judgment, not an automatic AI certification.

### Interviews, feedback and experiments

| Method | Path | Request | Response data |
| --- | --- | --- | --- |
| POST | `/api/projects/:id/interviews` | `{participant:"alias"}` | Session with non-leading mapped questions, 201 |
| GET | `/api/projects/:id/interviews` | page/limit | Sessions |
| POST | `/api/interviews/:id/feedback` | `{notes,assumptionIds?}` | Original feedback record, 201 |
| GET | `/api/interviews/:id/feedback` | page/limit | Paginated original feedback records, newest first |
| POST | `/api/projects/:id/feedback/analyze` | `{}` | Versioned summary + evidenceRecords + reviewRequired, 201 |
| GET | `/api/projects/:id/feedback/summary` | None | Latest stored summary or null |
| POST | `/api/projects/:id/experiments` | `{assumptionId}` for AI suggestion, or manual experiment fields | Experiment, 201 |
| GET | `/api/projects/:id/experiments` | page/limit | Experiments |
| PATCH | `/api/experiments/:id` | `{status,observedResult?}` | Updated experiment |

Participant: 1–150 characters; use an alias, not sensitive personal details.
Notes: 10–30000 characters, up to 30 same-project assumption IDs. Manual
associations are neutral evidence, not an inferred supporting sentiment.
Feedback analysis requires an existing analysis and actual notes. Quote and
reference validation happens before saving; AI analysis never changes statuses.
Summary JSON contains themes, cited evidence, contradictions, evidence gaps and
unsupported conclusions. Generation is limited to the latest analysis's assumptions.

Manual experiment body:

```json
{
  "assumptionId": "00000000-0000-4000-8000-000000000000",
  "name": "Experiment name",
  "explanation": "Why this tests the assumption.",
  "method": "The actual procedure.",
  "evidenceToCollect": "What will be recorded.",
  "successCriteria": "A measurable threshold."
}
```

The UUID above is a placeholder, not a real assumption. Use a returned UUID.
Experiment status: PLANNED → IN_PROGRESS → COMPLETED, or ABANDONED from
PLANNED/IN_PROGRESS. Completion requires an observed result; it never validates
an assumption automatically.

### Resource endpoints

| Method | Path | Request | Response data |
| --- | --- | --- | --- |
| POST | `/api/projects/:id/resources/search` | query?, languages?, categories?, explain? | Search ID, provider statuses, requirements, ranked source-backed items, 201 |
| GET | `/api/projects/:id/resources` | page/limit/category?/saved? | Latest search recommendations, or saved collection when saved=true |
| GET | `/api/resources/:id` | UUID | Current reusable source record |
| POST | `/api/resources/:id/save` | `{projectId,status?}` | Idempotently saved resource; status defaults CONSIDERING only on first save |
| DELETE | `/api/projects/:id/resources/:resourceId/save` | UUIDs | Clears that project's save, not the source or recommendation |

Save status: CONSIDERING, TRYING, INTEGRATED. The resource must have been retrieved
for that project. A caller cannot attach an arbitrary global source to another
project. `saved=false` filters unsaved recommendations from the latest search.
`saved=true` includes older saved sources even when later searches differ.

See [resource intelligence](RESOURCE_INTELLIGENCE.md) for categories, response
fields, scoring, caching, provider limits and explicit failure semantics.

### Security and operating limits

JSON body 128 KB; API 120/minute and AI-triggering routes 10/minute per IP by
default, configurable. Process-local limits/cache are not distributed infrastructure.
AI concurrency max 2. CORS is not enabled for cross-origin browsers.
No authentication tokens or caller-supplied identity headers bypass production
blocking. Root `/` is intentionally not a website; use `/api/health`.

## Historical planned contract — not the active API

**Document Version:** 1.1.0  
**Status:** Planned Contract Specification  
**Architecture Alignment:** [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)  
**Maintained by:** Null Theory Engineering Team  

> **Implementation Note:**  
> All endpoints documented below represent the target API contracts to be implemented across Phase 2 (Days 3–4), Phase 3 (Days 5–9), and Phase 4 (Days 10–13). No endpoints are currently live.

---

## 1. Base URL

```text
# Local Development
http://localhost:3000/api/v1

# Production (Replit Cloud)
https://<repl-slug>.<username>.repl.co/api/v1
```

---

## 2. Authentication Specification (Target)

Authenticated routes require a standard Bearer token in the HTTP Authorization header:

```text
Authorization: Bearer <jwt-token>
```

---

## 3. Core Validation Engine Endpoints

### 3.1 Project & Submission Management

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/projects` | Initialize a new founder workspace | 🔲 Planned |
| `GET` | `/api/v1/projects/:id` | Fetch project details and metadata | 🔲 Planned |
| `POST` | `/api/v1/projects/:id/submissions` | Submit product idea, audience, and problem statement (Step 1) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/submissions` | Retrieve submission history and iterations | 🔲 Planned |

#### Request Payload: `POST /api/v1/projects/:id/submissions`
```json
{
  "productName": "SaaSMetrics",
  "targetAudience": "Bootstrapped B2B SaaS founders with $1k-$10k MRR",
  "problemStatement": "Founders spend hours manually stitching Stripe data into spreadsheets to calculate churn and LTV.",
  "proposedSolution": "An automated background sync that alerts founders in Slack when churn spikes."
}
```

---

### 3.2 Assumption Extraction & Risk Prioritization

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/submissions/:id/assumptions/extract` | Trigger AI extraction of unstated assumptions (Step 2) | 🔲 Planned |
| `GET` | `/api/v1/submissions/:id/assumptions` | Fetch categorized assumptions with risk scores (Step 3) | 🔲 Planned |
| `PATCH` | `/api/v1/assumptions/:id` | Manually adjust assumption category or score | 🔲 Planned |

#### Response Payload: `GET /api/v1/submissions/:id/assumptions`
```json
{
  "success": true,
  "data": [
    {
      "id": "asm_01j8k9",
      "category": "PROBLEM",
      "statement": "Founders calculate churn weekly rather than waiting for monthly accountant reports.",
      "impactScore": 4,
      "uncertaintyScore": 5,
      "compositeRisk": 20,
      "isLethal": true,
      "rationale": "If founders only look at churn once a month, real-time Slack alerts solve a non-urgent pain.",
      "status": "UNVERIFIED"
    }
  ]
}
```

---

### 3.3 Customer Discovery & Interview Generation

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/assumptions/:id/interview-questions` | Generate Mom-Test-compliant discovery questions (Step 4) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/interview-script` | Export full project interview guide | 🔲 Planned |

#### Response Payload: `POST /api/v1/assumptions/:id/interview-questions`
```json
{
  "success": true,
  "data": {
    "assumptionId": "asm_01j8k9",
    "questions": [
      {
        "question": "How did you check your revenue and churn numbers last week?",
        "probeType": "PAST_BEHAVIOR",
        "listenFor": "Do they mention dedicated software, manual exports, or total avoidance?"
      },
      {
        "question": "What tools or subscriptions do you currently pay for to monitor your business metrics?",
        "probeType": "CURRENT_EXPENDITURE",
        "listenFor": "Reveals whether budget is already allocated for metrics."
      }
    ]
  }
}
```

---

### 3.4 Feedback Ingestion & Contradiction Detection

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/projects/:id/feedback` | Ingest qualitative customer interview notes (Step 5) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/contradictions` | Analyze ingested notes for conflicting evidence (Step 6) | 🔲 Planned |

#### Response Payload: `GET /api/v1/projects/:id/contradictions`
```json
{
  "success": true,
  "data": [
    {
      "id": "cnt_99x",
      "assumptionId": "asm_01j8k9",
      "contradictionSummary": "Conflicting feedback regarding urgency of real-time churn metrics.",
      "evidenceA": {
        "interviewee": "Founder #2 (5-person agency)",
        "quote": "I check Stripe every morning, it's my first ritual."
      },
      "evidenceB": {
        "interviewee": "Founder #4 (Solo dev)",
        "quote": "I honestly only look at churn when my quarterly taxes are due."
      },
      "recommendation": "Segment your target audience: agencies require daily monitoring; solo builders do not."
    }
  ]
}
```

---

### 3.5 Experiment Recommendations

| Method | Endpoint | Description | Status |
|:---|:---|:---|:---:|
| `POST` | `/api/v1/assumptions/:id/experiments` | Generate falsification experiments (Step 7) | 🔲 Planned |
| `GET` | `/api/v1/projects/:id/experiments` | List all recommended validation experiments | 🔲 Planned |

#### Response Payload: `POST /api/v1/assumptions/:id/experiments`
```json
{
  "success": true,
  "data": {
    "assumptionId": "asm_01j8k9",
    "experimentType": "CONCIERGE_TEST",
    "title": "Manual Daily Slack Churn Digest",
    "description": "Offer 5 target founders a free manual 7-day test where you send their daily metric summary by 9 AM.",
    "metric": "Daily Open / Engagement Rate",
    "falsificationThreshold": "If fewer than 3 of 5 founders respond or check the alert for 4+ days, the pain is not urgent.",
    "estimatedDurationDays": 7
  }
}
```

---

## 4. Standard Response Envelope

All API endpoints return JSON conforming to the following envelopes:

### Success Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-10-31T01:00:00.000Z"
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Problem statement must contain at least 50 characters of context.",
    "details": []
  },
  "timestamp": "2026-10-31T01:00:00.000Z"
}
```
