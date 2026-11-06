CREATE TABLE "blindspot_phase01"."resource_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"categories" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blindspot_phase01"."resource_search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"search_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"adapter_name" text NOT NULL,
	"query" text NOT NULL,
	"parameters" jsonb NOT NULL,
	"status" text NOT NULL,
	"result_count" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"cached" boolean NOT NULL,
	"error" text,
	"retry_after_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resources" ADD COLUMN "source_api_url" text;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resources" ADD COLUMN "source_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "analysis_id" uuid;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "query_plan" jsonb;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "status" text DEFAULT 'COMPLETED' NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "partial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "cached" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD COLUMN "explanation_status" text DEFAULT 'NOT_REQUESTED' NOT NULL;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_search_queries" ADD CONSTRAINT "resource_search_queries_search_id_resource_searches_id_fk" FOREIGN KEY ("search_id") REFERENCES "blindspot_phase01"."resource_searches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_search_queries" ADD CONSTRAINT "resource_search_queries_provider_id_resource_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "blindspot_phase01"."resource_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_query_search_idx" ON "blindspot_phase01"."resource_search_queries" USING btree ("search_id");--> statement-breakpoint
CREATE INDEX "resource_query_provider_idx" ON "blindspot_phase01"."resource_search_queries" USING btree ("provider_id");--> statement-breakpoint
ALTER TABLE "blindspot_phase01"."resource_searches" ADD CONSTRAINT "resource_searches_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "blindspot_phase01"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_provider_external_idx" ON "blindspot_phase01"."resources" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "resource_updated_idx" ON "blindspot_phase01"."resources" USING btree ("source_updated_at");