-- B1 Data Integrity Finalization — SQL COMMENTS for all columns missing documentation.
-- Tables already commented in prior migrations (pending_login_requests, auth_login_events)
-- and investments.resolved_issue_* columns (0002) are intentionally skipped.

-- ---------------------------------------------------------------------------
-- platforms
-- ---------------------------------------------------------------------------
COMMENT ON TABLE "platforms" IS 'Investment platforms (e.g. Manfaa, Lendo) that group investments and cashflows for portfolio organization.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."name" IS 'Display name of the platform, unique across all platforms.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."type" IS 'Platform category: sukuk, manfaa, lendo, or other.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."logo_url" IS 'Optional URL to the platform logo image.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."fee_percentage" IS 'Platform management fee as a percentage (e.g. 2.500 for 2.5%).';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."deduct_fees" IS 'Whether platform fees are deducted from cashflow receipts.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."color" IS 'Tailwind-compatible color token used for UI identity (e.g. cyan, blue, green).';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."notes" IS 'Free-text notes about this platform.';
--> statement-breakpoint
COMMENT ON COLUMN "platforms"."created_at" IS 'Timestamp when the platform record was created (UTC).';

-- ---------------------------------------------------------------------------
-- investments
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "investments" IS 'Core investment portfolio. Status is derived via investment_status_view, never stored.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."platform_id" IS 'Foreign key to platforms.id. Links this investment to an investment platform.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."name" IS 'Human-readable name of the investment (e.g. contract or project name).';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."investment_number" IS 'Auto-incrementing integer identity for display ordering.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."principal_amount" IS 'Original principal amount invested (16 digits, 2 decimal places). Positive and non-zero.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."expected_profit" IS 'Total expected profit over the full investment term. Non-negative.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."expected_irr" IS 'Expected internal rate of return (IRR) as a percentage (e.g. 10.5000 for 10.5%). Used for annual yield calculations.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."start_date" IS 'Contract start date. Must be before end_date.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."duration_months" IS 'Contract duration in whole months. Must be positive.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."end_date" IS 'Contract maturity date. Must be after start_date.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."distribution_frequency" IS 'Profit distribution schedule: monthly, quarterly, semi_annually, annually, at_maturity, or custom.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."is_reinvestment" IS 'Whether this investment was funded by reinvesting returns from another investment.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."funded_from_cash" IS 'Whether this investment was funded from the cash balance (creates an investment_funding cash_transactions row).';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."exclude_platform_fees" IS 'When true, platform fees are not deducted from this investment cashflows.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."needs_review" IS 'Flag indicating the investment requires manual review (e.g. data quality scan found an anomaly).';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."source_share_link_id" IS 'If this investment was created via a share link, references the share_links.id.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."tags" IS 'JSONB array of string tags for categorization and filtering.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."notes" IS 'Free-text notes about this investment.';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."created_at" IS 'Timestamp when the investment record was created (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN "investments"."updated_at" IS 'Timestamp when the investment record was last updated (UTC).';

-- ---------------------------------------------------------------------------
-- cashflows
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "cashflows" IS 'Scheduled and custom cashflow payments (profit distributions and principal returns).';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."investment_id" IS 'Foreign key to investments.id. Cascades on delete.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."due_date" IS 'Scheduled date when this cashflow payment is due.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."amount" IS 'Payment amount (16 digits, 2 decimal places). Positive and non-zero.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."type" IS 'Payment type: profit (distribution) or principal (return of capital).';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."status" IS 'Payment status: pending or received. Received cashflows have received_date set.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."received_date" IS 'Date when the payment was actually received. Must be set when status is received.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."is_custom_schedule" IS 'True when this row came from a user-defined custom schedule (distribution_frequency=custom), replacing the legacy custom_distributions table.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."notes" IS 'Free-text notes about this cashflow payment.';
--> statement-breakpoint
COMMENT ON COLUMN "cashflows"."created_at" IS 'Timestamp when the cashflow record was created (UTC).';

-- ---------------------------------------------------------------------------
-- cash_transactions
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "cash_transactions" IS 'THE AUTHORITATIVE CASH LEDGER. Cash balance = SUM(amount). Positive = inflow, negative = outflow.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."date" IS 'Date of the cash movement. Defaults to now().';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."amount" IS 'Signed amount. Positive for deposits/receipts, negative for withdrawals/investment_funding.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."type" IS 'Transaction type: deposit, withdrawal, investment_funding, or cashflow_receipt.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."reference_id" IS 'For investment_funding: the investment_id. For cashflow_receipt: the cashflow_id (REQUIRED). For deposits/withdrawals: NULL.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."platform_id" IS 'Optional foreign key to platforms.id. NULL for ledger-only entries.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."notes" IS 'Free-text notes about this ledger entry.';
--> statement-breakpoint
COMMENT ON COLUMN "cash_transactions"."created_at" IS 'Timestamp when the ledger entry was created (UTC).';

-- ---------------------------------------------------------------------------
-- vision_targets
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "vision_targets" IS 'Vision 2040 monthly target capital values for long-term portfolio projection.';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."month" IS 'First day of the month (UTC midnight). Unique per month.';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."target_value" IS 'Target capital (NAV) for this month (16 digits, 2 decimal places).';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."generated" IS 'Whether this row was auto-generated (true) or manually entered (false).';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."notes" IS 'Free-text notes about this target.';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."created_at" IS 'Timestamp when the target was created (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN "vision_targets"."updated_at" IS 'Timestamp when the target was last updated (UTC).';

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "user_settings" IS 'Single-row owner settings. One row per owner_email. Controls UI preferences and alert config.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."owner_email" IS 'Normalized owner email address. Unique — one settings row per owner.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."view_mode" IS 'Dashboard display mode: pro (full) or lite (simplified).';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."theme" IS 'UI theme preference: dark, light, or system.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."language" IS 'UI language: en (English) or ar (Arabic).';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."font_size" IS 'UI font size: small, medium, or large.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."color_palette" IS 'Color palette name for theming (default: azure).';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."currency" IS 'Primary display currency code (default: SAR).';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."target_capital_2040" IS 'Vision 2040 target capital amount for projection charts.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."collapsed_sections" IS 'JSONB array of section IDs that are currently collapsed in the dashboard.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."alerts_enabled" IS 'Whether automatic alert generation is enabled.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."alert_days_before" IS 'Number of days before a cashflow due date to trigger a distribution alert.';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."created_at" IS 'Timestamp when the settings row was created (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN "user_settings"."updated_at" IS 'Timestamp when the settings row was last updated (UTC).';

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "alerts" IS 'System-generated alerts for upcoming cashflows, overdue payments, and investment milestones.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."type" IS 'Alert category: distribution, maturity, overdue, or opportunity.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."title" IS 'Short human-readable alert title.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."message" IS 'Detailed alert description and recommended action.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."severity" IS 'Alert importance: info, warning, success, or error.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."investment_id" IS 'Optional foreign key to investments.id. Links alert to a specific investment.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."cashflow_id" IS 'Optional foreign key to cashflows.id. Links alert to a specific cashflow.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."read" IS 'Whether the alert has been acknowledged by the owner.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."dedupe_key" IS 'Unique deduplication key to prevent duplicate alerts for the same event.';
--> statement-breakpoint
COMMENT ON COLUMN "alerts"."created_at" IS 'Timestamp when the alert was generated (UTC).';

-- ---------------------------------------------------------------------------
-- data_quality_issues
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "data_quality_issues" IS 'Data quality scan results. Each row represents one detected anomaly or inconsistency.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."entity_type" IS 'Type of entity with the issue (e.g. investment, cashflow, platform).';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."entity_id" IS 'UUID of the entity with the issue.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."issue_type" IS 'Category of the detected issue (e.g. missing_cashflow, negative_balance, stale_date).';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."severity" IS 'Issue severity: info, warning, or error.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."message" IS 'Human-readable description of the detected issue.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."suggested_fix" IS 'Suggested corrective action to resolve the issue.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."status" IS 'Resolution status: open, resolved, or ignored.';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."created_at" IS 'Timestamp when the issue was detected (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN "data_quality_issues"."resolved_at" IS 'Timestamp when the issue was resolved or ignored (UTC).';

-- ---------------------------------------------------------------------------
-- portfolio_snapshots
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "portfolio_snapshots" IS 'In-app backup snapshots of the entire portfolio state for restore before destructive operations (DB-R-030).';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."name" IS 'Human-readable snapshot label.';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."snapshot_data" IS 'Full portfolio state as JSONB (investments, cashflows, transactions, platforms, settings).';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."entity_counts" IS 'JSONB with entity type keys and count values summarizing the snapshot contents.';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."byte_size" IS 'Approximate byte size of the snapshot_data blob.';
--> statement-breakpoint
COMMENT ON COLUMN "portfolio_snapshots"."created_at" IS 'Timestamp when the snapshot was taken (UTC).';

-- ---------------------------------------------------------------------------
-- share_links
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "share_links" IS 'Limited-scope data entry tokens. Allow external parties to submit investments without full app access.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."token" IS 'Opaque share token (randomly generated). Unique per link.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."label" IS 'Human-readable label for this share link (e.g. "Accountant Q4 Entry").';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."scope" IS 'Access scope for this link (currently always data_entry_only).';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."allowed_platform_ids" IS 'JSONB array of platform UUIDs this link is restricted to (NULL means all platforms).';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."expires_at" IS 'Optional expiry timestamp after which the link is no longer usable.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."revoked_at" IS 'Timestamp when the link was manually revoked (NULL if still active).';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."usage_count" IS 'Number of times this link has been used to submit data.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."last_used_at" IS 'Timestamp of the most recent usage of this link.';
--> statement-breakpoint
COMMENT ON COLUMN "share_links"."created_at" IS 'Timestamp when the share link was created (UTC).';

-- ---------------------------------------------------------------------------
-- import_jobs
-- ---------------------------------------------------------------------------
--> statement-breakpoint
COMMENT ON TABLE "import_jobs" IS 'Batch import job records for CSV, XLSX, and JSON bulk data ingestion.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."id" IS 'Primary key, auto-generated UUID.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."source_type" IS 'Import file format: csv, xlsx, or json.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."entity_type" IS 'Type of entity being imported (default: investment).';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."status" IS 'Job status: previewed (awaiting confirmation), committed (applied), or failed.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."payload" IS 'Full import data as JSONB (rows and metadata).';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."summary" IS 'JSONB summary of the import (row counts, skipped, errors).';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."errors" IS 'JSONB array of per-row error details when status is failed.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."committed_count" IS 'Number of rows successfully committed to the database.';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."created_at" IS 'Timestamp when the import job was created (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN "import_jobs"."updated_at" IS 'Timestamp when the import job was last updated (UTC).';
