DO $$ BEGIN
 CREATE TYPE "blindspot_phase01"."notification_type" AS ENUM('ANALYSIS_COMPLETED', 'FEEDBACK_RECEIVED', 'CONTRADICTION_DETECTED', 'EXPERIMENT_UPDATE', 'RESOURCE_RECOMMENDATION', 'PROJECT_ACTIVITY', 'SYSTEM');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "blindspot_phase01"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"project_id" uuid,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "blindspot_phase01"."notification_type" DEFAULT 'SYSTEM' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "blindspot_phase01"."notifications" ADD CONSTRAINT "notifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "notification_owner_created_idx" ON "blindspot_phase01"."notifications" USING btree ("owner_id","created_at");
CREATE INDEX IF NOT EXISTS "notification_owner_read_idx" ON "blindspot_phase01"."notifications" USING btree ("owner_id","read");

CREATE TABLE IF NOT EXISTS "blindspot_phase01"."user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"notification_preferences" jsonb NOT NULL,
	"app_preferences" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_owner_idx" ON "blindspot_phase01"."user_preferences" USING btree ("owner_id");
