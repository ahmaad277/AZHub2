ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "resolved_issue_status" text;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "resolved_issue_days" integer;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN IF NOT EXISTS "resolved_issue_resolved_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investments" ADD CONSTRAINT "investments_resolved_issue_status_valid" CHECK ("resolved_issue_status" IS NULL OR "resolved_issue_status" IN ('late', 'defaulted'));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investments" ADD CONSTRAINT "investments_resolved_issue_coherent" CHECK (("resolved_issue_status" IS NULL AND "resolved_issue_days" IS NULL AND "resolved_issue_resolved_at" IS NULL) OR ("resolved_issue_status" IS NOT NULL AND "resolved_issue_days" > 0 AND "resolved_issue_resolved_at" IS NOT NULL));
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
COMMENT ON COLUMN "investments"."resolved_issue_status" IS 'Resolved historical operational issue for completed investments: late or defaulted. Null means no saved resolved issue.';--> statement-breakpoint
COMMENT ON COLUMN "investments"."resolved_issue_days" IS 'Number of days the final principal cashflow was late before it was received and resolved.';--> statement-breakpoint
COMMENT ON COLUMN "investments"."resolved_issue_resolved_at" IS 'Timestamp when the delayed/defaulted principal issue was resolved by receiving the principal cashflow.';
