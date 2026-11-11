# Prompt 08 — Customer Discovery and Interview Management

## Scope and existing integration

This feature extends `artifacts/blindspot-web`, not the legacy `frontend/`
prototype or a second backend. Existing `/projects/:id/interviews` links remain
valid. Existing evidence review remains at `/projects/:id/evidence`.
Experiment management and Resource Intelligence are outside this phase.

The integration was checked against `backend/src/phase01/contracts.ts`,
`backend/src/phase01/app.ts`, `backend/src/phase01/validation/service.ts`,
`lib/api-spec/openapi.yaml`, the generated React client, and
`docs/FRONTEND_INTEGRATION_AUDIT.md`. The audit's description of the legacy
frontend is historical; the active founder workspace is the artifact above.

## Actual API contracts

All six endpoints require Clerk authentication and backend ownership checks.
Successful responses have the envelope `{ success: true, data: ... }`.

| Endpoint | Accepted request | Returned data |
| --- | --- | --- |
| `POST /api/projects/:id/interviews` | `{ participant: string }` | An interview |
| `GET /api/projects/:id/interviews` | Query `page`, `limit` | `{ items: Interview[], pagination: { page, limit } }` |
| `POST /api/interviews/:id/feedback` | `{ notes: string, assumptionIds?: string[] }` | A feedback entry |
| `GET /api/interviews/:id/feedback` | Query `page`, `limit` | `{ items: Feedback[], pagination: { page, limit } }` |
| `POST /api/projects/:id/feedback/analyze` | `{}` | A saved feedback analysis with transient evidence/review metadata |
| `GET /api/projects/:id/feedback/summary` | None | The latest persisted feedback analysis, or `null` |

- Participant aliases are trimmed by the server and must contain 1–150 characters.
  Titles, additional participant contact information, context, status, and
  separate interview notes are **not** supported creation fields.
- Feedback notes are trimmed at their outer whitespace by the server and must
  contain 10–30,000 characters. The wording is not rewritten by the frontend.
  Up to 30 UUID assumption IDs may be supplied. There are no separately stored
  willingness-to-pay, objection, or founder-note fields.
- An interview includes `id`, `projectId`, `participant`, `questions`,
  `createdAt`, and nullable `sourceAnalysisVersion`. Questions expose
  `assumptionId`, `question`, and `listenFor`.
- Feedback entries include `id`, `interviewId`, `notes`, and `createdAt`.
- Lists expose page/limit, **not totals**. Displayed totals must be derived from
  complete pagination, never from a single page labeled as the entire project.
- Feedback summaries expose `id`, `projectId`, `createdAt`, and `result`.
  Result fields are `themes`, `evidence`, `contradictions`, `evidenceGaps`,
  and `unsupportedConclusions`.
- Result evidence includes `feedbackId`, `assumptionId`, `quote`, `sentiment`,
  and `reasoning`. Contradictions include `feedbackAId`, `feedbackBId`,
  `quoteA`, `quoteB`, and `explanation`.
- The persisted GET summary does not return the POST-only `evidenceRecords`,
  `reviewRequired`, or `statusesAutomaticallyChanged` metadata. Summary
  rendering after reload must use the persisted `result` fields and continue
  identifying AI findings as suggestions requiring human review.

## Data integrity

Manual assumption links create `HUMAN_MAPPING`/`NEUTRAL` evidence. They do not
claim support, contradiction, verification, or an outcome. AI findings also do
not automatically change assumption statuses. The existing backend validates
quote provenance and requires approved evidence for human outcome review.

The interview's stored source analysis version is historical context; it is
not replaced with the project's current version. Report-to-session navigation
still sends only the participant alias, not historical report prompts.

Sensitive aliases and draft feedback must not be written to browser storage.
In-memory form recovery does not promise recovery after reloading the page.

## Environment limitations observed

On 2026-11-11, the real `/api/health` endpoint returned HTTP 200 with the
database connected. The real private `/api/projects?limit=1` endpoint returned
HTTP 503 `AUTH_NOT_READY`, and Clerk management status was `not_configured`.
No authentication bypass or fabricated production data was added.

Therefore any fixture-backed component/browser tests must be reported
separately from live API integration. Signed-in creation, feedback persistence,
and AI execution against real project data cannot be called live-verified
until Clerk and the required services are available.

## Verification and changed files

### Implemented components

- `artifacts/blindspot-web/src/pages/interviews.tsx`: connected Customer
  Discovery overview, interviews/insights navigation, scoped alias filtering,
  list/detail navigation, actual aggregate interview count, report handoff.
- `artifacts/blindspot-web/src/components/project-frame.tsx`: Customer Discovery
  navigation label while retaining the `/interviews` URL and tab test ID.
- `artifacts/blindspot-web/src/components/shell.tsx`: corrected the historical
  warning that inaccurately claimed records were anonymously readable.
- `artifacts/blindspot-web/src/pages/evidence.tsx`: existing outcome review,
  now sharing the saved feedback summary presentation with Discovery.
- `artifacts/blindspot-web/src/hooks/use-discovery.ts`: bounded paginated total,
  private in-memory drafts scoped to the QueryClient, synchronous form snapshots,
  note freshness metadata, and cache invalidation helpers.
- `artifacts/blindspot-web/src/components/discovery/create-interview-dialog.tsx`:
  validated participant-only creation, error/retry retention, pending guards.
- `artifacts/blindspot-web/src/components/discovery/feedback-composer.tsx`:
  original-wording entry, optional neutral assumption links, save/error states.
- `artifacts/blindspot-web/src/components/discovery/feedback-timeline.tsx`:
  timestamped paginated history, truthful entry counts, expandable long notes.
- `artifacts/blindspot-web/src/components/discovery/interview-detail.tsx`:
  stored source-version context, original question script, notes and history.
- `artifacts/blindspot-web/src/components/discovery/feedback-summary.tsx`:
  shared real analysis mutation, persisted themes, verbatim quotations,
  unverified assumption relationships, contradictions and evidence gaps.
- `artifacts/blindspot-web/src/components/discovery/motion.ts`: reduced-motion
  aware animation helpers.
- `artifacts/blindspot-web/src/pages/customer-discovery.test.tsx`: regression
  tests using the real generated client against test-only fetch responses.

No backend, OpenAPI, generated-client, database-schema, auth-provider, or
experiment/resource-management changes were needed.

### Checks executed

- `pnpm run typecheck`: passed across the workspace. This also refreshed stale
  generated TypeScript declaration outputs before checking the web app.
- `pnpm --filter @workspace/blindspot-web typecheck`: passed after final changes.
- Eleven existing frontend report/evidence regression tests passed.
- Nine new Customer Discovery tests passed. They cover alias retention/retry,
  synchronous duplicate protection, failed-note recovery and neutral-link input,
  complete paginated interview counts, pending save completion after unmount,
  analysis retry and summary reload, analysis pending across tab switches,
  expandable long notes, and fail-closed private access.
- `PORT=21178 BASE_PATH=/ pnpm --filter @workspace/blindspot-web build`: passed.
  Vite still reports source-map warnings for existing UI primitives and a
  JavaScript chunk above its 500 KB advisory threshold; neither failed the build.
- Web workflow restarted successfully and served Vite without a startup error.
- Real health/private-access probes returned the responses documented above.
- One fixture-backed browser pass passed at desktop and 390×844 mobile size.
  It exercised empty discovery, failed create/retry, source version and total,
  failed feedback/retry with neutral links, long-note expansion, analysis,
  persisted-summary reload without transient metadata, mobile detail/back
  navigation, modal fit, reduced-motion preference and horizontal overflow.
  No uncaught page errors or unexpected fixture routes were observed. The
  deliberate 503 failures were expected. This pass did not write to the database
  or verify live persistence/authentication/AI.

The nine backend test files (133 tests) and backend build had passed on the
same unchanged backend earlier in this session. They were not rerun for this
frontend-only feature. The managed `backend-check` workflow still displays its
older failed run, whose logs show missing Vitest/Chai modules during worker
startup; this is not a new passing workflow result.

### Remaining limitations

- Clerk is still unconfigured, so the live signed-in discovery/AI flow has not
  been verified. Fixture-backed frontend checks are not evidence of live saves.
- The interview total walks pages of 100 and stops after 100 pages. If that cap
  is reached, it displays a lower bound with `+`, not an invented exact count.
  There is no unsupported project-wide feedback total.
- Drafts survive SPA navigation but not a full reload. The discovery screen
  warns on tab close/reload while it has unsaved text. The auth integration must
  clear the same QueryClient at account teardown, as it does private queries.
- Synchronous guards prevent repeat submits and remain effective across view
  changes while a request is pending. The backend has no idempotency-key contract:
  if a response is lost after a write commits, a manual retry can still duplicate
  the record. No automatic retry of write mutations was added.
- A “new notes since summary” notice uses observed save timestamps in this SPA
  session; the backend does not provide project-wide summary freshness metadata.

### Manual verification after Clerk is configured

1. Sign in with a project-owning account and open an analyzed project's
   **Customer Discovery** tab.
2. Create an interview with an alias only. Confirm its returned script and
   stored source analysis version, and that the list/total refresh.
3. Enter actual interview words as notes; optionally select hypotheses as neutral
   associations. Save and confirm the original wording and timestamp in history.
4. Test a failing save, then retry: the input should remain, the error should be
   visible, and only the successful response should clear the draft.
5. Switch interviews and views with unsaved notes. Return and confirm the draft
   remains. Test a pending save across a view change without submitting twice.
6. Open **Insights** and choose **Analyze Customer Feedback**. Verify actual
   backend output, human-review labels, quotes, contradiction references,
   hypothesis relationships, gaps and unsupported conclusions.
7. Reload and confirm the saved summary renders from GET, without relying on the
   POST-only transient metadata. Confirm no hypothesis was automatically verified.
8. Repeat the dialog, detail/back navigation, timeline expansion and insight
   sections at phone and tablet widths with long feedback.
9. Confirm an unauthenticated or non-owning account cannot retrieve the project
   or its interviews/feedback through the backend. Do not bypass ownership guards.
