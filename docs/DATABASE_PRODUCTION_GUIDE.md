# Blindspot AI — Database Production & Operations Guide

## 1. Schema & Isolation Architecture

Blindspot AI utilizes **PostgreSQL 15+** with explicit schema namespace segregation under `"blindspot_phase01"`. Migration metadata is isolated under `"blindspot_phase01_migrations"`.

### Managed Tables & Primary Keys

| Table Name | Description | Primary Key | Owner Scope |
| :--- | :--- | :--- | :--- |
| `projects` | Core startup idea workspace and intake context | UUID (`id`) | `owner_id` (Clerk User ID) |
| `analyses` | AI-generated risk scoring, clarity dimensions, and blindspots | UUID (`id`) | `owner_id` (Clerk User ID) |
| `assumptions` | Scored assumptions placed across 5x5 risk matrix | UUID (`id`) | Inherited via `project_id` |
| `interviews` | Customer discovery interview sessions and Mom Test probes | UUID (`id`) | Inherited via `project_id` |
| `feedback` | Verbatim customer feedback notes and extracted quotes | UUID (`id`) | Inherited via `interview_id` |
| `experiments` | Validation experiments and observed results | UUID (`id`) | Inherited via `project_id` |
| `resources` | Global catalog of GitHub repos, datasets, AI models, and APIs | UUID (`id`) | Shared global catalog |
| `project_resources` | Project-specific bookmarks, custom notes, and status | Composite (`project_id`, `resource_id`) | Inherited via `project_id` |
| `notifications` | In-app alerts, unread counts, and event triggers | UUID (`id`) | `recipient_id` (Clerk User ID) |
| `user_preferences` | Notification matrix (email/in-app) and UI density preferences | UUID (`id`) | `owner_id` (Unique Clerk User ID) |

---

## 2. Migration History & Release Protocol

All migrations are tracked sequentially in `backend/src/phase01/db/migrations/`:

- `0000_tense_captain_universe.sql`: Core schema, projects, analyses, assumptions, feedback.
- `0001_cool_psylocke.sql`: Severity level enum and risk index optimizations.
- `0002_fantastic_vance_astro.sql`: Analysis history, semantic versioning (`version` counter), and audit timestamps.
- `0003_safe_squirrel_girl.sql`: Phase 03 Resource Intelligence catalog, multi-provider normalization, and project bookmarks.
- `0004_yummy_starfox.sql`: Provider status health and partial search diagnostics.
- `0005_modern_umar.sql`: Performance indexing on `(project_id, created_at)`.
- `0006_notifications_and_preferences.sql`: In-app notification center, user preferences, and notification type enums.

### Safe Forward-Only Migration Execution

Production migrations must be executed as a pre-deploy release step before deploying the updated backend container:

```bash
# In production environment with DATABASE_URL set:
npm --prefix backend run db:migrate:prod
```

### Expand-and-Contract Policy
1. **Never drop columns or rename columns in an active release**:
   - First release: Add new nullable column or column with safe default.
   - Deploy backend that reads new column with fallback to old column.
   - Second release: Backfill data and switch primary writes.
   - Third release: Drop legacy column after verifying no traffic touches it.
2. **Always use `IF NOT EXISTS`** for new tables, types, and indexes.

---

## 3. Connection Pooling & Scalability

When running on serverless or autoscaling container infrastructure (Neon, Supabase, Railway, AWS Aurora):
- **Pooler Requirement**: Always route traffic through PgBouncer or Neon connection pooler.
- **Port Convention**:
  - Direct connection (for migrations): Port `5432`
  - Pooled connection (for web servers): Port `6543` (Transaction Mode)
- **Pool Sizing**:
  - Pool size per container: `5` to `20` connections.
  - Idle timeout: `30` seconds.
  - Connection timeout: `5` seconds.
  - Mandatory SSL: `sslmode=require` or `{ rejectUnauthorized: true }`.

---

## 4. Backup & Disaster Recovery (DR)

### Backup Cadence
- **Automated Daily Snapshots**: Managed provider daily snapshots retained for 30 days.
- **Continuous Write-Ahead Log (WAL) Archiving**: Point-in-time recovery (PITR) with 7-day rewind capability.
- **Pre-Migration Snapshot**: Before applying schema updates, trigger an explicit manual snapshot.

### Disaster Recovery Playbook

#### Scenario A: Unintended Data Deletion or Corruption
1. Freeze application traffic by setting maintenance mode or scaling backend containers to 0.
2. In managed provider console (Neon/Supabase/AWS), initiate Point-In-Time Recovery to timestamp `T - 5 minutes` into a new isolated database instance.
3. Verify table counts and row integrity in the restored database:
   ```sql
   SELECT count(*) FROM "blindspot_phase01"."projects";
   SELECT count(*) FROM "blindspot_phase01"."analyses";
   ```
4. Update `DATABASE_URL` secret on the backend hosting platform to target the restored instance.
5. Re-enable traffic and verify read/write operations via `/health` probe.

#### Scenario B: Migration Failure
1. If migration fails mid-script, check `blindspot_phase01_migrations` table:
   ```sql
   SELECT * FROM "blindspot_phase01_migrations"."__drizzle_migrations" ORDER BY created_at DESC;
   ```
2. Correct the failed SQL statement and re-run `npm --prefix backend run db:migrate:prod`.
3. Because Drizzle migrations run inside transactional blocks, failed statements rollback cleanly without leaving orphaned tables.
