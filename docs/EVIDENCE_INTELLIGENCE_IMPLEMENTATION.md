# Prompt 09 — Evidence Intelligence and Contradiction Detection

## Delivered scope

The existing founder app at `artifacts/blindspot-web` now presents
**Evidence Intelligence** at `/projects/:id/evidence`. Existing URLs and tab
test IDs remain valid. No second frontend, backend, experiment management,
Resource Intelligence feature, authentication bypass, or browser-storage
persistence was introduced.

The page includes:

- A searchable evidence library with sentiment, origin, and related-hypothesis
  filters, timestamp sorting, filter reset and selectable original-quote details.
- Explicit loaded-page scope for counts, evidence coverage and relationships.
  No invented confidence score, verified count or project-wide evidence total.
- An expandable relationship list showing actual supporting, challenging and
  neutral links, distinct feedback references and hypotheses with no returned
  linked evidence. Mixed sentiment is not labeled a proven contradiction.
- Full evidence details, original quotation, reasoning, record and feedback
  references, origin, sentiment, timestamp and current related-hypothesis context.
- Existing backend-authoritative Begin testing, Record outcome and Reopen
  controls, reused rather than replaced by a parallel status system.
- AI-detected conflict context with the actual pair of quotes and feedback IDs,
  explanation, and related hypotheses only where loaded records establish links.
  The existing feedback-analysis action and persisted summary remain connected;
  conflicts are not rendered twice.
- On-demand, paginated source-note lookup. An exact feedback-ID match is required
  before the app offers a link to the original interview and note page.
- Responsive details and source dialogs, mobile detail scrolling, wrapped long
  quotes and references, and reduced-motion-aware transitions.

## Source audit and actual contracts

Checked the active Phase 01 router, validation service, contracts and database
schema, the generated client and OpenAPI schema, the current analysis/report and
Customer Discovery integrations, the integration audit, and legacy shared types.
The legacy `shared/types` interfaces are not the active client contract.

All successful responses use `{ success: true, data: ... }`. Private endpoints
retain Clerk authentication and ownership checks.

| Endpoint | Input | Fields used |
| --- | --- | --- |
| `GET /api/projects/:id` | Project ID | Project identity and access boundary |
| `GET /api/projects/:id/analysis` | Project ID | Latest analysis ID/version and assumptions; **not** embedded evidence |
| `GET /api/analyses/:id/assumptions` | `page`, `limit` | `{ items, pagination: { page, limit, total } }`; each assumption includes `evidenceRecords` |
| `PATCH /api/assumptions/:id` | `{ status, evidenceIds? }` | Backend-accepted assumption update |
| `GET /api/projects/:id/feedback/summary` | Project ID | Latest persisted summary or `null` |
| `POST /api/projects/:id/feedback/analyze` | `{}` | Real feedback-analysis mutation and returned saved summary |
| `GET /api/projects/:id/interviews` | `page`, `limit` | Interview list for explicit source lookup |
| `GET /api/interviews/:id/feedback` | `page`, `limit` | Original notes for the selected interview |

### Evidence and relationship schemas

`Evidence` contains only:

```text
id, feedbackId, assumptionId, quote, reasoning, origin, createdAt,
sentiment: SUPPORTING | INVALIDATING | NEUTRAL
```

`Assumption` exposes its identity/analysis, description, explanation,
`evidenceRequired`, `validationMethod`, `category`, `riskLevel`, `impact`,
`uncertainty`, `riskScore`, `status`, optional `createdAt`/`updatedAt` and embedded
`evidenceRecords`. Evidence is linked only where
`record.assumptionId` matches its enclosing assumption. Duplicate evidence IDs
are not counted twice.

The database relationships are:

- `evidence_records.feedback_id` → `interview_feedback.id`
- `evidence_records.assumption_id` → `assumptions.id`
- `interview_feedback.interview_id` → `interview_sessions.id`
- `assumptions.analysis_id` → `analyses.id`
- `assumption_evidence` stores outcome citations with assumption ID, evidence ID,
  reviewed status and creation timestamp.
- `feedback_analyses` stores project ID, result JSON and generation timestamp.

The current API does **not** read `assumption_evidence` review history or expose
an evidence-level verified flag. It has no independent evidence-list/detail or
verify/unverify endpoint. The implementation therefore does not invent those
endpoints, fields, filters or actions.

`HUMAN_MAPPING` means a neutral manual association; it is not verification.
`AI_SUGGESTED_REVIEW_REQUIRED` means a model-suggested record; its sentiment is not
human verification either. An assumption's current outcome is also not an
evidence-level verification flag. Details explicitly say **Verification not
exposed**, rather than claiming a record is verified or unverified.

### Contradiction schemas

Persisted summary results contain `themes`, `evidence`, `contradictions`,
`evidenceGaps` and `unsupportedConclusions`.

A persisted `FeedbackSummary` has `id`, `projectId`, `createdAt` and `result`.
Its `result.evidence` items use `feedbackId`, `assumptionId`, `quote`, `sentiment`
and `reasoning`; they are AI suggestions, not verified record metadata. Transient
POST-only evidence/review metadata is not assumed to exist in the GET summary.

A contradiction contains `feedbackAId`, `feedbackBId`, `quoteA`, `quoteB` and
`explanation`. It does not include an assumption ID, verified state or confidence.
Related assumptions are shown only via actual loaded evidence sharing the exact
feedback reference. No link is inferred from similar wording.

AI detection is labeled as a suggestion requiring review, not proof of a
contradiction. No verified-contradiction action exists. When the backend returns
none, the UI shows the empty state instead of fabricating findings.

## Exact outcome-review rules

These are the active backend rules, rather than a hypothetical separate
evidence-verification workflow:

1. `UNTESTED` can move to `TESTING`.
2. `TESTING` can move to `SUPPORTED`, `INVALIDATED` or `INCONCLUSIVE`.
3. Any of those three outcomes can reopen to `TESTING`.
4. An outcome requires at least one cited evidence ID linked to that assumption.
5. `SUPPORTED` requires at least one cited `SUPPORTING` record.
6. `INVALIDATED` requires at least one cited `INVALIDATING` record.
7. `INCONCLUSIVE` can cite any linked sentiment, including neutral evidence.
8. The backend locks the assumption and checks citations/sentiment before saving
   the outcome and review-citation records. Existing eligible-citation controls
   guide the user but never substitute for backend acceptance.

Relevant backend errors include `INVALID_STATUS_TRANSITION`,
`EVIDENCE_REQUIRED`, `INVALID_EVIDENCE` and `EVIDENCE_MISMATCH`. They remain
visible to the user. Failed requests do not optimistically change the displayed
outcome. Successful changes invalidate assumption lists and analysis/latest
queries. Detail context is resolved by ID from fresh query data.

This phase does not implement the separately queued citation-history, duplicate
transition, interview-idempotency or interview-total tasks.

## Source navigation and pagination

The evidence response exposes a feedback ID but not the owning interview ID.
There is no direct feedback lookup endpoint. The source dialog therefore:

1. Loads one page of the project's actual interviews.
2. Loads feedback only for an interview the user selects.
3. Matches the requested feedback ID exactly; a similar quote is insufficient.
4. Offers the interview link only after a matching record is returned.

Source lookup uses the actual interview's `id`, `projectId`, `participant` and
`createdAt`, and feedback's `id`, `interviewId`, `notes` and `createdAt`. It does
not construct an interview association from a quote or infer participant details.

The link carries frontend navigation context: `interviewId`, `interviewPage`,
`feedbackId` and `feedbackPage`. These are not new backend request fields.
Customer Discovery resolves the returned interview on that page and opens the
requested feedback page with a source marker. Page values are bounded to
1–10,000, matching existing pagination constraints. A missing record is reported,
not replaced with a guessed source.

Evidence queries load one assumptions page of 20. Counts and filters explicitly
describe that loaded page of the latest analysis, not all project history.
The backend returns all embedded evidence for each assumption on that page;
the frontend does not have a separate evidence-pagination contract.

## Implementation files

Created:

- `artifacts/blindspot-web/src/lib/evidence.ts`
- `artifacts/blindspot-web/src/lib/source-link.ts`
- `artifacts/blindspot-web/src/components/evidence/evidence-library.tsx`
- `artifacts/blindspot-web/src/components/evidence/evidence-detail.tsx`
- `artifacts/blindspot-web/src/components/evidence/evidence-relationships.tsx`
- `artifacts/blindspot-web/src/components/evidence/evidence-contradictions.tsx`
- `artifacts/blindspot-web/src/components/evidence/source-browser.tsx`
- `artifacts/blindspot-web/src/pages/evidence-intelligence.test.tsx`
- This report.

Modified:

- `artifacts/blindspot-web/src/pages/evidence.tsx`
- `artifacts/blindspot-web/src/components/project-frame.tsx`
- `artifacts/blindspot-web/src/components/discovery/feedback-summary.tsx`
  (optional contradiction rendering; existing Discovery behavior is the default)
- `artifacts/blindspot-web/src/pages/interviews.tsx`
- `artifacts/blindspot-web/src/components/discovery/interview-detail.tsx`
- `artifacts/blindspot-web/src/components/discovery/feedback-timeline.tsx`

No backend, database, OpenAPI or generated-client changes were needed.

## Verification

- Frontend TypeScript check: passed.
- Fifteen new fixture-backed generated-client tests: passed. Coverage includes
  filters, original details, scoped counts, unknown verification, relationships,
  neutral links, outcome rejection/retry and refreshed state, exact source
  lookup, source deep links to a second page, no fabricated conflicts, empty/error
  states, unavailable auth and missing/inaccessible projects, deduplication,
  timestamp sorting and bounded navigation context.
- Twenty existing frontend tests: passed.
- Frontend production build: passed. Existing UI-primitives source-map warnings
  and the bundle-size advisory above 500 KB remain nonfatal.
- Web workflow restarted and served successfully.
- One fixture-backed Playwright desktop/mobile pass: passed. Covered the Library,
  filters and details; deliberate outcome rejection and accepted retry; exact-ID
  source lookup and Customer Discovery handoff; relationships; a single
  AI-review-required conflict; intercepted analysis/reload; 390×844 reduced-motion
  navigation, dialog controls and wrapped note content. No page-level horizontal
  overflow was measured. Navigation/tab strips use contained horizontal scrolling.
  Timestamp ordering used identical browser-fixture dates, so differing-date
  order is covered by the unit test rather than claimed as a browser assertion.
  Review of screenshots prompted wider desktop filter controls and an explicit
  latest-analysis version label; these static changes received code/build checks.
- A separate, non-intercepted preview screenshot confirmed the app renders the
  real authentication error and does not reveal the fixture or private evidence.
- Real health returned HTTP 200 with the database connected. Real private
  `/api/projects?limit=1` returned HTTP 503 `AUTH_NOT_READY`. Clerk management
  reported `not_configured`.
- The backend was unchanged. Its nine files/133 tests and build passed earlier
  in this session; they were not rerun for this frontend phase. The managed
  backend-check workflow still retains its older dependency-startup failure.

Live signed-in evidence, outcome persistence and AI generation cannot be called
verified while Clerk is unconfigured. Fixture-backed tests exercise the frontend
and real generated client but are not live backend integration/security tests.

## Remaining limitations and backend extensions

- There is no verification-status filter or independent Verify action because
  the API does not expose a trustworthy evidence verification state or mutation.
  Implementing those later requires a defined, ownership-checked review-status
  read contract and a dedicated audited verification write contract, followed by
  generated-client updates. Inferring a flag from sentiment, origin, assumption
  status or the existence of a citation would be incorrect.
- Direct one-click source resolution would require an ownership-checked
  feedback-detail/parent lookup endpoint. Until then, lookup is explicit and
  paginated, rather than an unbounded background scan.
- The current library covers the latest analysis, one hypotheses page at a time.
  A project-wide historical evidence browser with backend search and independent
  evidence pagination would need additional API contracts.
- AI-detected conflicts remain suggestions. There is no persisted
  contradiction-review state or action to mark a conflict verified.
- Clerk setup is required before live private-data integration, ownership,
  persistence and AI-generation testing can be completed.

## Manual test instructions after Clerk setup

1. Sign in with a project-owning account, open an analyzed project and select
   **Evidence Intelligence**. Note the latest-analysis and loaded-page scope.
2. Search/filter/sort actual evidence. Select a record and inspect its unmodified
   quotation, references, origin, sentiment and timestamp.
3. Open Relationships and inspect hypotheses with links, no returned links, and
   mixed sentiments. Select a linked record to return to its highlighted detail.
4. For a Testing hypothesis, record an outcome with eligible cited evidence.
   Confirm a backend rejection keeps the prior outcome and the error visible.
   Confirm an accepted update refreshes the detail. Neutral links must not
   qualify for Supported/Invalidated; they can be cited for Inconclusive.
5. Use **Locate original source note**, choose an actual interview and browse
   note pages. A matching feedback ID should enable the interview link; similar
   wording with a different ID must not. Follow the link and inspect the source
   marker in Customer Discovery.
6. Open Conflicts and summary. Run real feedback analysis if notes are available.
   Inspect the actual two quotes and feedback references, AI-review labels,
   loaded related evidence, gaps and unsupported conclusions. Reload and confirm
   persisted summary content is used.
7. Repeat long quotes, filters, details and source-dialog navigation on phone
   and tablet widths with reduced motion enabled.
8. Confirm an unauthenticated/non-owning account cannot retrieve private project,
   assumption, interview or feedback data. Do not bypass the backend boundary.
