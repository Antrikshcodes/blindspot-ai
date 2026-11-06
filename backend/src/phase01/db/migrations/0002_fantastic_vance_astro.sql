ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'DEMAND';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'BEHAVIOUR';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'WILLINGNESS_TO_PAY';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'TECHNICAL';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'DISTRIBUTION';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'BUSINESS_MODEL';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'COMPETITIVE';--> statement-breakpoint
ALTER TYPE "blindspot_phase01"."assumption_category" ADD VALUE 'OPERATIONAL';--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."analyses" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."analyses" ADD COLUMN "engine_version" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."analyses" ADD COLUMN "additional_context" text;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."analyses" ADD COLUMN "provider_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumptions" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumptions" ADD COLUMN "target_audience" text;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumptions" ADD COLUMN "suggested_interview_question" text;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumptions" ADD COLUMN "score_explanation" jsonb;--> statement-breakpoint
-- Preserve and number pre-existing analyses before imposing per-project uniqueness.
WITH numbered AS (
  SELECT "id", row_number() OVER (PARTITION BY "project_id" ORDER BY "created_at", "id")::integer AS sequence
  FROM "blindspot_phase01"."analyses"
)
UPDATE "blindspot_phase01"."analyses" AS a
SET "version" = numbered.sequence
FROM numbered WHERE a."id" = numbered."id";
--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_project_version_unique" ON "blindspot_phase01"."analyses" USING btree ("project_id","version");