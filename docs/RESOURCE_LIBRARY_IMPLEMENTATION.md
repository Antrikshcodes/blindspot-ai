# Saved Resources and Project Resource Library

## 1. Features implemented

- Dedicated, project-owned `/projects/:id/library` page and project navigation.
- Save discovered resources from collection cards or fetched resource details.
- Actual saved badges, saved dates and the backend's three project statuses.
- Confirmed project-only removal, explicit retries and visible failures.
- Search, language, status and saved-date refinements explicitly scoped to the loaded page.
- Server-side category/provider filters and the backend's existing relevance/source-update ordering.
- Optional category/provider grouping derived only from records on that page.
- Current source metadata, useful technical fields and safe external links; missing metrics are not presented as zero.
- Loading, initial empty, filtered empty, later-page empty and error states.
- Forest/sand panels, restrained hierarchy, existing Motion fade/stagger helpers, animated toast feedback, accessible dialogs and reduced-motion support.
- Compatibility redirect from `/projects/:id/resources?collection=saved`.
- Existing resource-search results/history and search-time/current metadata distinctions remain in place.

Saving is an evaluation/bookmark decision, not evidence of product-market fit, a security endorsement or a new AI recommendation.

## 2. API endpoints connected

All calls use the existing generated API client and shared request handling:

| Method and route | Purpose |
| --- | --- |
| `GET /api/projects/:id` | Existing project ownership/read guard |
| `GET /api/projects/:id/resources` | Existing discovery collection, including actual `saved` associations |
| `GET /api/projects/:id/resources/saved` | Dedicated, bounded saved-resource collection |
| `GET /api/resources/:resourceId` | Current resource metadata for the detail sheet |
| `POST /api/resources/:resourceId/save` | Create/upsert this project's saved association or supported status |
| `DELETE /api/projects/:id/resources/:resourceId/save` | Remove only the chosen project's saved association |

The alternative existing `DELETE /api/resources/:id/save` route was audited but is not used. Its body requires `projectId`; the selected route makes the project explicit in the URL and has no DELETE body.

No new backend endpoint, provider credential, auth bypass or database migration was introduced.

## 3. Components created

- `ResourceLibrary`: server collection, bounded pagination, filters, grouping and state handling.
- `LibraryCard`: real resource metadata, actual saved association and detail/source actions.
- `ResourceSaveControls`: shared card/detail save, status, errors and confirmed removal.
- `ResourceLibraryPage`: existing `ProjectFrame` ownership/read guard.
- `useResourceSaving`: project/resource-scoped mutation lock, accepted-association receipts, cache reconciliation and feedback.
- Page-filter/group helpers in `lib/resource-library.ts`.

The existing `ResourceDetail` is reused. Opening a library item supplies resource and saved association only; aggregate collection scores are never converted into invented per-search recommendations, snapshots or AI explanations.

## 4. Files created and modified

### New

- `artifacts/blindspot-web/src/components/resource-library/index.tsx`
- `artifacts/blindspot-web/src/components/resource-library/save-controls.tsx`
- `artifacts/blindspot-web/src/hooks/use-resource-saving.ts`
- `artifacts/blindspot-web/src/lib/resource-library.ts`
- `artifacts/blindspot-web/src/pages/resource-library.tsx`
- `artifacts/blindspot-web/src/pages/resource-library.test.tsx`
- `artifacts/blindspot-web/src/test/library-fixture.ts`
- This report.

### Modified

- `src/App.tsx` and `src/components/project-frame.tsx`: route and navigation.
- `src/pages/resources.tsx`: discovery entry plus legacy saved-route redirect; obsolete legacy collection/save UI replaced by the dedicated library.
- `src/components/resource-search/{collection,detail,workspace}.tsx`: project-aware shared controls and actual membership passed to details.
- `scripts/blindspot-contract.mjs` and `lib/api-spec/openapi.yaml`: existing dedicated saved-list contract, exact list-item shape and removal response.
- Regenerated `lib/api-client-react/src/generated/*` and `lib/api-zod/src/generated/*`; unrelated existing contract fields preserved.

Frontend paths above are relative to `artifacts/blindspot-web` unless fully qualified. Existing backend implementation and unrelated `.replit` changes were not edited for this feature.

## 5. Exact backend schemas used

```ts
type SavedResource = {
  id: string;
  projectId: string;
  resourceId: string;
  status: string;       // Current backend enum: CONSIDERING | TRYING | INTEGRATED.
  createdAt: string;    // Returned association timestamp, not a frontend-generated date.
  updatedAt: string;
};

type SavedResourceListItem = {
  resource: Resource;
  saved: SavedResource;
  relevanceScore: number | null;
  rankScore: number | null;
};

type SavedResourceListResponse = {
  success: boolean;
  data: {
    items: SavedResourceListItem[];
    pagination: { page: number; limit: number }; // No total.
  };
};

type SaveBody = {
  projectId: string;    // UUID; ownership checked by the existing backend.
  status?: 'CONSIDERING' | 'TRYING' | 'INTEGRATED';
};

type SaveResponse = { success: boolean; data: SavedResource };
type RemoveResponse = { success: boolean; data: { removedFromSaved: boolean } };
```

`Resource` uses the existing backend DTO: `id`, `provider`, `externalId`, `category`, `url`, `name`, `description`, nullable `license`, `language` and `sourceUpdatedAt`, plus `retrievedAt`, `tags`, `qualitySignals` and `sourceMetadata`. Source metrics/technical fields are shown only when returned. Resource detail returns this DTO, not a project's saved association.

Categories are `GITHUB_REPOSITORY`, `DATASET`, `AI_MODEL`, `API`, `DOCUMENTATION`, `OPEN_SOURCE_TOOL`, `LEARNING_RESOURCE`.

GET provider filters use concrete codes: `github`, `huggingface_models`, `huggingface_datasets`, `kaggle`, `uci`, `apis_guru`, `technical`. The combined `huggingface` search alias is not offered as an exact GET filter.

The backend save table has a unique `(projectId, resourceId)` pair, foreign keys to project/resource, and association status/timestamps. There are no folders, custom collections, private notes or user-defined tags in this contract.

## 6. Save and remove behavior

1. Save sends only the existing resource ID in the path and `projectId` in the body. It never creates a resource record.
2. Already-saved records do not expose another Save submission. The hook rechecks current actual membership, and concurrent/remounted controls share the same project/resource request lock.
3. No fake optimistic saved row is created. A successful POST returns the real association; an explicit status update uses the same upsert, retaining original ID/creation date.
4. Both discovery and saved-library caches are reconciled at hook-level callbacks, including after the originating component unmounts. Private accepted-write receipts follow the `QueryClient` lifetime rather than browser storage.
5. Pending earlier collection reads are cancelled before an accepted write is applied. Cache patches retain each page's actual read timestamp, so changing one resource cannot make another stale association look newly read.
6. Accepted removal drops the row from cached saved pages and clears discovery membership. It does not guess where a newly saved row belongs in filtered/sorted pagination; the backend refetch determines that.
7. Removal requires a dialog, identifies the association-only effect, and does not call DELETE on Cancel. Repeated pending submissions are disabled. Failure leaves the association visible and the dialog available for explicit retry.
8. A removal response without `removedFromSaved: true` is not treated as confirmed deletion.
9. Read caches are invalidated after success **or error**, allowing a fresh GET to reconcile a write whose network response was lost. Mutations never automatically retry.
10. External links permit HTTP/HTTPS only, reject embedded credentials/unsafe protocols, and open with `noopener noreferrer`. Private resource data is not written to local/session storage.
11. Delayed write callbacks retain the originating private-cache scope. Ordinary navigation/remounts still reconcile accepted writes, but clearing/replacing that scope prevents a late response from recreating old private data or launching old-project refreshes.

The backend separately verifies project ownership and that a saved resource was retrieved for the target project. The selected DELETE removes only rows matching both project and resource IDs; shared resources and other projects' saves remain intact.

## 7. Tests executed and results

- OpenAPI regeneration and library TypeScript project build: passed.
- Frontend `tsc --noEmit`: passed.
- Existing frontend regression files: **79 tests passed**, unchanged by this feature.
- New library regression file: **23 tests passed**, including a delayed-write/private-cache-clear safeguard.
- Full frontend suite: **102 tests passed across six files** (79 existing plus 23 library cases).
- Production Vite build: passed, 2,270 modules; existing non-fatal UI sourcemap notices and large-chunk advisory remain.
- `git diff --check`: passed.
- Managed frontend workflow restarted and served cleanly.
- Read-only real `/api/health`: HTTP 200, database connected.
- Read-only real `/api/projects?limit=1`: HTTP 503 `AUTH_NOT_READY`.
- Fresh preview of the real Library route: existing guarded project error displayed; no private records bypassed or fake production library displayed.

The new cases cover bounded reads, real IDs/payloads, save/no-op/status, cancel/confirm removal, retained shared/other-project fixture records, failed/unconfirmed removal, explicit retry, duplicate pending saves/removals, remount locks, lost-response reconciliation, late responses after private-cache clearing, detail-to-library state, re-saving, fresh private client reads, local/server filtering, pagination, empty/error views, project separation, legacy routing, 401/404/503 guards, stale-page timestamps and cache-event isolation.

**Isolated browser journey: passed**, using test-only API interception. Saving an existing ID, blocked duplicate submission/no optimistic Saved badge, server category filtering, status upsert, current detail metadata, safe external-link attributes, cancellation, injected removal failure/explicit retry, detail-to-library removal, re-saving and fresh-page reads behaved correctly. Desktop, 390×844 mobile and 768×900 tablet were checked; no mobile/tablet document overflow or React render warnings were observed. The only reported HTTP 500 was the deliberately injected removal failure.

The browser's main fixture retained all four underlying resource records and recorded no global-resource create/delete calls. Preservation of another project's save was exercised by the unit fixture, not independently by the browser fixture. External-link attributes were checked without visiting the external site. Reduced-motion notices were environmental.

Synthetic unit/browser fixtures are not imported by production screens. These checks demonstrate UI/contract behavior, **not live authenticated ownership or database persistence**. The real, unintercepted route remained safely blocked by `AUTH_NOT_READY`.

## 8. Remaining limitations

- Clerk management status is `not_configured`; real authenticated project/library persistence and cross-user backend isolation cannot currently be exercised. Existing sign-in work is separate. No authentication or database policy was weakened to make tests pass.
- Category/provider/order are server-side. Text, language, status and saved-date filters apply only to the current loaded page and are labeled accordingly. No unbounded scan, project-wide count or all-project text-search claim is made.
- Page size is 20. Without a total, Next is based on a full page and may lead to an honestly empty next page.
- Saved-list relevance/rank are backend aggregates, not new recommendation intelligence; advanced recommendation ranking is not implemented.
- Existing `backend-check` workflow failure is unrelated and was not resolved or represented as passing.
- No backend folder/note/custom-collection capability exists; none was simulated.

## 9. Backend changes required

**None for this library feature.** Existing routes, unique association constraint, ownership checks and statuses support it. Only the shared OpenAPI description/client types were brought into alignment with the already implemented saved-list and DELETE response.

Real sign-in configuration is required to verify/use private project routes in this environment. That prerequisite is not a new Library database/schema change.

## 10. Instructions to test the library

After the existing secure sign-in work is configured:

1. Sign in and open a project you own.
2. Open Resource Intelligence and run an actual provider search. Open an existing result and verify its source URL/current metadata.
3. Click Save on that result. Expect a confirmed Saved state and one project association; clicking its saved state must not create another write.
4. Open the project's Resource Library. Confirm the saved resource appears with the returned saved date/status.
5. Try server category/provider/order controls and separately the clearly labeled page-only search/language/status/date refinements. Clear filters and check grouping/count scope.
6. Change a saved status, reload and confirm it remains. Close/reopen details and compare the same state.
7. Open Remove, cancel once, then confirm. Expect the saved row to disappear and discovery/detail controls to offer Save again. The external resource remains accessible.
8. If the same resource is saved in another owned project, verify that association was not removed. Also test a different signed-in owner cannot read/mutate the first owner's project via either saved route.
9. Re-save the existing resource, hard reload and confirm the association is returned by the backend, not browser-only state.
10. Check 390px mobile, tablet and desktop; verify long metadata, filter layout, detail sheet, keyboard focus, confirmation and reduced-motion behavior.

Reproducible local checks:

```sh
pnpm --filter @workspace/blindspot-web exec vitest run
pnpm --filter @workspace/blindspot-web exec tsc --noEmit
PORT=21178 BASE_PATH=/ pnpm --filter @workspace/blindspot-web run build
```
