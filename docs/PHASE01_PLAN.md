# Phase 01 — Audit and implementation plan

## Verified baseline

- `main` is documentation-only. `develop` has shared TypeScript contracts.
- The backend-foundation branch now includes the merged Library prototype.
- Existing runtime: Express 4 / TypeScript, Prisma / SQLite, health endpoints,
  curated per-project Library records, validation middleware, and isolated tests.
- Frontend and assets remain documentation/placeholders. This phase adds no UI.
- Older architecture and roadmap documents describe targets, not current behavior.
- No live user SQLite data is present in this checkout. No existing database will
  be deleted, overwritten, or silently converted.

## Approved stack transition

The Phase 01 brief explicitly requests PostgreSQL and Drizzle, superseding the
earlier Prisma/SQLite preservation decision for the active backend.
Keep legacy source, schema and tests intact. Add the active backend under
`backend/src/phase01`, with separate build/test/dev entry points. Use the
`blindspot_phase01` PostgreSQL schema so legacy tables are unaffected.
There is no automatic import of old SQLite records; data migration needs a
separately reviewed mapping and backup if real records exist elsewhere.

## Implementation sequence

1. Establish runtime Zod contracts and relational Drizzle tables with versioned SQL migrations.
2. Implement project CRUD, versioned analyses/assumptions, interviews, feedback evidence,
   and experiment tracking. AI output never changes an assumption into a verified finding.
3. Add replaceable LLM providers and schema-validated structured outputs.
4. Add provider adapters for GitHub, Hugging Face models/datasets, Kaggle,
   UCI catalog discovery and verified curated API/documentation resources.
5. Normalize, validate, deduplicate, cache and transparently rank real provider results.
   Keep source metadata separate from optional AI explanations.
6. Add request/AI limits, bounded external retries/timeouts, safe errors and structured logging.
7. Test with isolated PostgreSQL-compatible storage and mocked external APIs/LLMs;
   run development migrations and verify health through the running service.
8. Update documentation with the actual endpoints, table relationships, provider
   limitations and unresolved work. Push a review branch; never auto-merge.

## Prototype security boundary

Authentication is intentionally deferred, not simulated with caller-supplied IDs.
All non-health routes fail closed in production until real authorization is added.
Development/test routes are a single-team prototype and must not be exposed publicly.
