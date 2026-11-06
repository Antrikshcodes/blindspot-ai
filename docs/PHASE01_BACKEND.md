# Phase 01 backend — delivery report

## Architecture summary

Modular monolith: Express routes → strict Zod contracts → validation/resource
services → Drizzle/PostgreSQL. Replaceable structured-output LLM adapters and
official/public provider adapters sit behind interfaces. No frontend changes.

The active PostgreSQL schema is isolated from retained Prisma/SQLite source.
No data was deleted or silently imported. Generated hypotheses start UNTESTED;
evidence-backed outcome changes require an explicit reviewed API request.
No experiment, AI interpretation or recommendation is a verified market finding.

### Authenticated owner boundary

The active Phase 01 API now uses Replit-managed Clerk sessions. A request-local
owner comes only from the verified provider subject, never a caller ID or custom
userId claim. Owner-filtered project queries and owner-aware analysis/validation
services protect project descendants, including direct child-ID access. Resource
search/list/history/save paths verify project ownership before work; direct
resource details require retrieval through an owned project.

The additive ownership migration preserves existing projects with a NULL owner,
making them inaccessible to every account. No automated claiming, data deletion,
import, or ownership transfer is provided. New records receive their owner from
the verified session. Project inputs cannot edit it.

The fail-closed boundary remains `503 AUTH_NOT_READY` when provider configuration
is missing, in all environments. Configured instances return 401 for missing or
invalid sessions and 404 for missing/foreign data. Production authenticated access
is covered by positive and cross-account tests using locally signed ephemeral
session JWTs through the actual Clerk verification middleware (not mocked auth).
Tests also cover cookie sessions and cross-site write rejection; provider/AI
adapters remain fixtures. This is not a hosted sign-in/browser verification or a
claim of a public production release.

Clerk keys are automatically provisioned by Replit. The provider proxy is mounted
before JSON parsing at `/api/__clerk`. Apply the checked-in migration explicitly
in development and use the managed production schema release flow later. Startup
performs no DDL. The existing web client still needs its separate Clerk sign-in
and account-switch cache integration; it now receives 401 while unsigned.

Documentation:
[API](API_DOCUMENTATION.md#implemented-phase-01-api) ·
[Database/table relationships](DATABASE_SCHEMA.md) ·
[Resource providers/ranking](RESOURCE_INTELLIGENCE.md) ·
[AI engine](AI_ENGINE.md) ·
[Setup](DEVELOPMENT_SETUP.md#phase-01-setup) ·
[Remaining work](ROADMAP.md#phase-01-status).

## Verification performed

- Active TypeScript build passed.
- Retained legacy TypeScript source build passed.
- **43 Phase 01 tests passed**, with isolated PostgreSQL-compatible PGlite,
  checked-in migrations, mocked providers and mocked AI.
- **28 retained SQLite tests passed**, against a private temporary database.
- Development PostgreSQL migrations applied successfully, including the long-quote
  deduplication-index fix.
- Running service `GET /api/health` returned database-connected OK.
- Real public-source smoke: GitHub returned 5 records, HF models 4, HF datasets 4;
  the pipeline returned 8 ranked source-backed candidates. UCI successfully returned
  zero matching records; optional Kaggle was disabled.
- One real AI idea analysis returned four UNTESTED assumptions.
- Temporary live-verification project removed.
- CI now installs dependencies and runs active/legacy tests and builds on main,
  develop and feature branches. Local verification is not a claim that a future
  GitHub-hosted CI run has already passed.
- Registry-resolution URLs were omitted from the lockfile while retaining versions
  and integrity hashes, so teammate/GitHub installs do not depend on Replit's
  internal package-registry hostname. No registry/firewall bypass was used.

## Required/optional configuration

Required to serve: PostgreSQL `DATABASE_URL`. PORT/NODE_ENV have defaults.
Private routes also require `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`;
Replit provisions them, with isolated development and production user stores.
AI_PROVIDER selects replit/openai/disabled. Replit-managed AI requires no user key;
external compatible AI requires AI_API_KEY and model configuration.
Optional: GITHUB_TOKEN, HUGGINGFACE_TOKEN, KAGGLE_USERNAME/KAGGLE_KEY.
Kaggle is explicitly disabled unless enabled. CACHE_TTL and rate/time limits are
configurable. See the placeholder-only backend environment template.

## Honest remaining gaps

- No public production release or web sign-in integration in this backend-only
  delivery. Owner authorization is implemented; ownerless historical data
  remains quarantined, with no claim/recovery UI.
- Small reviewed technical-resource catalog; literal source searches and heuristic
  ranking, not comprehensive web search or benchmarked semantic retrieval.
- Unknown metadata stays null/UNKNOWN; license compatibility and security are not
  verified. Estimated AI difficulty is separate from observed source metadata.
- Kaggle credentialed access was not live-tested. Provider responses/rate limits
  may change.
- Process-local cache, quotas and concurrency; no distributed jobs or background refresh.
- AI has structured/citation checks but can still misinterpret real evidence.
- Legacy shared interfaces need deliberate client-contract integration later.
- Four moderate dev-tool transitive esbuild findings remain; no high/critical
  package-audit findings after safe updates. Not an application security audit.
- No automatic import of any teammates' SQLite data.

## Updated repository tree

Dependencies, build output, temporary databases and `.git` omitted.
Older source/docs are retained and labeled rather than deleted.

```text
blindspot-ai/
├── .env.example
├── .gitignore
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/ci.yml
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── SECURITY.md
├── API_CONTRACT.md                  # historical, links to current API
├── BACKEND_AUDIT.md
├── BACKEND_PROGRESS.md
├── DATABASE_SCHEMA.md               # historical, links to current schema
├── assets/
│   ├── branding/.gitkeep
│   ├── diagrams/.gitkeep
│   └── screenshots/.gitkeep
├── backend/
│   ├── .env.example
│   ├── README.md
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.phase01.json
│   ├── drizzle.config.ts
│   ├── prisma/schema.prisma         # retained legacy schema
│   ├── scripts/
│   │   ├── smoke-phase01.mjs
│   │   └── test.mjs                 # retained isolated SQLite runner
│   ├── src/
│   │   ├── app.ts                  # retained legacy entry
│   │   ├── server.ts               # retained legacy entry
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── logger.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   ├── requestLogger.ts
│   │   │   └── validateRequest.ts
│   │   ├── modules/
│   │   │   ├── health/
│   │   │   │   ├── health.controller.ts
│   │   │   │   └── health.routes.ts
│   │   │   └── library/
│   │   │       ├── library.routes.ts
│   │   │       ├── library.schemas.ts
│   │   │       ├── library.service.ts
│   │   │       └── library.url.ts
│   │   ├── utils/response.ts
│   │   └── phase01/                # active implementation
│   │       ├── app.ts
│   │       ├── server.ts
│   │       ├── config.ts
│   │       ├── contracts.ts
│   │       ├── ai/provider.ts
│   │       ├── db/
│   │       │   ├── client.ts
│   │       │   ├── schema.ts
│   │       │   ├── migrate.ts
│   │       │   └── migrations/
│   │       │       ├── 0000_tense_captain_universe.sql
│   │       │       ├── 0001_cool_psylocke.sql
│   │       │       └── meta/
│   │       │           ├── 0000_snapshot.json
│   │       │           ├── 0001_snapshot.json
│   │       │           └── _journal.json
│   │       ├── validation/service.ts
│   │       └── resource-intelligence/
│   │           ├── types.ts
│   │           ├── http.ts
│   │           ├── providers.ts
│   │           ├── normalize.ts
│   │           ├── ranking.ts
│   │           ├── cache.ts
│   │           └── search.service.ts
│   └── tests/
│       ├── database.test.ts
│       ├── error.test.ts
│       ├── health.test.ts
│       ├── library.test.ts
│       └── phase01/
│           ├── api.test.ts
│           ├── config.test.ts
│           ├── fixtures.ts
│           └── resources.test.ts
├── docs/
│   ├── AI_ENGINE.md
│   ├── API_DOCUMENTATION.md
│   ├── ARCHITECTURE.md
│   ├── DAILY_PROGRESS.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEVELOPMENT_SETUP.md
│   ├── FEATURE_ROADMAP.md
│   ├── KNOWN_ISSUES.md
│   ├── LIBRARY_API.md
│   ├── PHASE01_BACKEND.md
│   ├── PHASE01_PLAN.md
│   ├── PROJECT_CONTEXT.md
│   ├── PROJECT_OVERVIEW.md
│   ├── RESOURCE_INTELLIGENCE.md
│   └── ROADMAP.md
├── frontend/README.md               # no frontend built in this phase
├── shared/
│   ├── README.md
│   ├── index.ts
│   ├── constants/index.ts
│   └── types/index.ts
└── tests/README.md
```
