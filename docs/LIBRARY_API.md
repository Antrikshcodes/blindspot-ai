# Personalized Resource Library — Backend Foundation

Related proposal: [Resource Library](https://github.com/Antrikshcodes/blindspot-ai/issues/2).

## Scope and current limitations

This change implements the **data model and prototype API**, not the Library UI
or automatic recommendations. It preserves the existing Express / Prisma / SQLite
backend rather than replacing the application's storage or architecture.

- Add manually curated GitHub repository and dataset resources to an existing idea/project.
- List, filter, and paginate that project's resources.
- Save resources, change their saved status, and remove them from the saved collection.
- Normalize source links and prevent duplicates within an idea.
- Keep unknown metadata null instead of inventing licenses, permissions, or pricing.

**Not implemented:** provider retrieval, live link/existence checks, AI ranking,
automatic refresh, frontend screens, project creation APIs, authentication, or
production owner authorization. No example resources are inserted automatically.

### Security boundary

The upstream backend has no authenticated identity or project ownership middleware.
Consequently **all Library routes return 503 in production**. In development/test,
only projects with no owner (`userId = null`) are accessible; owned projects return
401. Project-scoped queries prevent accidentally modifying another project's
resource, but **this is not authentication**. Do not expose this prototype publicly
with `NODE_ENV=development`.

Before production release, integrate the application's actual identity provider,
authorize every project operation against the authenticated owner, add rate limits,
and replace the fail-closed production guard only when those checks are tested.
Caller-supplied identity headers are not trusted.

## Storage

`LibraryResource` belongs to `Project` with cascading deletion.

| Fields | Meaning |
| --- | --- |
| `id`, `projectId` | Server-generated resource ID and parent idea/project |
| `category` | `GITHUB_REPOSITORY` or `DATASET` |
| `sourceUrl` | Normalized HTTPS source URL; unique within a project |
| `name`, `description` | Curated resource metadata |
| `license`, `usageNotes` | Nullable, unverified metadata; null means unknown |
| `metadataProvenance` | Server-owned `CURATED_UNVERIFIED` for this phase |
| `relevanceExplanation`, `useCase` | Why it belongs to this idea and what it helps test/build |
| `integrationDifficulty` | Estimated `EASY`, `MODERATE`, `ADVANCED`, or `UNKNOWN` |
| `limitations` | Nullable caveats |
| `savedAt`, `savedStatus` | Both null until saved; status is `CONSIDERING`, `TRYING`, or `INTEGRATED` |
| `createdAt`, `updatedAt` | Server timestamps serialized as ISO strings |

There is deliberately no fabricated `verifiedAt` / `lastCheckedAt`. The created
timestamp is not evidence that a provider was checked. Provider-sourced metadata
and retrieval timestamps should be added when actual retrieval is implemented.

Resource category and saved-state values are validated with Zod at the API boundary.
Prisma uses strings for SQLite compatibility, so direct database writers must maintain
the same invariants. Source metadata and per-idea relevance are separate fields, not
a claim of objective relevance or safe integration.

## Source links

- Repositories: `https://github.com/<owner>/<repo>`; normalized to lowercase;
  trailing slash, `.git`, query strings, and fragments are removed.
- Datasets: Hugging Face dataset IDs, Kaggle dataset pages, and data.gov catalog
  dataset pages. Dataset path case is preserved. Query strings/fragments are removed.
- No HTTP, credentials, custom ports, arbitrary domains, or repository subpages.
- The server does not fetch user-supplied URLs. Syntax validation does **not**
  establish existence, maintenance, license validity, or security.

The dataset allowlist is an initial boundary, not a finalized provider integration.
It can be expanded with corresponding normalization tests.

## Endpoints

Default base: `/api/v1/projects/:projectId/library`.
All operations use the existing `{ success, data, timestamp }` /
`{ success: false, error, timestamp }` envelopes and `Cache-Control: no-store`.
Example IDs and names below are placeholders, not verified recommendations.

### GET `/`

Query parameters:

| Parameter | Allowed values / default |
| --- | --- |
| `category` | Optional `GITHUB_REPOSITORY` or `DATASET` |
| `saved` | Optional literal `true` / `false` |
| `status` | Optional saved state; implies saved resources only |
| `page` | Positive integer, default 1, maximum 10000 |
| `limit` | Positive integer, default 20, maximum 100 |

Unknown parameters and `saved=false` combined with a status return 400.
Items are ordered by newest creation time, with ID as the stable tie-breaker.

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
  },
  "timestamp": "2026-11-06T00:00:00.000Z"
}
```

### POST `/resources`

Add a **curated, unverified** resource. Returns 201 with the resource.

```json
{
  "category": "GITHUB_REPOSITORY",
  "sourceUrl": "https://github.com/example/example-repo",
  "name": "Example resource",
  "description": "What the resource provides.",
  "relevanceExplanation": "Why it helps this specific idea.",
  "useCase": "The prototype or experiment it supports.",
  "integrationDifficulty": "UNKNOWN",
  "license": null,
  "usageNotes": null,
  "limitations": null
}
```

Required: category, sourceUrl, name, description, relevanceExplanation, useCase.
Optional nullable fields are license, usageNotes, and limitations.
Difficulty defaults to UNKNOWN. Strings are trimmed and bounded; blank required
strings are rejected. Optional text should be omitted or null, not an empty string.
Server-owned fields and all unknown body keys return 400.
A duplicate canonical URL within the same project returns 409.

### PUT `/resources/:resourceId/save`

Save a recommendation. Optional body: `{ "status": "CONSIDERING" }`.
An empty body defaults a newly saved resource to CONSIDERING.
Repeated saves preserve the original `savedAt`; if status is omitted, an existing
saved status is preserved. Returns 200 with the resource.

### PATCH `/resources/:resourceId/save`

Body: `{ "status": "TRYING" }` or another allowed saved status.
Only saved resources can be updated. Returns 200 with the resource, or 404 if
it is missing, belongs to another project, or has not been saved.

### DELETE `/resources/:resourceId/save`

Clears `savedAt` and `savedStatus`. Returns 200 with the resource.
Repeated removal is safe. **Does not delete the recommendation** from the Library
or from any other idea.

## Errors

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Invalid body/query/parameters or malformed JSON |
| 400 | `INVALID_RESOURCE_URL` | Source link not supported |
| 401 | `AUTHENTICATION_REQUIRED` | Owned project cannot be accessed by this prototype |
| 404 | `NOT_FOUND` | Project/resource absent or resource belongs to another project |
| 409 | `DUPLICATE_RESOURCE` | Canonical source already exists for this project |
| 413 | `PAYLOAD_TOO_LARGE` | Existing 1 MB request limit exceeded |
| 503 | `LIBRARY_AUTH_NOT_READY` | Production access blocked pending authentication |

## Development setup and verification

From `backend/`:

1. Install the checked-in dependencies with `npm ci`.
2. Configure a **local SQLite** DATABASE_URL using the backend environment template.
3. Run `npm run prisma:generate` then `npm run prisma:push` against that local database.
4. Run `npm run dev`. Use an existing ownerless development project ID; project CRUD
   is outside this change.
5. Run `npm test` and `npm run build`.

The backend foundation uses `prisma db push` and does not yet have a migration
baseline. This change does not introduce a misleading partial migration chain.
Establish a reviewed migration baseline before a production rollout; never run
development schema-push commands against production.

`npm test` generates the client, creates a temporary SQLite database, pushes the
schema, and runs all tests serially against that database, then removes it. It
overrides inherited DATABASE_URL for the test child processes, so a configured
developer or production database is never used by this command.
`npm run test:watch` remains a raw Vitest command; do not use it without a dedicated
test DATABASE_URL.

Tests cover source normalization/rejection, unknown metadata, duplicate handling,
category/saved filters, pagination, save/status/remove behavior, project scoping,
request validation, malformed JSON, owned-project refusal, and production blocking.

The test runner was updated because the original locked test dependency tree was
blocked by the package firewall. The lockfile is updated accordingly; no runtime
framework/ORM migration is part of this feature.

## Next phase

1. Add real authenticated project access.
2. Implement source-provider retrieval with timeouts, limits, provenance and failure handling.
3. Add idea-specific relevance ranking without sending full private ideas unnecessarily.
4. Build the Library UI against this contract, with unknown/unverified metadata visible.
5. Expand resource types only when their retrieval and licensing metadata are supported.
