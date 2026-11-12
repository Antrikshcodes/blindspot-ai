CREATE TABLE IF NOT EXISTS "blindspot_phase01"."user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "owner_id" text NOT NULL,
  "display_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_owner_idx"
  ON "blindspot_phase01"."user_profiles" USING btree ("owner_id");
