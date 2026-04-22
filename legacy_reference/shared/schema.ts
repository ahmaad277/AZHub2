import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  numeric,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const ts = (name: string) =>
  integer(name, { mode: "timestamp" });

const tsNow = (name: string) =>
  integer(name, { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

// Platform types: Sukuk, Manfa'a, Lendo
export const platforms = sqliteTable("platforms", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'sukuk' | 'manfaa' | 'lendo'
  logoUrl: text("logo_url"),
  feePercentage: numeric("fee_percentage").notNull().default("0"), // Platform fee % (e.g., 2.5%)
  deductFees: integer("deduct_fees").notNull().default(1), // 0 = don't deduct, 1 = deduct fees from profit
});

export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true }).extend({
  feePercentage: z.coerce.number().min(0).max(100),
  deductFees: z.number().int().min(0).max(1).optional().default(1),
});
export const updatePlatformSchema = z.object({
  name: z.string().trim().min(1, "Platform name is required"),
  feePercentage: z.coerce.number().min(0).max(100).optional(),
  deductFees: z.number().int().min(0).max(1).optional(),
});
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type UpdatePlatform = z.infer<typeof updatePlatformSchema>;
export type Platform = typeof platforms.$inferSelect;

// Investment opportunities (Sukuk-optimized)
export const investments = sqliteTable("investments", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  platformId: text("platform_id").notNull(),
  name: text("name").notNull(),
  investmentNumber: integer("investment_number").unique(), // Sequential number based on portfolio entry order
  faceValue: numeric("face_value").notNull(), // القيمة الاسمية - Principal amount (merged from 'amount')
  totalExpectedProfit: numeric("total_expected_profit").notNull(), // إجمالي الأرباح المتوقعة
  startDate: ts("start_date"), // Optional for AI-entered investments pending review
  endDate: ts("end_date"), // Optional for AI-entered investments pending review
  durationMonths: integer("duration_months").notNull(), // Duration in months for validation & quick reference
  actualEndDate: ts("actual_end_date"), // Actual completion date
  expectedIrr: numeric("expected_irr").notNull(), // percentage
  actualIrr: numeric("actual_irr"),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'pending'
  riskScore: integer("risk_score").default(50), // 0-100
  distributionFrequency: text("distribution_frequency").notNull(), // 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'at_maturity' | 'custom'
  profitPaymentStructure: text("profit_payment_structure").notNull().default("periodic"), // 'periodic' = profits during term, 'at_maturity' = profits with principal at end
  excludePlatformFees: integer("exclude_platform_fees").notNull().default(0), // 0 = apply platform fee rules, 1 = ignore platform fee deduction for this investment
  isReinvestment: integer("is_reinvestment").notNull().default(0), // 0 = new investment, 1 = reinvestment from profits
  fundedFromCash: integer("funded_from_cash").notNull().default(0), // 0 = external funding, 1 = funded from cash balance
  needsReview: integer("needs_review").notNull().default(0), // 0 = no review needed, 1 = needs review (Check! indicator)
  lateDate: ts("late_date"), // Date when investment status became 'late'
  defaultedDate: ts("defaulted_date"), // Date when investment status became 'defaulted'
  tags: text("tags", { mode: "json" }).$type<string[] | null>(), // Tags for categorization (e.g., ["AI Entry", "Needs Review"])
  createdAt: tsNow("created_at"), // When investment was added to portfolio
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({ 
  id: true, 
  investmentNumber: true,
  actualIrr: true,
  actualEndDate: true,
  lateDate: true,
  defaultedDate: true,
  createdAt: true,
}).extend({
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  durationMonths: z.number().int().positive(),
  faceValue: z.coerce.number().positive(),
  totalExpectedProfit: z.coerce.number().nonnegative(),
  expectedIrr: z.coerce.number().positive().max(100),
  distributionFrequency: z.enum(['monthly', 'quarterly', 'semi_annually', 'annually', 'at_maturity', 'custom']),
  profitPaymentStructure: z.enum(['periodic', 'at_maturity']),
  status: z.enum(['active', 'late', 'defaulted', 'completed', 'pending']).optional(),
  tags: z.array(z.string()).optional().nullable(),
});
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

// Cashflow distributions (profits/returns)
export const cashflows = sqliteTable("cashflows", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  investmentId: text("investment_id").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  amount: numeric("amount").notNull(),
  receivedDate: integer("received_date", { mode: "timestamp" }),
  status: text("status").notNull().default("upcoming"), // 'received' | 'expected' | 'upcoming'
  type: text("type").notNull().default("profit"), // 'profit' | 'principal'
});

export const insertCashflowSchema = createInsertSchema(cashflows).omit({ 
  id: true,
  receivedDate: true 
}).extend({
  dueDate: z.coerce.date()
});
export type InsertCashflow = z.infer<typeof insertCashflowSchema>;
export type Cashflow = typeof cashflows.$inferSelect;

// Custom Distributions - For investments with custom/irregular distribution schedules
export const customDistributions = sqliteTable("custom_distributions", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  investmentId: text("investment_id").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  amount: numeric("amount").notNull(),
  type: text("type").notNull().default("profit"), // 'profit' | 'principal'
  notes: text("notes"), // Optional description for this distribution
});

export const insertCustomDistributionSchema = createInsertSchema(customDistributions).omit({ 
  id: true
}).extend({
  dueDate: z.coerce.date()
});
export type InsertCustomDistribution = z.infer<typeof insertCustomDistributionSchema>;
export type CustomDistribution = typeof customDistributions.$inferSelect;

// Schema for custom distribution in API payload (without investmentId)
export const apiCustomDistributionSchema = insertCustomDistributionSchema.omit({
  investmentId: true,
});
export type ApiCustomDistribution = z.infer<typeof apiCustomDistributionSchema>;

// Smart alerts and notifications
export const alerts = sqliteTable("alerts", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  type: text("type").notNull(), // 'distribution' | 'maturity' | 'opportunity' | 'risk'
  title: text("title").notNull(),
  message: text("message").notNull(),
  investmentId: text("investment_id"),
  createdAt: tsNow("created_at"),
  read: integer("read").notNull().default(0), // 0 = unread, 1 = read
  severity: text("severity").notNull().default("info"), // 'info' | 'warning' | 'success' | 'error'
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Data Quality Issues - Track inconsistencies and suggested fixes
export const dataQualityIssues = sqliteTable("data_quality_issues", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  entityType: text("entity_type").notNull(), // investment | cashflow | cash_transaction | platform
  entityId: text("entity_id").notNull(),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull().default("warning"), // info | warning | error
  message: text("message").notNull(),
  suggestedFix: text("suggested_fix"),
  status: text("status").notNull().default("open"), // open | resolved | ignored
  createdAt: tsNow("created_at"),
  resolvedAt: ts("resolved_at"),
});

export const insertDataQualityIssueSchema = createInsertSchema(dataQualityIssues).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});
export type InsertDataQualityIssue = z.infer<typeof insertDataQualityIssueSchema>;
export type DataQualityIssue = typeof dataQualityIssues.$inferSelect;

// Import Jobs - Track data import and OCR pipeline
export const importJobs = sqliteTable("import_jobs", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  sourceType: text("source_type").notNull(), // csv | xlsx | ocr
  entityType: text("entity_type").notNull().default("investment"), // investment | cashflow | cash_transaction
  status: text("status").notNull().default("previewed"), // previewed | committed | failed
  payload: text("payload", { mode: "json" }).notNull(),
  summary: text("summary", { mode: "json" }),
  errors: text("errors", { mode: "json" }),
  committedCount: integer("committed_count").notNull().default(0),
  createdAt: tsNow("created_at"),
  updatedAt: tsNow("updated_at"),
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type ImportJob = typeof importJobs.$inferSelect;

// Cash Balance Transactions - Track all cash movements
export const cashTransactions = sqliteTable("cash_transactions", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  amount: numeric("amount").notNull(),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'investment' | 'distribution' | 'transfer'
  source: text("source"), // 'transfer' | 'profit' | 'deposit' | 'investment_return'
  notes: text("notes"),
  date: integer("date", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  investmentId: text("investment_id"), // If related to an investment
  cashflowId: text("cashflow_id"), // If related to a specific cashflow distribution
  platformId: text("platform_id"), // Platform this transaction belongs to (nullable for backwards compatibility)
  balanceAfter: numeric("balance_after").notNull(),
  createdAt: tsNow("created_at"),
});

export const insertCashTransactionSchema = createInsertSchema(cashTransactions).omit({ 
  id: true,
  createdAt: true,
  balanceAfter: true,
}).extend({
  date: z.coerce.date(),
});
export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;
export type CashTransaction = typeof cashTransactions.$inferSelect;

// Saved Scenarios - Vision 2040 Calculator scenarios
export const savedScenarios = sqliteTable("saved_scenarios", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id"), // Nullable for single-user mode, future multi-user support
  name: text("name").notNull(),
  initialAmount: numeric("initial_amount").notNull(),
  monthlyDeposit: numeric("monthly_deposit").notNull(),
  expectedIRR: numeric("expected_irr").notNull(),
  targetAmount: numeric("target_amount").notNull(),
  durationYears: integer("duration_years").notNull(),
  createdAt: tsNow("created_at"),
});

export const insertSavedScenarioSchema = createInsertSchema(savedScenarios).omit({ 
  id: true,
  createdAt: true,
  userId: true, // Managed automatically in backend
}).extend({
  initialAmount: z.coerce.number().positive(),
  monthlyDeposit: z.coerce.number().nonnegative(),
  expectedIRR: z.coerce.number().min(0).max(100),
  targetAmount: z.coerce.number().positive(),
  durationYears: z.coerce.number().int().min(1).max(50),
});
export type InsertSavedScenario = z.infer<typeof insertSavedScenarioSchema>;
export type SavedScenario = typeof savedScenarios.$inferSelect;

// Portfolio Snapshots - Checkpoint system for full portfolio backup/restore
export const portfolioSnapshots = sqliteTable("portfolio_snapshots", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  snapshotData: text("snapshot_data", { mode: "json" }).notNull(), // Full portfolio state
  entityCounts: text("entity_counts", { mode: "json" }), // Metadata: { investments: 5, cashflows: 60, ... }
  byteSize: integer("byte_size"), // Size of snapshot for validation
  createdAt: tsNow("created_at"),
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({ 
  id: true,
  createdAt: true,
  byteSize: true,
  entityCounts: true,
}).extend({
  name: z.string().trim().min(1).max(120),
  snapshotData: z.any(), // Will be validated in storage layer
});
export type InsertPortfolioSnapshot = z.infer<typeof insertPortfolioSnapshotSchema>;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;

// Portfolio History - Track monthly portfolio values for historical analysis
export const portfolioHistory = sqliteTable("portfolio_history", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  month: integer("month", { mode: "timestamp" }).notNull().unique(), // First day of the month (YYYY-MM-01)
  totalValue: numeric("total_value").notNull(), // Total portfolio value for that month
  source: text("source").notNull().default("manual"), // 'manual' | 'auto'
  notes: text("notes"), // Optional notes for the entry
  createdAt: tsNow("created_at"),
  updatedAt: tsNow("updated_at"),
});

export const insertPortfolioHistorySchema = createInsertSchema(portfolioHistory).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  month: z.coerce.date().refine((date) => {
    // Ensure the date is the first day of the month
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return date.getTime() === firstDay.getTime();
  }, { message: "Month must be the first day of the month (YYYY-MM-01)" }),
  totalValue: z.coerce.number().nonnegative({ message: "Portfolio value cannot be negative" }),
  source: z.enum(['manual', 'auto']).optional().default('manual'),
  notes: z.string().max(500).optional(),
});
export type InsertPortfolioHistory = z.infer<typeof insertPortfolioHistorySchema>;
export type PortfolioHistory = typeof portfolioHistory.$inferSelect;

// Vision Targets - Monthly target values for Vision 2040 calculator
export const visionTargets = sqliteTable("vision_targets", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  month: integer("month", { mode: "timestamp" }).notNull().unique(), // First day of month
  targetValue: numeric("target_value").notNull(),
  scenarioId: text("scenario_id"), // Optional link to saved scenario
  generated: integer("generated").notNull().default(1), // 1 if auto-calculated, 0 if manually edited
  notes: text("notes"),
  createdAt: tsNow("created_at"),
  updatedAt: tsNow("updated_at"),
});

export const insertVisionTargetSchema = createInsertSchema(visionTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  month: z.coerce.date(),
  targetValue: z.coerce.number().nonnegative({ message: "Target value cannot be negative" }),
});

export type InsertVisionTarget = z.infer<typeof insertVisionTargetSchema>;
export type VisionTarget = typeof visionTargets.$inferSelect;

// Monthly Progress - Combined view of targets and actuals
export type MonthlyProgress = {
  month: Date;
  targetValue: number | null;
  actualValue: number | null;
  variance: number | null; // actualValue - targetValue
  variancePercent: number | null;
  targetSource: 'generated' | 'manual' | null;
  actualSource: 'manual' | 'auto' | null;
};

// Roles - Define user roles (Owner, Admin, Advanced Analyst, etc.)
export const roles = sqliteTable("roles", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull().unique(), // 'owner' | 'admin' | 'advanced_analyst' | 'basic_analyst' | 'data_entry' | 'viewer'
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  isSystem: integer("is_system").notNull().default(0), // 0 = custom, 1 = system (cannot be deleted)
  createdAt: tsNow("created_at"),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions - Define granular permissions
export const permissions = sqliteTable("permissions", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  key: text("key").notNull().unique(), // e.g., 'view_all_numbers', 'create_investment', 'impersonate'
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  category: text("category").notNull(), // 'data_access' | 'crud' | 'export' | 'admin' | 'advanced'
  createdAt: tsNow("created_at"),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role Permissions - Many-to-many relationship between roles and permissions
export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id").notNull(),
    permissionId: text("permission_id").notNull(),
    createdAt: tsNow("created_at"),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ createdAt: true });
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Users - Multi-user support
export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"), // For non-Owner users
  roleId: text("role_id").notNull(),
  isActive: integer("is_active").notNull().default(1), // 0 = suspended, 1 = active
  lastLogin: integer("last_login", { mode: "timestamp" }),
  createdAt: tsNow("created_at"),
  createdBy: text("created_by"), // User ID who created this user
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  lastLogin: true,
}).extend({
  email: z.string().email(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User Settings - Now linked to a user
export const userSettings = sqliteTable("user_settings", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id"), // Nullable for backward compatibility, will link to Owner
  theme: text("theme").notNull().default("dark"), // 'dark' | 'light'
  colorPalette: text("color_palette").notNull().default("azure"), // azure | emerald | violet | amber | slate
  language: text("language").notNull().default("en"), // 'en' | 'ar'
  viewMode: text("view_mode").notNull().default("pro"), // 'pro' | 'lite'
  fontSize: text("font_size").notNull().default("medium"), // 'small' | 'medium' | 'large'
  autoReinvest: integer("auto_reinvest").notNull().default(1), // 0 = no, 1 = yes
  targetCapital2040: numeric("target_capital_2040"),
  currency: text("currency").notNull().default("SAR"),
  securityEnabled: integer("security_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  pinHash: text("pin_hash"), // Hashed PIN for Owner authentication (backward compatibility)
  biometricEnabled: integer("biometric_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  biometricCredentialId: text("biometric_credential_id"), // WebAuthn credential ID
  collapsedSections: text("collapsed_sections"), // JSON array of collapsed section IDs
  alertsEnabled: integer("alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
  dataEntryToken: text("data_entry_token"), // Secure token for data entry access
  alertDaysBefore: integer("alert_days_before").notNull().default(7), // Days before cashflow due date to alert
  latePaymentAlertsEnabled: integer("late_payment_alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
  dashboardLayout: text("dashboard_layout"), // JSON string storing widget layouts (react-grid-layout format)
  hiddenWidgets: text("hidden_widgets"), // JSON array of hidden widget IDs
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// User Platforms - Platform-scoped permissions
export const userPlatforms = sqliteTable("user_platforms", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  platformId: text("platform_id").notNull(),
  accessLevel: text("access_level").notNull().default("full"), // 'full' | 'read_only' | 'no_access'
  createdAt: tsNow("created_at"),
});

export const insertUserPlatformSchema = createInsertSchema(userPlatforms).omit({ id: true, createdAt: true });
export type InsertUserPlatform = z.infer<typeof insertUserPlatformSchema>;
export type UserPlatform = typeof userPlatforms.$inferSelect;

// Temporary Roles - Time-limited role assignments
export const temporaryRoles = sqliteTable("temporary_roles", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  userId: text("user_id").notNull(),
  roleId: text("role_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  reason: text("reason"),
  createdBy: text("created_by").notNull(),
  createdAt: tsNow("created_at"),
  isActive: integer("is_active").notNull().default(1), // 0 = expired/revoked, 1 = active
});

export const insertTemporaryRoleSchema = createInsertSchema(temporaryRoles).omit({ 
  id: true, 
  createdAt: true,
  isActive: true,
}).extend({
  expiresAt: z.coerce.date(),
});
export type InsertTemporaryRole = z.infer<typeof insertTemporaryRoleSchema>;
export type TemporaryRole = typeof temporaryRoles.$inferSelect;

// Audit Log - Track all sensitive actions
export const auditLog = sqliteTable("audit_log", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  actorId: text("actor_id"), // User who performed the action (null for system actions)
  actionType: text("action_type").notNull(), // 'view' | 'create' | 'update' | 'delete' | 'export' | 'impersonate' | 'login' | 'logout'
  targetType: text("target_type"), // 'investment' | 'user' | 'role' | 'platform' | 'settings'
  targetId: text("target_id"), // ID of the affected entity
  details: text("details"), // JSON string with additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ 
  id: true, 
  timestamp: true 
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Export Requests - Approval workflow for exports
export const exportRequests = sqliteTable("export_requests", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  requesterId: text("requester_id").notNull(),
  exportType: text("export_type").notNull(), // 'investments' | 'cashflows' | 'analytics' | 'full'
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  rejectionReason: text("rejection_reason"),
  createdAt: tsNow("created_at"),
});

export const insertExportRequestSchema = createInsertSchema(exportRequests).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
});
export type InsertExportRequest = z.infer<typeof insertExportRequestSchema>;
export type ExportRequest = typeof exportRequests.$inferSelect;

// View Requests - Request access to masked/hidden fields
export const viewRequests = sqliteTable("view_requests", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  requesterId: text("requester_id").notNull(),
  fieldType: text("field_type").notNull(), // 'amount' | 'irr' | 'sensitive_data'
  targetType: text("target_type"), // 'investment' | 'cashflow' | 'analytics'
  targetId: text("target_id"),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }), // Temporary access expiry
  createdAt: tsNow("created_at"),
});

export const insertViewRequestSchema = createInsertSchema(viewRequests).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  expiresAt: z.coerce.date().optional().nullable(),
});
export type InsertViewRequest = z.infer<typeof insertViewRequestSchema>;
export type ViewRequest = typeof viewRequests.$inferSelect;

// Impersonation Sessions - Track impersonation sessions
export const impersonationSessions = sqliteTable("impersonation_sessions", {
  id: text("id")
    .primaryKey()
    .default(sql`(lower(hex(randomblob(16))))`),
  ownerId: text("owner_id").notNull(), // The owner doing the impersonation
  targetUserId: text("target_user_id").notNull(), // The user being impersonated
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  isActive: integer("is_active").notNull().default(1), // 0 = ended, 1 = active
  ipAddress: text("ip_address"),
});

export const insertImpersonationSessionSchema = createInsertSchema(impersonationSessions).omit({ 
  id: true, 
  startedAt: true,
  endedAt: true,
  isActive: true,
});
export type InsertImpersonationSession = z.infer<typeof insertImpersonationSessionSchema>;
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;

// Extended types for frontend use
export type InvestmentWithPlatform = Investment & {
  platform: Platform;
  customDistributions?: CustomDistribution[];
};

export type CashflowWithInvestment = Cashflow & {
  investment: InvestmentWithPlatform;
};

export type PortfolioStats = {
  /** Principal in open positions (قائمة): active + late + defaulted */
  totalCapital: number;
  /** Realized gains: profit received + completed-without-cashflow fallback */
  totalReturns: number;
  /** Same as totalReturns — explicit label for exports/UI */
  realizedGains: number;
  /** totalCapital + totalCashBalance */
  totalAum: number;
  averageIrr: number;
  /** Live positions count (قائمة) — active + late + defaulted */
  activeInvestments: number;
  completedInvestmentsCount: number;
  pendingInvestmentsCount: number;
  /** status === active only */
  strictActiveCount: number;
  /** Sum of received principal cashflows */
  principalRepaid: number;
  /** Expected + upcoming cashflows (profit + principal) */
  pendingSettlements: number;
  upcomingCashflow: number;
  progressTo2040: number;
  totalCashBalance: number;
  averageDuration: number;
  distressedCount: number;
};

export type PlatformCashBreakdown = {
  platformId: string;
  platformName: string;
  totalReceived: number;
  reinvested: number;
  available: number;
};

export type AnalyticsData = {
  monthlyReturns: Array<{ month: string; amount: number }>;
  platformAllocation: Array<{ platform: string; amount: number; percentage: number }>;
  performanceVsTarget: Array<{ year: number; actual: number; target: number }>;
};

// Extended types for permissions system
export type UserWithRole = User & {
  role: Role;
  settings?: UserSettings;
  temporaryRole?: TemporaryRole;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export type UserWithFullDetails = User & {
  role: RoleWithPermissions;
  settings?: UserSettings;
  platforms: UserPlatform[];
  temporaryRole?: TemporaryRole;
};

export type AuditLogWithActor = AuditLog & {
  actor?: User;
};

export type ExportRequestWithUser = ExportRequest & {
  requester: User;
  approver?: User;
};

export type ViewRequestWithUser = ViewRequest & {
  requester: User;
  approver?: User;
};

// Relations
export const platformsRelations = relations(platforms, ({ many }) => ({
  investments: many(investments),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [investments.platformId],
    references: [platforms.id],
  }),
  cashflows: many(cashflows),
  customDistributions: many(customDistributions),
  alerts: many(alerts),
}));

export const cashflowsRelations = relations(cashflows, ({ one }) => ({
  investment: one(investments, {
    fields: [cashflows.investmentId],
    references: [investments.id],
  }),
}));

export const customDistributionsRelations = relations(customDistributions, ({ one }) => ({
  investment: one(investments, {
    fields: [customDistributions.investmentId],
    references: [investments.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  investment: one(investments, {
    fields: [alerts.investmentId],
    references: [investments.id],
  }),
}));

export const savedScenariosRelations = relations(savedScenarios, ({ one }) => ({
  user: one(users, {
    fields: [savedScenarios.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
  temporaryRoles: many(temporaryRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  userPlatforms: many(userPlatforms),
  temporaryRoles: many(temporaryRoles),
  auditLogs: many(auditLog),
  exportRequests: many(exportRequests),
  viewRequests: many(viewRequests),
  savedScenarios: many(savedScenarios),
}));

export const userPlatformsRelations = relations(userPlatforms, ({ one }) => ({
  user: one(users, {
    fields: [userPlatforms.userId],
    references: [users.id],
  }),
  platform: one(platforms, {
    fields: [userPlatforms.platformId],
    references: [platforms.id],
  }),
}));

export const temporaryRolesRelations = relations(temporaryRoles, ({ one }) => ({
  user: one(users, {
    fields: [temporaryRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [temporaryRoles.roleId],
    references: [roles.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, {
    fields: [auditLog.actorId],
    references: [users.id],
  }),
}));

export const exportRequestsRelations = relations(exportRequests, ({ one }) => ({
  requester: one(users, {
    fields: [exportRequests.requesterId],
    references: [users.id],
  }),
}));

export const viewRequestsRelations = relations(viewRequests, ({ one }) => ({
  requester: one(users, {
    fields: [viewRequests.requesterId],
    references: [users.id],
  }),
}));
