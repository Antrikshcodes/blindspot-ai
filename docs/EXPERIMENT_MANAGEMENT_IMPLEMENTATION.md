# Prompt 10 — Experiment Planning and Management

## Features implemented

Extended the existing Blindspot AI founder app at
`/projects/:id/experiments`. The implementation uses the current Phase 01 backend,
generated React Query client, project access boundary and existing visual system.
No static production records, second backend, authentication bypass or Resource
Intelligence feature was introduced.

- Experiment overview with clickable status counts scoped to the loaded page.
  Counts are not presented as project totals, success rates or validation scores.
- Search, status/assumption filters, actual-field sorting and bounded pagination.
  List cards include the actual description, assumption context, status and
  creation/update dates.
- Selectable experiment details with protocol, related assumption, creation and
  update dates, and saved observations clearly separated from success criteria.
- Fully validated manual creation and the existing AI-generation/save workflow.
- Backend-authoritative Start, Complete and confirmed Abandon actions.
- Observation saving during Planned or In progress, completion guards, visible
  backend errors, retained failed drafts and refreshed server-accepted results.
- Actual assumption/evidence navigation, including an honest unresolved-reference
  state rather than inferred relationships.
- Responsive forms, details, wrapped long text, touch controls and
  reduced-motion-aware transitions.

## Connected API endpoints

All successful responses use `{ success: true, data: ... }`.

| Endpoint | Input / purpose | Response used |
| --- | --- | --- |
| `GET /api/projects/:id` | Project identity and ownership/access boundary | Project |
| `GET /api/projects/:id/experiments` | `page`, `limit` | `{ items: Experiment[], pagination: { page, limit } }` |
| `POST /api/projects/:id/experiments` | Strict manual object **or** `{ assumptionId }` for AI generation | Created Experiment, HTTP 201 |
| `PATCH /api/experiments/:id` | `{ status, observedResult? }` | Backend-accepted Experiment |
| `GET /api/projects/:id/analysis` | Latest analysis and real assumption context/picker | Latest analysis or existing error/empty state |
| `GET /api/analyses/:id/assumptions` | Existing Evidence destination, one page at a time | Assumptions with actual embedded evidence |

No experiment-detail, preview, protocol-edit, delete, reopen, independent
generation or relationship endpoint was invented.

## Exact schemas and validation

Checked the integration audit, active Phase 01 application routes, validation
contracts/service, database schema, OpenAPI/generated client and legacy shared
types. The active Phase 01 contracts, not the old shared interfaces, are
authoritative.

### Persisted Experiment

```ts
{
  id: string;
  projectId: string;
  assumptionId: string;
  name: string;
  explanation: string;
  method: string;
  evidenceToCollect: string;
  successCriteria: string;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  observedResult: string | null;
  createdAt: string;
  updatedAt: string;
}
```

The generated response types `status` as a string, while the database enum,
update contract and service enforce the four listed statuses.

The `experiments` table has project and assumption foreign keys, defaults status
to Planned, and stores one nullable observed-result field. It does not provide
an AI-origin flag, separate expected-result field, timeframe, completion
timestamp, structured outcome verdict or observation revision history.
`updatedAt` is displayed as an update time, not a claimed completion time.

### Creation

The actual POST route accepts a strict union:

```ts
// Manual: every field below is required.
{
  assumptionId: UUID;
  name: string;              // trimmed, 1–200 characters
  explanation: string;       // trimmed, 1–2000 characters
  method: string;            // trimmed, 1–2000 characters
  evidenceToCollect: string; // trimmed, 1–2000 characters
  successCriteria: string;   // trimmed, 1–2000 characters
}

// AI generation: this is the entire body.
{ assumptionId: UUID }
```

Although generated `ExperimentInput` marks the manual fields optional, the real
manual backend contract requires all five. The form enforces the stricter union.
No unsupported fields are sent.

AI generation uses the same POST endpoint and **immediately saves a Planned
record**. The UI labels that behavior before submission and asks the founder to
review the returned protocol before starting. There is no fictional preview or
second Save action. Historical/reloaded records are not labeled as AI-origin
because the API does not persist that information.

### Update

```ts
{
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  observedResult?: string; // if supplied: trimmed, 1–4000 characters
}
```

Updates cannot edit protocol fields or clear the observation with an empty
string. Status-only requests omit `observedResult`, preserving the stored value.
Entered text is trimmed only for the outbound contract; original saved text is
displayed as returned.

## Status transition rules

| Current status | Offered transitions |
| --- | --- |
| `PLANNED` | `IN_PROGRESS`, `ABANDONED` |
| `IN_PROGRESS` | `COMPLETED`, `ABANDONED` |
| `COMPLETED` | None |
| `ABANDONED` | None |

The backend also accepts same-status updates. The UI uses this to save
observations during active stages without implying completion. Completed and
Abandoned records are read-only in this UI; there is no invented reopening.

Completion requires a nonblank newly supplied observation or an existing saved
one. Blank/oversized drafts do not enable completion. With an unchanged saved
observation, completion sends status only rather than rewriting the original.
The backend locks and validates the record before accepting a status/result
update. `RESULT_REQUIRED` and `INVALID_STATUS_TRANSITION` remain authoritative.
Rejected writes retain the previous outcome and draft.

Abandonment requires confirmation and explicitly says it is final, keeps the
saved observation, and does not submit unsaved text. Observation edits warn that
Save replaces the current field, show the currently saved text for comparison,
and do not pretend there is server-side revision history.

Completing, abandoning or saving an observation never sends an assumption update,
creates verified evidence or establishes whether an assumption is true.

## State, security and relationship handling

- Generated hooks are imported from `@workspace/api-client-react`.
- Pending writes have synchronous guards and QueryClient mutation-key locks,
  including across component remounts.
- Cache changes and successful draft cleanup live in mutation-level callbacks,
  not only component callbacks that can disappear during navigation.
- Accepted updates patch matching cached list records and invalidate all project
  experiment pages. Details use fresh query data; a just-created fallback record
  also receives accepted updates.
- Private drafts live in session QueryClient memory via synchronous subscriptions.
  No localStorage, sessionStorage or module-global private draft store is used.
- Creation returns to page 1, clears filters and selects the saved record.
  Pagination resets page-local filters so unavailable options cannot silently
  remain active.
- Latest-analysis failure pauses creation/context, not access to existing
  experiments. Empty/error/access-denied states remain explicit.
- An experiment's real `assumptionId` links to Evidence. A matching loaded
  hypothesis opens expanded relationships; a target on a later page can be
  located through explicit pagination. No unbounded page scan occurs.
- Older/unresolved references retain their exact ID. The experiment response has
  no original analysis ID, so no replacement assumption is inferred.
- Supporting/challenging evidence and customer-note navigation continue through
  actual Evidence relationships/source lookup. There is no fabricated direct
  experiment-to-interview association.
- Backend Clerk and ownership checks remain intact. Error UI uses the existing
  safe error presentation, not serialized server exceptions or secrets.

## Components and files

Created:

- `artifacts/blindspot-web/src/components/experiments/card.tsx`
- `artifacts/blindspot-web/src/components/experiments/create-dialog.tsx`
- `artifacts/blindspot-web/src/components/experiments/detail.tsx`
- `artifacts/blindspot-web/src/components/experiments/ui.ts`
- `artifacts/blindspot-web/src/hooks/use-experiments.ts`
- `artifacts/blindspot-web/src/lib/experiments.ts`
- `artifacts/blindspot-web/src/test/experiment-fixture.ts` — test-only data
- `artifacts/blindspot-web/src/pages/experiments.test.tsx`
- This report.

Modified:

- `artifacts/blindspot-web/src/pages/experiments.tsx`
- `artifacts/blindspot-web/src/pages/evidence.tsx`
- `artifacts/blindspot-web/src/components/evidence/evidence-relationships.tsx`
- `artifacts/blindspot-web/src/pages/evidence-intelligence.test.tsx`

No backend, database, OpenAPI or generated-client changes were required.

## Tests and results

- Frontend TypeScript check: passed.
- All **54 frontend tests across four files**: passed. This includes 17 new
  experiment tests, two new assumption-handoff tests and 35 existing tests.
- New cases cover actual returned fields, bounded/scoped counts, strict manual
  validation, AI save/error behavior, synchronous duplicate submissions, pending
  creation across remounts, draft cleanup, blank/oversized completion rejection,
  deliberate backend rejection and retry, exact saved-result preservation,
  same-status observation saving, Start/Abandon, filters/sorting, exact Evidence
  navigation, unresolved history, empty/retry states and 401/404/503 handling.
- Production frontend build: passed. Existing UI-primitive source-map warnings
  and the bundle-size advisory remain nonfatal.
- Web workflow restarted successfully.
- One fixture-backed Playwright founder journey on desktop and 390×844 mobile:
  passed. Covered strict manual creation, Start, blank-completion guard,
  multiline observation saving, deliberate completion rejection and accepted
  retry, preserved read-only outcome, exact Evidence handoff with unchanged
  assumption status, filters/sort and AI immediate-save behavior. Mobile covered
  long protocol text, modal scroll/cancel, selected-detail scrolling, Abandon
  cancellation and the saved-versus-unsaved observation distinction. Measured no
  page-level horizontal overflow. No unexpected intercepted API paths appeared.
- A separate non-intercepted preview screenshot showed the actual
  authentication error, not fixture or private records.
- After screenshot review, description and creation date were added directly to
  list cards; the targeted list regression, TypeScript and build checks cover
  that static addition.
- Real `/api/health`: HTTP 200, database connected.
- Real private `/api/projects?limit=1`: HTTP 503 `AUTH_NOT_READY`; Clerk management
  reported `not_configured`.

The API-backed UI uses real generated hooks in production. Automated fixture
tests are deliberately isolated and are **not** proof of live ownership checks,
AI-provider generation, database persistence or real signed-in workflows.

## Limitations and backend work

- Live private-data/AI/persistence verification needs configured Clerk sign-in.
- Counts, search and sorting cover one returned experiments page (20 records);
  the API provides no project-wide status totals, success metric or backend
  search/sort contract. No global completion/validation percentage is claimed.
- AI generation saves immediately. A real preview/approval-before-save workflow,
  editable protocols or durable AI provenance would require backend contracts.
- Creation can select current-analysis assumptions. Historical experiment
  references remain visible, but their source analysis cannot be resolved from
  this response alone.
- Observations are a single field. Revision history, structured outcomes,
  timeframes and completion timestamps would require backend/schema changes.
- The API has no idempotency-key contract. Pending clicks/remounts are guarded;
  a user retry after an ambiguous network failure can still duplicate a record
  already committed by the server. No backend change was made to pretend otherwise.
- Existing backend code was unchanged; previously passing backend tests/build
  were not rerun for this frontend phase. The managed backend-check workflow
  retains its earlier failure rather than being claimed green.

## Manual test instructions

1. Configure Clerk, sign in as the project owner, and open a project with an
   analysis. Select Experiments.
2. Inspect loaded-page status counts and search/filter/sort the actual records.
3. Create manually: choose an actual assumption and fill every protocol field.
   Empty/oversized fields should be blocked. Save and inspect the Planned record.
4. Start it. With no observation, completion should be disabled. Write and save
   an observation; verify the status stays In progress and criteria are unchanged.
5. Inspect/edit an observation, including the stored-text comparison and
   replacement warning. Confirm failed writes retain the draft and prior record.
6. Complete with valid observed results. Confirm accepted status/observation after
   reload, read-only terminal controls and unchanged assumption status.
7. Generate an AI suggestion with only an assumption selected. Confirm the
   immediate-save warning, real returned Planned protocol and human-review need.
   Provider errors must not create substitute protocols.
8. Open the related assumption's Evidence view. Verify exact expanded
   relationships, actual linked records and honest unresolved-reference states.
9. On a different active experiment, open Abandon, cancel once, then confirm.
   Saved observations must survive; unsaved text must not be sent automatically.
10. Repeat forms, long descriptions, observations and navigation at phone/tablet
    widths with reduced motion. Confirm there is no page-level horizontal overflow.
11. With an unauthenticated/non-owning account, verify private data remains
    inaccessible. Do not bypass the backend boundary to make the test pass.
