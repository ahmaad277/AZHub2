CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'success', 'error');--> statement-breakpoint
CREATE TYPE "public"."cash_transaction_type" AS ENUM('deposit', 'withdrawal', 'investment_funding', 'cashflow_receipt');--> statement-breakpoint
CREATE TYPE "public"."cashflow_status" AS ENUM('pending', 'received');--> statement-breakpoint
CREATE TYPE "public"."cashflow_type" AS ENUM('profit', 'principal');--> statement-breakpoint
CREATE TYPE "public"."data_quality_severity" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."data_quality_status" AS ENUM('open', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."distribution_frequency" AS ENUM('monthly', 'quarterly', 'semi_annually', 'annually', 'at_maturity', 'custom');--> statement-breakpoint
CREATE TYPE "public"."font_size" AS ENUM('small', 'medium', 'large');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('previewed', 'committed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."import_source" AS ENUM('csv', 'xlsx', 'json');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'ar');--> statement-breakpoint
CREATE TYPE "public"."platform_type" AS ENUM('sukuk', 'manfaa', 'lendo', 'other');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('dark', 'light', 'system');--> statement-breakpoint
CREATE TYPE "public"."view_mode" AS ENUM('pro', 'lite');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" "alert_severity" DEFAULT 'info' NOT NULL,
	"investment_id" text,
	"cashflow_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cash_transactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"type" "cash_transaction_type" NOT NULL,
	"reference_id" text,
	"platform_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_tx_receipt_reference_required" CHECK ("cash_transactions"."type" <> 'cashflow_receipt' OR "cash_transactions"."reference_id" IS NOT NULL),
	CONSTRAINT "cash_tx_funding_reference_required" CHECK ("cash_transactions"."type" <> 'investment_funding' OR "cash_transactions"."reference_id" IS NOT NULL),
	CONSTRAINT "cash_tx_amount_sign_coherent" CHECK (
        ("cash_transactions"."type" IN ('deposit','cashflow_receipt') AND "cash_transactions"."amount"::numeric > 0) OR
        ("cash_transactions"."type" IN ('withdrawal','investment_funding') AND "cash_transactions"."amount"::numeric < 0)
      )
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cashflows" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"investment_id" text NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"amount" numeric(16, 2) NOT NULL,
	"type" "cashflow_type" DEFAULT 'profit' NOT NULL,
	"status" "cashflow_status" DEFAULT 'pending' NOT NULL,
	"received_date" timestamp with time zone,
	"is_custom_schedule" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cashflows_amount_positive" CHECK ("cashflows"."amount"::numeric > 0),
	CONSTRAINT "cashflows_received_coherent" CHECK (("cashflows"."status" = 'received' AND "cashflows"."received_date" IS NOT NULL) OR ("cashflows"."status" = 'pending' AND "cashflows"."received_date" IS NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_quality_issues" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"issue_type" text NOT NULL,
	"severity" "data_quality_severity" DEFAULT 'warning' NOT NULL,
	"message" text NOT NULL,
	"suggested_fix" text,
	"status" "data_quality_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_jobs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"source_type" "import_source" NOT NULL,
	"entity_type" text DEFAULT 'investment' NOT NULL,
	"status" "import_job_status" DEFAULT 'previewed' NOT NULL,
	"payload" jsonb NOT NULL,
	"summary" jsonb,
	"errors" jsonb,
	"committed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "investments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"platform_id" text NOT NULL,
	"name" text NOT NULL,
	"investment_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "investments_investment_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"principal_amount" numeric(16, 2) NOT NULL,
	"expected_profit" numeric(16, 2) NOT NULL,
	"expected_irr" numeric(7, 4) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"duration_months" integer NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"distribution_frequency" "distribution_frequency" DEFAULT 'monthly' NOT NULL,
	"is_reinvestment" boolean DEFAULT false NOT NULL,
	"funded_from_cash" boolean DEFAULT false NOT NULL,
	"exclude_platform_fees" boolean DEFAULT false NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"source_share_link_id" text,
	"tags" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investments_principal_positive" CHECK ("investments"."principal_amount"::numeric > 0),
	CONSTRAINT "investments_profit_nonneg" CHECK ("investments"."expected_profit"::numeric >= 0),
	CONSTRAINT "investments_duration_positive" CHECK ("investments"."duration_months" > 0),
	CONSTRAINT "investments_dates_coherent" CHECK ("investments"."end_date" > "investments"."start_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platforms" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"type" "platform_type" NOT NULL,
	"logo_url" text,
	"fee_percentage" numeric(6, 3) DEFAULT '0' NOT NULL,
	"deduct_fees" boolean DEFAULT true NOT NULL,
	"color" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_snapshots" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"entity_counts" jsonb,
	"byte_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "share_links" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"token" text NOT NULL,
	"label" text DEFAULT 'Data Entry Link' NOT NULL,
	"scope" text DEFAULT 'data_entry_only' NOT NULL,
	"allowed_platform_ids" jsonb,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"owner_email" text NOT NULL,
	"view_mode" "view_mode" DEFAULT 'pro' NOT NULL,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"language" "language" DEFAULT 'ar' NOT NULL,
	"font_size" "font_size" DEFAULT 'medium' NOT NULL,
	"color_palette" text DEFAULT 'azure' NOT NULL,
	"currency" text DEFAULT 'SAR' NOT NULL,
	"target_capital_2040" numeric(16, 2),
	"collapsed_sections" jsonb DEFAULT '[]'::jsonb,
	"alerts_enabled" boolean DEFAULT true NOT NULL,
	"alert_days_before" integer DEFAULT 7 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_owner_email_unique" UNIQUE("owner_email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vision_targets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"month" timestamp with time zone NOT NULL,
	"target_value" numeric(16, 2) NOT NULL,
	"generated" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alerts" ADD CONSTRAINT "alerts_cashflow_id_cashflows_id_fk" FOREIGN KEY ("cashflow_id") REFERENCES "public"."cashflows"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cashflows" ADD CONSTRAINT "cashflows_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investments" ADD CONSTRAINT "investments_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alerts_read_idx" ON "alerts" USING btree ("read");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_dedupe_uq" ON "alerts" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_tx_date_idx" ON "cash_transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_tx_type_idx" ON "cash_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cash_tx_reference_idx" ON "cash_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cashflows_investment_idx" ON "cashflows" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cashflows_due_date_idx" ON "cashflows" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cashflows_status_idx" ON "cashflows" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investments_platform_idx" ON "investments" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "investments_end_date_idx" ON "investments" USING btree ("end_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "platforms_name_uq" ON "platforms" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "share_links_token_uq" ON "share_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vision_targets_month_uq" ON "vision_targets" USING btree ("month");