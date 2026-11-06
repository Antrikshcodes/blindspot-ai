CREATE SCHEMA "blindspot_phase01";
--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."assumption_category" AS ENUM('PROBLEM', 'CUSTOMER', 'SOLUTION', 'MONETIZATION');--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."experiment_status" AS ENUM('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."resource_category" AS ENUM('GITHUB_REPOSITORY', 'DATASET', 'AI_MODEL', 'API', 'DOCUMENTATION', 'OPEN_SOURCE_TOOL', 'LEARNING_RESOURCE');--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."saved_status" AS ENUM('CONSIDERING', 'TRYING', 'INTEGRATED');--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."evidence_sentiment" AS ENUM('SUPPORTING', 'INVALIDATING', 'NEUTRAL');--> statement-breakpoint
CREATE TYPE "blindspot_phase01"."assumption_status" AS ENUM('UNTESTED', 'TESTING', 'SUPPORTED', 'INVALIDATED', 'INCONCLUSIVE');--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"project_snapshot" jsonb NOT NULL,
	"market_context" text,
	"result" jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."assumption_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assumption_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"reviewed_status" "blindspot_phase01"."assumption_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."assumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"description" text NOT NULL,
	"category" "blindspot_phase01"."assumption_category" NOT NULL,
	"impact" integer NOT NULL,
	"uncertainty" integer NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" text NOT NULL,
	"explanation" text NOT NULL,
	"evidence_required" text NOT NULL,
	"validation_method" text NOT NULL,
	"status" "blindspot_phase01"."assumption_status" DEFAULT 'UNTESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assumption_scores_valid" CHECK ("blindspot_phase01"."assumptions"."impact" between 1 and 5 AND "blindspot_phase01"."assumptions"."uncertainty" between 1 and 5 AND "blindspot_phase01"."assumptions"."risk_score" = "blindspot_phase01"."assumptions"."impact" * "blindspot_phase01"."assumptions"."uncertainty")
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."evidence_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" uuid NOT NULL,
	"assumption_id" uuid NOT NULL,
	"quote" text NOT NULL,
	"sentiment" "blindspot_phase01"."evidence_sentiment" NOT NULL,
	"reasoning" text NOT NULL,
	"origin" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"assumption_id" uuid NOT NULL,
	"name" text NOT NULL,
	"explanation" text NOT NULL,
	"method" text NOT NULL,
	"evidence_to_collect" text NOT NULL,
	"success_criteria" text NOT NULL,
	"status" "blindspot_phase01"."experiment_status" DEFAULT 'PLANNED' NOT NULL,
	"observed_result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."interview_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"notes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."feedback_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant" text NOT NULL,
	"questions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"product_description" text NOT NULL,
	"problem_statement" text NOT NULL,
	"target_audience" text NOT NULL,
	"proposed_solution" text NOT NULL,
	"existing_alternatives" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."resource_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"relevance_score" integer NOT NULL,
	"rank_score" integer NOT NULL,
	"quality_score" integer NOT NULL,
	"ranking" jsonb NOT NULL,
	"explanation" jsonb,
	"source_snapshot" jsonb NOT NULL,
	CONSTRAINT "relevance_bounds" CHECK ("blindspot_phase01"."resource_recommendations"."relevance_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "blindspot_phase01"."resource_category" NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"license" text,
	"language" text,
	"tags" text[] NOT NULL,
	"source_updated_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone NOT NULL,
	"quality_signals" jsonb NOT NULL,
	"source_metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."saved_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"status" "blindspot_phase01"."saved_status" DEFAULT 'CONSIDERING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."resource_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"query" text NOT NULL,
	"requirements" text[] NOT NULL,
	"provider_statuses" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."analyses" ADD CONSTRAINT "analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumption_evidence" ADD CONSTRAINT "assumption_evidence_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "blindspot_phase01"."assumptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumption_evidence" ADD CONSTRAINT "assumption_evidence_evidence_id_evidence_records_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "blindspot_phase01"."evidence_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."assumptions" ADD CONSTRAINT "assumptions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "blindspot_phase01"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."evidence_records" ADD CONSTRAINT "evidence_records_feedback_id_interview_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "blindspot_phase01"."interview_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."evidence_records" ADD CONSTRAINT "evidence_records_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "blindspot_phase01"."assumptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."experiments" ADD CONSTRAINT "experiments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."experiments" ADD CONSTRAINT "experiments_assumption_id_assumptions_id_fk" FOREIGN KEY ("assumption_id") REFERENCES "blindspot_phase01"."assumptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_interview_sessions_id_fk" FOREIGN KEY ("interview_id") REFERENCES "blindspot_phase01"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."feedback_analyses" ADD CONSTRAINT "feedback_analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."interview_sessions" ADD CONSTRAINT "interview_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_recommendations" ADD CONSTRAINT "resource_recommendations_search_id_resource_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "blindspot_phase01"."resource_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_recommendations" ADD CONSTRAINT "resource_recommendations_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "blindspot_phase01"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."saved_resources" ADD CONSTRAINT "saved_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."saved_resources" ADD CONSTRAINT "saved_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "blindspot_phase01"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD CONSTRAINT "resource_searches_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "blindspot_phase01"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_project_idx" ON "blindspot_phase01"."analyses" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "review_assumption_idx" ON "blindspot_phase01"."assumption_evidence" USING btree ("assumption_id");--> statement-breakpoint
CREATE INDEX "assumption_analysis_idx" ON "blindspot_phase01"."assumptions" USING btree ("analysis_id");--> statement-breakpoint
CREATE INDEX "evidence_assumption_idx" ON "blindspot_phase01"."evidence_records" USING btree ("assumption_id");--> statement-breakpoint
CREATE INDEX "evidence_feedback_idx" ON "blindspot_phase01"."evidence_records" USING btree ("feedback_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_quote_unique" ON "blindspot_phase01"."evidence_records" USING btree ("feedback_id","assumption_id","quote","sentiment");--> statement-breakpoint
CREATE INDEX "experiment_project_idx" ON "blindspot_phase01"."experiments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feedback_interview_idx" ON "blindspot_phase01"."interview_feedback" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "feedback_analysis_project_idx" ON "blindspot_phase01"."feedback_analyses" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "interview_project_idx" ON "blindspot_phase01"."interview_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_created_idx" ON "blindspot_phase01"."projects" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recommendation_search_unique" ON "blindspot_phase01"."resource_recommendations" USING btree ("search_id","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_url_unique" ON "blindspot_phase01"."resources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "resource_category_idx" ON "blindspot_phase01"."resources" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_project_resource_unique" ON "blindspot_phase01"."saved_resources" USING btree ("project_id","resource_id");--> statement-breakpoint
CREATE INDEX "resource_search_project_idx" ON "blindspot_phase01"."resource_searches" USING btree ("project_id","created_at");