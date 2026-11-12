DO $$ BEGIN
  CREATE TYPE "blindspot_phase01"."project_status" AS ENUM('ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "blindspot_phase01"."projects"
  ADD COLUMN IF NOT EXISTS "industry" text DEFAULT 'General' NOT NULL,
  ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'General' NOT NULL,
  ADD COLUMN IF NOT EXISTS "technical_requirements" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS "status" "blindspot_phase01"."project_status" DEFAULT 'ACTIVE' NOT NULL;

CREATE INDEX IF NOT EXISTS "project_owner_status_idx"
  ON "blindspot_phase01"."projects" USING btree ("owner_id", "status");
