/**
 * A.Z Finance Hub v2 — Database Schema (Postgres / Drizzle ORM)
 *
 * Architectural principles (NON-NEGOTIABLE):
 *  - Single Source of Truth: the database is the only source of truth for money.
 *  - Double-Entry Ledger: `cash_transactions` is the authoritative cash ledger.
 *    Cash balance = SUM(cash_transactions.amount). No derived balance columns.
 *  - Computed Statuses: investments do NOT store status. Status is derived from
 *    cashflows + dates via the `investment_status_view` SQL view.
 *  - Merged Custom Schedules: `cashflows.is_custom_schedule` replaces the
 *    legacy `custom_distributions` table.
 *
 * All tables and important columns include descriptive SQL comments so that
 * future LLM-based AI agents can introspect and write correct SQL against them.
 */

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const platformTypeEnum = pgEnum("platform_type", [
  "sukuk",
  "manfaa",
  "lendo",
  "other",
]);

export const distributionFrequencyEnum = pgEnum("distribution_frequency", [
  "monthly",
  "quarterly",
  "semi_annually",
  "annually",
  "at_maturity",
  "custom",
]);

export const cashflowTypeEnum = pgEnum("cashflow_type", ["profit", "principal"]);

export const cashflowStatusEnum = pgEnum("cashflow_status", [
  "pending",
  "received",
]);

export const cashTxTypeEnum = pgEnum("cash_transaction_type", [
  "deposit",
  "withdrawal",
  "investment_funding",
  "cashflow_receipt",
]);

export const alertSeverityEnum = pgEnum("alert_severity", [
  "info",
  "warning",
  "success",
  "error",
]);

export const dataQualitySeverityEnum = pgEnum("data_quality_severity", [
  "info",
  "warning",
  "error",
]);

export const dataQualityStatusEnum = pgEnum("data_quality_status", [
  "open",
  "resolved",
  "ignored",
]);

export const importJobStatusEnum = pgEnum("import_job_status", [
  "previewed",
  "committed",
  "failed",
]);

export const importSourceEnum = pgEnum("import_source", ["csv", "xlsx", "json"]);

export const themeEnum = pgEnum("theme", ["dark", "light", "system"]);
export const viewModeEnum = pgEnum("view_mode", ["pro", "lite"]);
export const languageEnum = pgEnum("language", ["en", "ar"]);
export const fontSizeEnum = pgEnum("font_size", ["small", "medium", "large"]);

/* -------------------------------------------------------------------------- */
/* Platforms                                                                  */
/* -------------------------------------------------------------------------- */

export const platforms = pgTable(
  "platforms",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    name: text("name").notNull(),
    type: platformTypeEnum("type").notNull(),
    logoUrl: text("logo_url"),
    feePercentage: numeric("fee_percentage", { precision: 6, scale: 3 })
      .notNull()
      .default("0"),
    deductFees: boolean("deduct_fees").notNull().default(true),
    color: text("color"), // Tailwind-compatible color token for UI identity
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameIdx: uniqueIndex("platforms_name_uq").on(t.name),
  }),
);

/* -------------------------------------------------------------------------- */
/* Investments                                                                */
/*   NOTE: No manual status column. Status is derived dynamically via the     */
/*   `investment_status_view` SQL view (see 0000_view_investment_status.sql). */
/* -------------------------------------------------------------------------- */

export const investments = pgTable(
  "investments",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    platformId: text("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    investmentNumber: integer("investment_number").generatedAlwaysAsIdentity(),
    principalAmount: numeric("principal_amount", {
      precision: 16,
      scale: 2,
    }).notNull(),
    expectedProfit: numeric("expected_profit", {
      precision: 16,
      scale: 2,
    }).notNull(),
    expectedIrr: numeric("expected_irr", { precision: 7, scale: 4 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    durationMonths: integer("duration_months").notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    distributionFrequency: distributionFrequencyEnum("distribution_frequency")
      .notNull()
      .default("monthly"),
    isReinvestment: boolean("is_reinvestment").notNull().default(false),
    fundedFromCash: boolean("funded_from_cash").notNull().default(false),
    excludePlatformFees: boolean("exclude_platform_fees")
      .notNull()
      .default(false),
    needsReview: boolean("needs_review").notNull().default(false),
    sourceShareLinkId: text("source_share_link_id"), // if created via share link
    tags: jsonb("tags").$type<string[] | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    platformIdx: index("investments_platform_idx").on(t.platformId),
    endDateIdx: index("investments_end_date_idx").on(t.endDate),
    principalPositive: check(
      "investments_principal_positive",
      sql`${t.principalAmount}::numeric > 0`,
    ),
    profitNonNeg: check(
      "investments_profit_nonneg",
      sql`${t.expectedProfit}::numeric >= 0`,
    ),
    durationPositive: check(
      "investments_duration_positive",
      sql`${t.durationMonths} > 0`,
    ),
    datesCoherent: check(
      "investments_dates_coherent",
      sql`${t.endDate} > ${t.startDate}`,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/* Cashflows (merged with custom distributions)                               */
/* -------------------------------------------------------------------------- */

export const cashflows = pgTable(
  "cashflows",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    investmentId: text("investment_id")
      .notNull()
      .references(() => investments.id, { onDelete: "cascade" }),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    type: cashflowTypeEnum("type").notNull().default("profit"),
    status: cashflowStatusEnum("status").notNull().default("pending"),
    receivedDate: timestamp("received_date", { withTimezone: true }),
    /**
     * True when this row came from a user-defined custom schedule (frequency=custom),
     * replacing the legacy custom_distributions table.
     */
    isCustomSchedule: boolean("is_custom_schedule").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    investmentIdx: index("cashflows_investment_idx").on(t.investmentId),
    dueDateIdx: index("cashflows_due_date_idx").on(t.dueDate),
    statusIdx: index("cashflows_status_idx").on(t.status),
    amountPositive: check(
      "cashflows_amount_positive",
      sql`${t.amount}::numeric > 0`,
    ),
    receivedCoherent: check(
      "cashflows_received_coherent",
      sql`(${t.status} = 'received' AND ${t.receivedDate} IS NOT NULL) OR (${t.status} = 'pending' AND ${t.receivedDate} IS NULL)`,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/* Cash Transactions (THE LEDGER)                                             */
/*   Cash balance = SUM(amount). Positive = inflow, negative = outflow.       */
/*   CHECK constraint enforces reference_id for cashflow_receipt.             */
/* -------------------------------------------------------------------------- */

export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
    /**
     * Signed amount. Positive for deposits/receipts, negative for
     * withdrawals/investment_funding.
     */
    amount: numeric("amount", { precision: 16, scale: 2 }).notNull(),
    type: cashTxTypeEnum("type").notNull(),
    /**
     * For `investment_funding` this is the investment_id.
     * For `cashflow_receipt` this is the cashflow_id (REQUIRED).
     * For deposits/withdrawals this is NULL.
     */
    referenceId: text("reference_id"),
    platformId: text("platform_id").references(() => platforms.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dateIdx: index("cash_tx_date_idx").on(t.date),
    typeIdx: index("cash_tx_type_idx").on(t.type),
    refIdx: index("cash_tx_reference_idx").on(t.referenceId),
    receiptMustHaveRef: check(
      "cash_tx_receipt_reference_required",
      sql`${t.type} <> 'cashflow_receipt' OR ${t.referenceId} IS NOT NULL`,
    ),
    fundingMustHaveRef: check(
      "cash_tx_funding_reference_required",
      sql`${t.type} <> 'investment_funding' OR ${t.referenceId} IS NOT NULL`,
    ),
    amountSignCoherent: check(
      "cash_tx_amount_sign_coherent",
      sql`
        (${t.type} IN ('deposit','cashflow_receipt') AND ${t.amount}::numeric > 0) OR
        (${t.type} IN ('withdrawal','investment_funding') AND ${t.amount}::numeric < 0)
      `,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/* Vision 2040 Monthly Targets                                                */
/* -------------------------------------------------------------------------- */

export const visionTargets = pgTable(
  "vision_targets",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    /** First day of the month (UTC midnight). */
    month: timestamp("month", { withTimezone: true }).notNull(),
    targetValue: numeric("target_value", { precision: 16, scale: 2 }).notNull(),
    generated: boolean("generated").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    monthUq: uniqueIndex("vision_targets_month_uq").on(t.month),
  }),
);

/* -------------------------------------------------------------------------- */
/* User Settings (single-row owner settings)                                  */
/* -------------------------------------------------------------------------- */

export const userSettings = pgTable("user_settings", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  ownerEmail: text("owner_email").notNull().unique(),
  viewMode: viewModeEnum("view_mode").notNull().default("pro"),
  theme: themeEnum("theme").notNull().default("dark"),
  language: languageEnum("language").notNull().default("ar"),
  fontSize: fontSizeEnum("font_size").notNull().default("medium"),
  colorPalette: text("color_palette").notNull().default("azure"),
  currency: text("currency").notNull().default("SAR"),
  targetCapital2040: numeric("target_capital_2040", { precision: 16, scale: 2 }),
  collapsedSections: jsonb("collapsed_sections").$type<string[]>().default([]),
  alertsEnabled: boolean("alerts_enabled").notNull().default(true),
  alertDaysBefore: integer("alert_days_before").notNull().default(7),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Alerts                                                                     */
/* -------------------------------------------------------------------------- */

export const alerts = pgTable(
  "alerts",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    type: text("type").notNull(), // 'distribution' | 'maturity' | 'overdue' | 'opportunity'
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: alertSeverityEnum("severity").notNull().default("info"),
    investmentId: text("investment_id").references(() => investments.id, {
      onDelete: "cascade",
    }),
    cashflowId: text("cashflow_id").references(() => cashflows.id, {
      onDelete: "cascade",
    }),
    read: boolean("read").notNull().default(false),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    readIdx: index("alerts_read_idx").on(t.read),
    dedupeIdx: uniqueIndex("alerts_dedupe_uq").on(t.dedupeKey),
  }),
);

/* -------------------------------------------------------------------------- */
/* Data Quality Issues                                                        */
/* -------------------------------------------------------------------------- */

export const dataQualityIssues = pgTable("data_quality_issues", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  issueType: text("issue_type").notNull(),
  severity: dataQualitySeverityEnum("severity").notNull().default("warning"),
  message: text("message").notNull(),
  suggestedFix: text("suggested_fix"),
  status: dataQualityStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

/* -------------------------------------------------------------------------- */
/* Portfolio Snapshots                                                        */
/* -------------------------------------------------------------------------- */

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  name: text("name").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(),
  entityCounts: jsonb("entity_counts"),
  byteSize: integer("byte_size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Share Links (limited data-entry tokens)                                    */
/* -------------------------------------------------------------------------- */

export const shareLinks = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    token: text("token").notNull(),
    label: text("label").notNull().default("Data Entry Link"),
    scope: text("scope").notNull().default("data_entry_only"),
    allowedPlatformIds: jsonb("allowed_platform_ids").$type<string[] | null>(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    usageCount: integer("usage_count").notNull().default(0),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    tokenUq: uniqueIndex("share_links_token_uq").on(t.token),
  }),
);

/* -------------------------------------------------------------------------- */
/* Import Jobs                                                                */
/* -------------------------------------------------------------------------- */

export const importJobs = pgTable("import_jobs", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  sourceType: importSourceEnum("source_type").notNull(),
  entityType: text("entity_type").notNull().default("investment"),
  status: importJobStatusEnum("status").notNull().default("previewed"),
  payload: jsonb("payload").notNull(),
  summary: jsonb("summary"),
  errors: jsonb("errors"),
  committedCount: integer("committed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const platformsRelations = relations(platforms, ({ many }) => ({
  investments: many(investments),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [investments.platformId],
    references: [platforms.id],
  }),
  cashflows: many(cashflows),
  alerts: many(alerts),
}));

export const cashflowsRelations = relations(cashflows, ({ one }) => ({
  investment: one(investments, {
    fields: [cashflows.investmentId],
    references: [investments.id],
  }),
}));

export const cashTransactionsRelations = relations(
  cashTransactions,
  ({ one }) => ({
    platform: one(platforms, {
      fields: [cashTransactions.platformId],
      references: [platforms.id],
    }),
  }),
);

export const alertsRelations = relations(alerts, ({ one }) => ({
  investment: one(investments, {
    fields: [alerts.investmentId],
    references: [investments.id],
  }),
  cashflow: one(cashflows, {
    fields: [alerts.cashflowId],
    references: [cashflows.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/* Zod Schemas                                                                */
/* -------------------------------------------------------------------------- */

export const insertPlatformSchema = createInsertSchema(platforms).omit({
  id: true,
  createdAt: true,
});
export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  investmentNumber: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCashflowSchema = createInsertSchema(cashflows).omit({
  id: true,
  createdAt: true,
});
export const insertCashTransactionSchema = createInsertSchema(
  cashTransactions,
).omit({
  id: true,
  createdAt: true,
});
export const insertVisionTargetSchema = createInsertSchema(visionTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});
export const insertShareLinkSchema = createInsertSchema(shareLinks).omit({
  id: true,
  token: true,
  createdAt: true,
  usageCount: true,
  lastUsedAt: true,
});

/* -------------------------------------------------------------------------- */
/* Type exports                                                               */
/* -------------------------------------------------------------------------- */

export type Platform = typeof platforms.$inferSelect;
export type NewPlatform = typeof platforms.$inferInsert;
export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
export type Cashflow = typeof cashflows.$inferSelect;
export type NewCashflow = typeof cashflows.$inferInsert;
export type CashTransaction = typeof cashTransactions.$inferSelect;
export type NewCashTransaction = typeof cashTransactions.$inferInsert;
export type VisionTarget = typeof visionTargets.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type DataQualityIssue = typeof dataQualityIssues.$inferSelect;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type ShareLink = typeof shareLinks.$inferSelect;
export type ImportJob = typeof importJobs.$inferSelect;

/** Derived investment status (computed via SQL view, not stored). */
export type DerivedInvestmentStatus =
  | "active"
  | "late"
  | "defaulted"
  | "completed";

export type InvestmentWithStatus = Investment & {
  derivedStatus: DerivedInvestmentStatus;
  platform: Platform;
};
