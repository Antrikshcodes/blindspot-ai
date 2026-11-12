DO $$ BEGIN
  CREATE TYPE "blindspot_phase01"."interview_status" AS ENUM('IN_PROGRESS', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "blindspot_phase01"."interview_sessions"
  ADD COLUMN IF NOT EXISTS "participant_context" text,
  ADD COLUMN IF NOT EXISTS "status" "blindspot_phase01"."interview_status" DEFAULT 'IN_PROGRESS' NOT NULL,
  ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS "interview_project_status_idx"
  ON "blindspot_phase01"."interview_sessions" USING btree ("project_id", "status");

CREATE TABLE IF NOT EXISTS "blindspot_phase01"."interview_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "interview_id" uuid NOT NULL REFERENCES "blindspot_phase01"."interview_sessions"("id") ON DELETE cascade,
  "question_index" integer NOT NULL CHECK ("question_index" >= 0),
  "assumption_id" uuid NOT NULL REFERENCES "blindspot_phase01"."assumptions"("id") ON DELETE cascade,
  "answer" text NOT NULL,
  "source_feedback_id" uuid REFERENCES "blindspot_phase01"."interview_feedback"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "interview_response_question_unique" UNIQUE ("interview_id", "question_index")
);

CREATE INDEX IF NOT EXISTS "interview_response_assumption_idx"
  ON "blindspot_phase01"."interview_responses" USING btree ("assumption_id");
