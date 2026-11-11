# Resource Intelligence — implementation report

## 1. Features implemented

The active workspace is `artifacts/blindspot-web`, not the legacy `frontend`
described in parts of the integration audit. The existing project Resources route
now opens **Resource Intelligence**.

- Explicit natural-language search, or an explicitly selected automatic
  project/analysis-based AI search.
- Seven backend categories with distinct icons, descriptions and actual provider
  coverage; provider selection lives under advanced controls.
- Optional languages, topics, tasks, archived-repository inclusion and AI
  explanations, using the backend's existing input contract.
- Validated controlled inputs, meaningful loading/error/empty states, no live
  search requests on keystrokes and no artificial progress percentage.
- Search submission locks across clicks and component remounts. Mutations do not
  silently retry. Drafts survive failed requests and navigation within the private
  session QueryClient; no localStorage/sessionStorage persistence was added.
- A bounded, backend-ranked latest-completed-search collection, actual source
  metadata, page navigation and server-side category/provider/relevance/sort filters.
- Current resource detail retrieval separated from the clicked search's immutable
  snapshot, rank context and optional AI explanation.
- Search history with actual persisted timestamps/statuses, provider diagnostics,
  retry information and query-text reuse without automatically running a search.
- Explicit partial/provider-disabled/failed-search messaging. Failed searches do
  not disguise previous successful results as results of the failed query.
- Safe http/https external links reject invalid URLs and embedded credentials,
  open in a new tab and use `noopener noreferrer`. Generic existing HTTPS links
  also now reject embedded credentials.
- Forest Green/Sand Beige dominate; Electric Purple is limited to search and AI
  highlights. Existing fonts and Motion utilities are retained, with reduced-motion
  handling including imperative history-to-form scrolling.

No backend/database changes, saved-resource management or advanced recommendation
management were implemented. The already-existing saved collection is preserved
at the same Resources route with `?collection=saved`; its existing controls are
not redesigned. The new search workspace never invokes save/remove operations.

## 2. API endpoints connected

All callers use `@workspace/api-client-react`, its existing authenticated fetch
transport and the actual `{ success, data }` envelope.

| Existing endpoint | Generated hook | Purpose |
| --- | --- | --- |
| `POST /api/projects/:id/resources/search` | `useSearchResources` | Run retrieval/ranking and the backend's persistence workflow |
| `GET /api/projects/:id/resources` | `useListResources` | Read the latest **completed** search, 20 entries per page |
| `GET /api/projects/:id/resources/searches` | `useListResourceSearches` | Read history and diagnostics, 20 searches per page |
| `GET /api/resources/:id` | `useGetResource` | Read the current source record, subject to backend owned-project retrieval checks |

The existing project frame also uses `GET /api/projects/:id` and fails closed.
Successful search invalidates all collection pages. Every settled attempt
invalidates history, since an all-provider failure can be persisted before the
backend responds with 503. A new successful search resets collection filters/page,
closes an old detail selection and switches History back to Results.

## 3. Provider coverage and checks

The selector describes capabilities, not assumed live availability. Actual run
and history statuses come from the backend.

| Provider selection | Supported category coverage | Read-only adapter check on 2026-11-11 |
| --- | --- | --- |
| `github` | Repositories, open-source tools | Live `react` query returned 2 source records |
| `huggingface_models` | AI models | Live `bert` query returned 2 source records |
| `huggingface_datasets` | Datasets | Live `imdb` query returned 2 source records |
| `huggingface` | Backend selection alias for both HF adapters | Not an independent adapter or an exact collection provider filter |
| `uci` | Datasets | Live `iris` query returned 1 source record |
| `apis_guru` | APIs | Live `weather` query returned 2 source records |
| `technical` | APIs, documentation, open-source tools, learning resources | Existing reviewed catalog; no additional live URL verification claimed |
| `kaggle` | Datasets, when enabled and credentialed on the server | `enabled:false`, `KAGGLE_NOT_CONFIGURED`; not queried |

These checks called the existing backend adapter implementations and HttpClient,
not a replacement frontend search engine. They used public, generic queries with
bounded adapter limits and no project input or database writes. They verify live
retrieval only, **not authenticated REST search, ranking/explanations, ownership
enforcement or persistence end to end**.

## 4. Components created

Under `artifacts/blindspot-web/src/components/resource-search/`:

- `workspace.tsx`: section, run context, failure provenance and Results/History.
- `form.tsx`: validated query/automatic mode, categories and advanced controls.
- `collection.tsx`: bounded collection, source facts, backend filters and cards.
- `detail.tsx`: current record, safe links, exact numeric heuristic scores,
  AI/review-required explanation and search-time snapshot.
- `history.tsx`: persisted run log, expandable diagnostics and explicit query reuse.
- `providers.tsx`: backend-returned status/count/error display.

`hooks/use-resource-search.ts` owns private session draft/run state and mutation
lifecycle/locking. `lib/resource-search.ts` owns provider/category descriptions,
input validation/payload construction and URL validation.

## 5. Files created and modified

Created: the six components above, the hook/helper above,
`src/pages/resource-intelligence.test.tsx`, `src/test/resource-fixture.ts`
(synthetic test-only data) and this report.

Modified in the active web artifact:

- `src/pages/resources.tsx`: connect the new workspace and retain the existing
  saved collection through a compatibility view.
- `src/components/project-frame.tsx`: Resource Intelligence navigation label.
- `src/lib/api.ts`: reject credential-bearing HTTPS links.

Contract work:

- `scripts/blindspot-contract.mjs`: describe existing resource capabilities and
  history; preserve the already-integrated interview `sourceAnalysisVersion`
  field during regeneration.
- `lib/api-spec/openapi.yaml`: regenerated browser contract.
- `lib/api-client-react/src/generated/api.ts` and `api.schemas.ts`: regenerated.
- `lib/api-zod/src/generated/api.ts` and `types/index.ts`: regenerated.
- Updated generated types: `listResourcesParams`, `providerStatus`, `resource`,
  `resourceSearch`, `resourceSearchInput`.
- New generated types: `listResourceSearches200`, `listResourceSearches200Data`,
  `listResourceSearchesParams`, `listResourcesSort`, `resourceMaintenanceSignals`,
  `resourcePopularityMetrics`, `resourceProvider`, `resourceQueryDiagnostic`,
  `resourceQueryDiagnosticParameters`, `resourceSearchGeneratedQueriesItem`,
  `resourceSearchHistory`, `resourceSearchHistoryQueryPlan`,
  `resourceSearchInputSort`, `resourceTechnicalMetadata` (each `.ts`).

No dependency installation, auth configuration, unrelated refactor or environment
file edit was needed. An existing unrelated `.replit` change is excluded.

## 6. Exact API schemas used

The live `backend/src/phase01/contracts.ts` and resource-intelligence services
were checked against the database definitions, generated client and integration
audit. Legacy shared types are not substituted for the current REST contract.

### Strict search input

Every field below is optional; unknown properties are rejected by the backend.
Strings are trimmed by the backend. The frontend validates the trimmed values.

| Field | Type/constraint | Backend default |
| --- | --- | --- |
| `query` | Trimmed string, 1–150 characters; omission selects AI planning | Omitted |
| `languages` | At most 5 nonblank strings, each at most 40 characters | `[]` |
| `categories` | 1–7 of `GITHUB_REPOSITORY`, `DATASET`, `AI_MODEL`, `API`, `DOCUMENTATION`, `OPEN_SOURCE_TOOL`, `LEARNING_RESOURCE` | First five core categories |
| `providers` | 1–8 entries from the provider selections listed above | All adapters matching the selected categories |
| `topics` | At most 5 nonblank strings, each at most 40 characters | `[]` |
| `tasks` | At most 5 nonblank strings, each at most 60 characters | `[]` |
| `includeArchived` | Boolean | `false` |
| `explain` | Boolean | `true` |
| `page` | Integer 1–10000 | `1` |
| `limit` | Integer 1–100 | `20` |
| `minRelevance` | Number 0–100 | `0` |
| `sort` | `relevance` or `lastUpdated` | `relevance` |

The frontend explicitly sends `explain:false` by default. Typed query + explanations
off is AI-free. Automatic mode still uses AI even when explanations are off.
The form uses backend-default POST page/limit/relevance/sort; collection pagination
and filtering use GET rather than re-running a side-effecting POST.

### Search response

`data` contains `searchId`, `projectId`, `query`, `requirements:string[]`,
`generatedQueries:object[]`, `analysisId:string|null`, `cached:boolean`,
`partial:boolean`, `providerStatuses`, `explanationStatus`,
`explanationError:string|null`, `items:SearchItem[]`,
`pagination:{page,limit,total}`.

Each provider status has `provider`, `status`, `count`, optional `error` and
`queries`. Counts are **raw retrieval before deduplication, compatibility filtering
and ranking**, not final recommendation totals. `cached` means at least one
provider retrieval was cached, not that the whole run or its AI explanations were.

Each `SearchItem` contains the actual `resource`, `id`, `searchId`, `resourceId`,
`relevanceScore`, `qualityScore`, `rankScore`, `ranking`, `sourceSnapshot` and
nullable `explanation`. No client-generated scores are submitted.

### Collection and detail

Collection query: `page`/`limit` as above; optional `category`, exact `provider`
matching `^[a-z_]{1,50}$`, `saved:"true"|"false"`, `minRelevance:0..100`,
`sort:"relevance"|"lastUpdated"`. The new workspace does not send `saved`.
Response: `{items:[{resource,recommendation?,saved}],pagination:{page,limit}}`.
The GET does **not** return a total; Prev/Next uses actual page length.

Resource fields used: `id`, `provider`, `externalId`, `url`, `name`, `description`,
`category`, nullable `license`, `language`, `sourceUpdatedAt`, `tags`,
`retrievedAt`, `qualitySignals`, `sourceMetadata`; optional/nullable
`sourceApiUrl`, `sourceCreatedAt`; optional returned `technical_metadata`,
`popularity_metrics`, `maintenance_signals`.
Null source metrics remain unknown, not zero. Exact zero metrics remain zero.
Current metadata from resource detail is not presented as the historical rank
snapshot. No security, production-readiness or maintenance approval is inferred.

### History

GET history query is strictly paginated: page 1–10000, limit 1–100 (UI 20).
Response: `{items:ResourceSearchHistory[],pagination:{page,limit}}`.

Each row supplies `id`, `projectId`, `query`, `createdAt`, `status`,
`explanationStatus`, `requirements`, `providerStatuses`, nullable `analysisId`,
nullable `queryPlan`, `partial`, `cached`, and `queries`.
Each query diagnostic supplies `id`, `searchId`, `providerId`, `adapterName`,
`query`, `parameters`, `status`, `count`, `durationMs`, `cached`, nullable
`error` and nullable `retryAfterSeconds`.

There is no final ranked-result count on a history row, and no endpoint or
`searchId` collection filter to retrieve its historical result set. Results are
persisted by the backend, but not exposed for historical reopening through this
API. The UI offers **Use query text**, not a fake historical-results view or an
exact-filter replay.

## 7. Search, filtering and freshness

No keystroke/debounced search endpoint is assumed. Categories/providers apply to
POST retrieval. Collection category/provider/minimum relevance and sort are
server GET filters, reset to page 1 when changed. The composite HF alias is
excluded from the collection's exact-provider filter. Invalid relevance input
leaves the last valid filter in effect and explains that state.

Backend ordering is retained, including when choosing source-update sorting.
The client neither substitutes a score nor promotes popularity to verification.
Generated hooks retain their existing refetch-on-mount/focus and finite-staleness
behavior; local successful writes invalidate all affected collection/history
pages. Clearing the form never deletes server results/history.

## 8. Verification executed

- OpenAPI regeneration and shared-library TypeScript build: passed.
- Frontend `tsc --noEmit`: passed.
- Frontend regression coverage: 79 test cases across five files. The 54 existing
  analysis/discovery/evidence/experiment tests passed in the full pass. One
  initial resource assertion incorrectly expected Retry on the existing 404
  screen; it now expects Project not found, and the focused access checks passed.
  The final resource suite passed 25/25, including a session-event guard added
  after browser review: 79 passing cases across the existing and final runs.
- The new resource cases cover actual fields/backend order, zero/unknown
  metadata, strict category/provider payloads, GitHub/model/dataset/API selection,
  validation, automatic mode, duplicate/remount locking, success navigation,
  partial/failed/empty searches, current detail and safe links, history/query
  reuse, server filters, bounded collection/history pagination, private-cache
  lifetime, detail errors, fail-closed access and narrowly scoped session events.
- Production build passed with `PORT=21178 BASE_PATH=/`; 2265 modules. Existing
  non-fatal UI source-map notices and the >500KB bundle advisory remain.
- Managed frontend workflow restarted cleanly; no new startup failure.
- `git diff --check`: passed.
- Live health endpoint: HTTP 200, database connected.
- Live private projects endpoint: HTTP 503, `AUTH_NOT_READY`.
- Clerk management check: `not_configured`.
- Non-intercepted preview screenshot showed the correct blocked private-project
  screen, not fabricated resources.
- Five public adapter smoke checks succeeded as detailed in section 3.
- One fixture-backed desktop/tablet/mobile browser journey passed: exact trimmed
  search body, one POST per attempt, backend card order, provider diagnostics,
  current detail versus snapshot, actual safe link attributes, history query-text
  reuse without a POST, and one forced provider failure preserving prior results.
  Exactly two POSTs, no save calls and no unexpected API paths were observed.
- Layout checked at 1280×900, 768×1024 and 390×844 with reduced motion. No
  page-level mobile horizontal overflow; the project tabs scroll within their own
  strip. The detail sheet scrolls internally. Some deeply nested raw metadata
  wraps tightly on narrow screens but remains visible.
- The browser pass caught one React render-phase subscription warning when the
  collection remounted. Resource draft subscriptions are now restricted to
  updates/removal of their own session cache key, ignoring unrelated query
  additions/observer events during render. The event guard and affected search
  flows are covered by the final targeted tests; no second browser pass is claimed.

The managed `backend-check` workflow retains an earlier failed state; this phase
does not claim it is green or rerun/modify the unchanged backend.

## 9. Provider and live-testing limitations

Provider availability, quotas, upstream failures, cache and compatibility filtering
are backend-owned. Languages/topics/tasks are provider-specific, not universal
capabilities. A matching provider/category selection can legitimately retrieve no
resources, or return resources that ranking excludes.

Kaggle is disabled in the current environment. Selecting it cannot supply missing
server credentials. No provider credentials are requested, displayed or stored
by this frontend.

Live project search, stored history after reload, real ownership isolation and AI
planning/explanation were **not** verified end to end: configured sign-in is still
missing. Authentication was not bypassed or replaced by fixtures in product code.
Synthetic test data exists only in test fixtures/browser interception.

## 10. Remaining bugs and scope

No known blocking feature defect was found by the completed checks. The browser's
subscription warning was addressed as described above; narrow nested metadata can
still wrap awkwardly on small screens. Current auth readiness and Kaggle
configuration are live-environment limitations, not mocked success states.
Historical result reopening requires a future backend read capability; the UI
does not invent one. Historical final counts are similarly unavailable.

Saved-resource/library workflows and advanced recommendation management remain
separate phases; no such endpoint or new management UI was invented here.

## 11. Manual test instructions

1. Configure the existing Clerk integration, sign in as a project owner and open
   that project's **Resource Intelligence** tab. Without auth readiness, expect
   the existing safe `AUTH_NOT_READY` screen.
2. Enter a short natural-language query. Leave explanations off for an AI-free
   typed search. Review category descriptions and provider coverage before using
   advanced selection; do not assume all sources support all filters.
3. Search repositories with GitHub; models with HF models; datasets with HF
   datasets/UCI; APIs with APIs.guru or the technical catalog. These are distinct
   real searches and can legitimately yield different/empty results.
4. Check provider status/error/disabled information. Counts are retrieval counts,
   not a final ranking total. Partial results must remain usable.
5. Open a result; compare current source facts with the recorded rank snapshot
   and any AI explanation. Open the actual external URL in its new tab. Treat
   rank/popularity as discovery signals, not validation or license/security approval.
6. Filter the latest completed collection, change backend sort and use Prev/Next.
   Inputs outside relevance 0–100 must not submit an invalid GET filter.
7. Open History, expand a run and inspect its real timestamp/provider diagnostics.
   **Use query text** must only populate the form. Running it requires a new
   explicit submit, which creates a new search; earlier filters are not restored.
8. When a provider-unavailable request is recorded, inspect its failed history
   row and verify the previous successful collection is still clearly identified.
   Network/auth/validation failures before persistence may have no history row.
9. Clear the form; verify results/history were not deleted. Navigate away/back
   to check session draft behavior. Sign out/change account to check private
   client teardown once configured.
10. Check desktop, tablet and mobile controls, long metadata, scrollable detail,
    safe links and reduced-motion preference. Do not seed or alter real customer
    data just to exercise an empty/error state.
