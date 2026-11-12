# Database schema — Phase 01

## Profile and project lifecycle additions

Migration `0007_user_profiles.sql` adds one `user_profiles` row per verified
Clerk subject, with editable display name and timestamps; role is not client
writable and is derived by the server from `ADMIN_USER_IDS`. Migration
`0008_project_catalog_and_archive.sql` adds industry, category, user-declared
technical requirements, and `ACTIVE`/`ARCHIVED` status to projects, with
owner/status indexing. Existing projects receive non-destructive defaults.

## Phase 03 additions

Added resource_providers and resource_search_queries; extended resource_searches
with linked analysis/query plan, completion/partial/cache/explanation status and
resources with source API/creation timestamps. Added provider/external-identity,
update-date and query-history indexes. Existing recommendation/source snapshots,
saves and canonical URL identity remain.
Migration: `0003_safe_squirrel_girl.sql`. No destructive deduplication or database
replacement. [Storage and trust details](PHASE03_RESOURCE_INTELLIGENCE.md).

## Phase 02 additions

An additive migration extends the assumption enum and adds:
`analyses.version`, `engineVersion`, `additionalContext`, `providerMetadata`;
`assumptions.title`, `targetAudience`, `suggestedInterviewQuestion`,
`scoreExplanation`. Complete analysis artifacts live in justified versioned JSONB,
with the existing relational assumption/evidence relationships preserved.

Historical analyses are numbered before a unique project/version index is
created. New version allocation uses a project row lock in a short transaction.
No existing JSON/snapshot/risk labels are overwritten. No new database namespace
or automatic SQLite migration was introduced.
See [Phase 02 schema and history notes](PHASE02_AI_ENGINE.md).

**Active:** PostgreSQL + Drizzle, schema namespace `blindspot_phase01`.
Source: `backend/src/phase01/db/schema.ts`.
Versioned SQL and Drizzle snapshots: `backend/src/phase01/db/migrations/`.

Legacy Prisma/SQLite definitions remain in `backend/prisma/`; they are not the
active persistence layer. No SQLite data has been deleted or silently imported.

## Tables and relationships

| Table | Purpose / relationships |
| --- | --- |
| projects | Owner, product/problem/audience/solution, alternatives, industry/category, technical requirements, ACTIVE/ARCHIVED status and timestamps |
| analyses | Many per project; project-input snapshot, market context, structured output, model provenance |
| assumptions | Many per analysis; category, independent 1–5 impact/uncertainty, computed risk, explanation/evidence/validation method, status |
| interview_sessions | Many per project; participant alias, generated mapped questions |
| interview_feedback | Many per session; original notes, never overwritten by AI |
| evidence_records | Feedback-to-assumption quote links with sentiment, reasoning and origin; one feedback record can relate to many assumptions |
| assumption_evidence | Records explicit evidence IDs cited when a person requests an outcome status |
| feedback_analyses | Versioned project-level themes/contradictions/gaps with exact source references |
| experiments | Many per project, each references an assumption; rationale, method, evidence to collect, success criteria, status/result |
| resource_searches | Many per project; query, extracted requirements, provider statuses and creation time |
| resources | Globally reusable real source records, unique canonical URL, provider metadata and retrieval time |
| resource_recommendations | Many per search; a source may recur in many projects/searches; separate ranking/explanation/source snapshot |
| saved_resources | Unique project/resource pair with saved integration status |
| user_profiles | One row per verified owner subject; optional display name; server config supplies role |

## Constraints and lifecycle

- UUID primary keys, foreign keys, query indexes and cascading project-owned deletion.
- Assumption category/status, evidence sentiment, resource category, experiment status
  and saved status are PostgreSQL enums.
- Risk score has a database check: impact/uncertainty 1–5 and riskScore equals
  impact × uncertainty. Relevance score is constrained to 0–100.
- Recommendations are unique by search/resource; saves by project/resource.
- Evidence deduplication: feedback/assumption/quote/sentiment.
- Project deletion removes that project's analyses, assumptions, sessions, notes,
  evidence, experiments, searches, recommendations and saves. Global source records
  remain, so deleting one project cannot remove another project's source.
- Project/source relationship checks and evidence-gated transitions are enforced
  by the service layer. Direct SQL writers must maintain the same invariants.
- A terminal assumption outcome is a person's evidence-backed judgment, not a
  claim of conclusive scientific verification. Raw SQL is not an authorized API.

## Deliberate JSONB usage

Stable relationships are relational, not JSON blobs. JSONB is limited to variable
structured analysis output and project snapshots; generated questions; versioned
feedback summaries; heterogeneous provider quality/source metadata; provider status
reports; ranking breakdowns; generated explanations; and immutable source snapshots.
Alternatives, requirements and tags use PostgreSQL text arrays.

No credentials or tokens are stored in tables. Participant aliases and interview
notes may still be sensitive: use non-identifying aliases during prototype work.

## Migrations and verification

```sh
cd backend
npm run db:generate    # only after intentional Drizzle schema edits
npm run db:migrate     # explicit development operation; refuses NODE_ENV=production
```

Migration journal is separate in `blindspot_phase01_migrations`. There is no
startup DDL and no production migration hook.
For Replit-managed production, schema promotion belongs to the supported Publish
flow, not this development script. An external PostgreSQL production database
would need a separately approved release procedure.

Tests apply the real checked-in SQL to isolated PGlite PostgreSQL instances. They
do not use the developer's DATABASE_URL. The development PostgreSQL migration and
live health check were also verified. A reviewed SQLite import/backfill is not
part of this phase.
