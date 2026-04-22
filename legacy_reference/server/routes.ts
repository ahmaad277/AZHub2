import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { withDataEntryToken, blockDataEntry } from "./data-entry-middleware";
import { detectMappingHints, parseManafaPdfLines, parseOcrLines } from "./import-helpers";
import {
  insertPlatformSchema,
  updatePlatformSchema,
  insertInvestmentSchema,
  insertCashflowSchema,
  insertAlertSchema,
  insertUserSettingsSchema,
  insertCashTransactionSchema,
  insertSavedScenarioSchema,
  insertPortfolioSnapshotSchema,
  insertPortfolioHistorySchema,
  apiCustomDistributionSchema,
  type ApiCustomDistribution,
} from "@shared/schema";
import { generateCashflows, type DistributionFrequency, type ProfitPaymentStructure } from "@shared/cashflow-generator";
import { appendDebugSessionLog, appendDebugSessionFileOnly } from "./debug-session-log";

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
type IdempotencyRecord =
  | { state: "inflight"; createdAt: number }
  | { state: "done"; createdAt: number; statusCode: number; body: unknown };

const idempotencyStore = new Map<string, IdempotencyRecord>();

function cleanupIdempotencyStore(): void {
  const now = Date.now();
  idempotencyStore.forEach((record, key) => {
    if (now - record.createdAt > IDEMPOTENCY_TTL_MS) {
      idempotencyStore.delete(key);
    }
  });
}

function getIdempotencyScopeKey(req: Request, scope: string): string | null {
  const requestKey = String(req.header("x-idempotency-key") || "").trim();
  if (!requestKey) return null;
  const actorKey = String(req.header("x-data-entry-token") || "owner");
  return `${scope}:${actorKey}:${requestKey}`;
}

function beginIdempotentRequest(
  req: Request,
  res: Response,
  scope: string,
): { key: string | null; shouldProceed: boolean } {
  cleanupIdempotencyStore();
  const key = getIdempotencyScopeKey(req, scope);
  if (!key) return { key: null, shouldProceed: true };

  const existing = idempotencyStore.get(key);
  if (!existing) {
    idempotencyStore.set(key, { state: "inflight", createdAt: Date.now() });
    return { key, shouldProceed: true };
  }

  if (existing.state === "done") {
    res.status(existing.statusCode).json(existing.body);
    return { key, shouldProceed: false };
  }

  res.status(409).json({ error: "Duplicate request in progress. Retry shortly." });
  return { key, shouldProceed: false };
}

function finalizeIdempotentRequest(key: string | null, statusCode: number, body: unknown): void {
  if (!key) return;
  idempotencyStore.set(key, {
    state: "done",
    createdAt: Date.now(),
    statusCode,
    body,
  });
}

function clearIdempotentRequest(key: string | null): void {
  if (!key) return;
  const record = idempotencyStore.get(key);
  if (record?.state === "inflight") {
    idempotencyStore.delete(key);
  }
}

function toUtcDateOnlyTimestamp(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isWithinInclusiveDateRange(date: Date, start: Date, end: Date): boolean {
  const value = toUtcDateOnlyTimestamp(date);
  const min = toUtcDateOnlyTimestamp(start);
  const max = toUtcDateOnlyTimestamp(end);
  return value >= min && value <= max;
}

// API schema that accepts date strings and coerces to Date objects with validation
const apiInvestmentSchema = insertInvestmentSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(), // Optional if durationMonths provided
  durationMonths: z.number().int().positive().optional(), // Optional if endDate provided
  customDistributions: z.array(apiCustomDistributionSchema).optional(),
}).superRefine((data, ctx) => {
  // If frequency is custom, require customDistributions array
  if (data.distributionFrequency === 'custom') {
    if (!data.customDistributions || data.customDistributions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom distribution schedule is required when frequency is 'custom'",
        path: ['customDistributions'],
      });
    }
    
    // Validate each distribution
    data.customDistributions?.forEach((dist, idx) => {
      const amount = typeof dist.amount === 'string' ? parseFloat(dist.amount) : dist.amount;
      if (amount <= 0 || isNaN(amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be positive",
          path: ['customDistributions', idx, 'amount'],
        });
      }
      
      // Validate using inclusive UTC date-only boundaries to avoid timezone edge cases.
      if (data.endDate && !isWithinInclusiveDateRange(dist.dueDate, data.startDate, data.endDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due date must be within investment period",
          path: ['customDistributions', idx, 'dueDate'],
        });
      }
    });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Match non-production dev/staging; strict `=== "development"` misses unset NODE_ENV.
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/_debug/session-log", (req, res) => {
      try {
        const raw = req.body;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
          return res.status(400).end();
        }
        appendDebugSessionFileOnly(raw as Record<string, unknown>);
        return res.status(204).end();
      } catch {
        return res.status(500).end();
      }
    });
  }

  const importEntitySchema = z.enum(["investment", "cashflow", "cash_transaction"]);

  const importPreviewSchema = z.object({
    sourceType: z.enum(["csv", "xlsx"]),
    entityType: importEntitySchema.default("investment"),
    rows: z.array(z.record(z.any())).min(1),
  });

  const ocrPreviewSchema = z.object({
    sourceType: z.literal("ocr"),
    entityType: importEntitySchema.default("investment"),
    lines: z.array(z.string()).min(1),
  });

  const pdfPreviewSchema = z.object({
    sourceType: z.literal("pdf"),
    entityType: importEntitySchema.default("investment"),
    lines: z.array(z.string()).min(1),
    platformId: z.string().optional(),
    platformName: z.string().optional(),
    sectionFilter: z.enum(["all", "active", "closed"]).default("all"),
  });

  // Health check endpoint for Railway
  app.get("/health", async (_req, res) => {
    try {
      // Basic health check - test database connection
      const dbHealth = await storage.checkDatabaseHealth();
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: dbHealth ? "connected" : "disconnected",
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get snapshots
  app.get("/api/snapshots", async (_req, res) => {
    try {
      const snapshots = await storage.getSnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error("Failed to fetch snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  // Cleanup snapshots
  app.post("/api/snapshots/cleanup", async (req, res) => {
    try {
      const { daysToKeep = 30 } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Get all snapshots
      const snapshots = await storage.getSnapshots();

      // Filter old snapshots
      const oldSnapshots = snapshots.filter(snapshot =>
        new Date(snapshot.createdAt) < cutoffDate
      );

      // Delete old snapshots
      let deletedCount = 0;
      for (const snapshot of oldSnapshots) {
        await storage.deleteSnapshot(snapshot.id);
        deletedCount++;
      }

      res.json({
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} old snapshots`
      });
    } catch (error) {
      console.error("Snapshot cleanup error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to cleanup snapshots"
      });
    }
  });

  // Platforms
  app.get("/api/platforms", async (_req, res) => {
    try {
      const platforms = await storage.getPlatforms();
      res.json(platforms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch platforms" });
    }
  });

  app.post("/api/platforms", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const data = insertPlatformSchema.parse(req.body);
      const platform = await storage.createPlatform(data);
      res.status(201).json(platform);
    } catch (error) {
      res.status(400).json({ error: "Invalid platform data" });
    }
  });

  app.put("/api/platforms/:id", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { id } = req.params;
      const data = updatePlatformSchema.parse(req.body);
      const platform = await storage.updatePlatform(id, data);
      
      if (!platform) {
        return res.status(404).json({ error: "Platform not found" });
      }

      res.json(platform);
    } catch (error) {
      res.status(400).json({ error: "Invalid platform data" });
    }
  });

  app.delete("/api/platforms/:id", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePlatform(id);
      
      if (!success) {
        return res.status(404).json({ error: "Platform not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Platform deletion error:", error);
      if (error.message?.includes('Cannot delete platform')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete platform" });
    }
  });

  // Investments (with data-entry token support)
  app.get("/api/investments", withDataEntryToken, async (_req, res) => {
    try {
      const investments = await storage.getInvestments();
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.post("/api/investments", withDataEntryToken, async (req, res) => {
    const idempotency = beginIdempotentRequest(req, res, "POST:/api/investments");
    if (!idempotency.shouldProceed) return;
    try {
      // #region agent log
      appendDebugSessionLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "server/routes.ts:POST /api/investments",
        message: "received create investment request",
        data: {
          bodyKeys: Object.keys(req.body || {}),
          distributionFrequency: req.body?.distributionFrequency,
          startDate: req.body?.startDate,
          endDate: req.body?.endDate,
          durationMonths: req.body?.durationMonths,
          customDistributionsCount: Array.isArray(req.body?.customDistributions)
            ? req.body.customDistributions.length
            : 0,
        },
      });
      // #endregion
      const data = apiInvestmentSchema.parse(req.body);
      
      // Extract customDistributions if provided
      const { customDistributions, durationMonths: clientDurationMonths, ...rawInvestmentData } = data;
      
      // Auto-calculate financial fields (durationMonths, totalExpectedProfit)
      const { validateInvestmentFinancials, applyPlatformFeeToProfit } = await import("@shared/profit-calculator");
      const validatedFinancials = validateInvestmentFinancials({
        faceValue: rawInvestmentData.faceValue,
        expectedIrr: rawInvestmentData.expectedIrr,
        startDate: rawInvestmentData.startDate,
        endDate: rawInvestmentData.endDate,
        durationMonths: clientDurationMonths,
        totalExpectedProfit: rawInvestmentData.totalExpectedProfit,
      });

      const platform = (await storage.getPlatforms()).find(p => p.id === rawInvestmentData.platformId);
      const shouldDeductPlatformFee =
        platform?.deductFees === 1 &&
        Number(platform?.feePercentage || 0) > 0 &&
        rawInvestmentData.excludePlatformFees !== 1;
      const requestedProfit = rawInvestmentData.totalExpectedProfit;
      const shouldApplyAutoFeeAdjustment = requestedProfit === undefined || requestedProfit === null || requestedProfit === 0;
      
      // Merge validated fields with rest of investment data
      const investmentData = {
        ...rawInvestmentData,
        ...validatedFinancials,
        totalExpectedProfit: shouldApplyAutoFeeAdjustment
          ? applyPlatformFeeToProfit(
              validatedFinancials.totalExpectedProfit,
              Number(platform?.feePercentage || 0),
              shouldDeductPlatformFee
            )
          : validatedFinancials.totalExpectedProfit,
      };
      
      // Create investment with custom distributions
      const investment = await storage.createInvestment(investmentData, customDistributions);
      finalizeIdempotentRequest(idempotency.key, 201, investment);
      res.status(201).json(investment);
    } catch (error: any) {
      // #region agent log
      appendDebugSessionLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "server/routes.ts:POST /api/investments catch",
        message: "create investment rejected",
        data: { errorMessage: error?.message || "unknown" },
      });
      // #endregion
      clearIdempotentRequest(idempotency.key);
      console.error("Investment creation error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  });

  app.patch("/api/investments/:id", withDataEntryToken, async (req, res) => {
    try {
      const { id } = req.params;
      // #region agent log
      appendDebugSessionLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "server/routes.ts:PATCH /api/investments/:id",
        message: "received update investment request",
        data: {
          id,
          bodyKeys: Object.keys(req.body || {}),
          distributionFrequency: req.body?.distributionFrequency,
          startDate: req.body?.startDate,
          endDate: req.body?.endDate,
          durationMonths: req.body?.durationMonths,
          customDistributionsCount: Array.isArray(req.body?.customDistributions)
            ? req.body.customDistributions.length
            : 0,
        },
      });
      // #endregion
      
      // Create a partial schema with validation
      const partialInvestmentSchema = insertInvestmentSchema.extend({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        durationMonths: z.number().int().positive().optional(),
        customDistributions: z.array(apiCustomDistributionSchema).optional(),
      }).partial().superRefine((data, ctx) => {
        // If changing frequency to custom, require customDistributions
        if (data.distributionFrequency === 'custom' && (!data.customDistributions || data.customDistributions.length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Custom distribution schedule is required when changing frequency to 'custom'",
            path: ['customDistributions'],
          });
        }
        
        // If customDistributions provided, require dates for validation
        if (data.customDistributions && data.customDistributions.length > 0) {
          if (!data.startDate || !data.endDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "startDate and endDate are required when updating custom distributions",
              path: ['customDistributions'],
            });
            return; // Skip further validation if dates missing
          }
          
          // Validate each distribution
          data.customDistributions.forEach((dist, idx) => {
            const amount = typeof dist.amount === 'string' ? parseFloat(dist.amount) : dist.amount;
            if (amount <= 0 || isNaN(amount)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Amount must be positive",
                path: ['customDistributions', idx, 'amount'],
              });
            }
            
            // Validate using inclusive UTC date-only boundaries to avoid timezone edge cases.
            if (!isWithinInclusiveDateRange(dist.dueDate, data.startDate!, data.endDate!)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Due date must be within investment period",
                path: ['customDistributions', idx, 'dueDate'],
              });
            }
          });
        }
      });
      
      const data = partialInvestmentSchema.parse(req.body);
      
      // Extract customDistributions if provided
      const { customDistributions, durationMonths: clientDurationMonths, ...rawInvestmentData } = data;
      
      // If financial fields are being updated, recalculate them
      let investmentData = rawInvestmentData;
      if (
        rawInvestmentData.faceValue ||
        rawInvestmentData.expectedIrr ||
        rawInvestmentData.startDate ||
        rawInvestmentData.endDate ||
        clientDurationMonths ||
        rawInvestmentData.excludePlatformFees !== undefined ||
        rawInvestmentData.platformId !== undefined
      ) {
        const { validateInvestmentFinancials, applyPlatformFeeToProfit } = await import("@shared/profit-calculator");
        
        // Fetch current investment for defaults
        const currentInvestment = await storage.getInvestment(id);
        if (!currentInvestment) {
          return res.status(404).json({ error: "Investment not found" });
        }
        
        const validatedFinancials = validateInvestmentFinancials({
          faceValue: rawInvestmentData.faceValue ?? parseFloat(currentInvestment.faceValue),
          expectedIrr: rawInvestmentData.expectedIrr ?? parseFloat(currentInvestment.expectedIrr),
          startDate:
            rawInvestmentData.startDate ??
            (currentInvestment.startDate ? new Date(currentInvestment.startDate) : new Date()),
          endDate: rawInvestmentData.endDate,
          durationMonths: clientDurationMonths ?? currentInvestment.durationMonths,
          totalExpectedProfit: rawInvestmentData.totalExpectedProfit,
        });

        const platformId = rawInvestmentData.platformId ?? currentInvestment.platformId;
        const platform = (await storage.getPlatforms()).find(p => p.id === platformId);
        const excludePlatformFees = rawInvestmentData.excludePlatformFees ?? currentInvestment.excludePlatformFees ?? 0;
        const shouldDeductPlatformFee =
          platform?.deductFees === 1 &&
          Number(platform?.feePercentage || 0) > 0 &&
          excludePlatformFees !== 1;
        const requestedProfit = rawInvestmentData.totalExpectedProfit;
        const shouldApplyAutoFeeAdjustment = requestedProfit === undefined || requestedProfit === null || requestedProfit === 0;
        
        investmentData = {
          ...rawInvestmentData,
          ...validatedFinancials,
          totalExpectedProfit: shouldApplyAutoFeeAdjustment
            ? applyPlatformFeeToProfit(
                validatedFinancials.totalExpectedProfit,
                Number(platform?.feePercentage || 0),
                shouldDeductPlatformFee
              )
            : validatedFinancials.totalExpectedProfit,
        };
      }
      
      // Check if status is changing to 'completed'
      const currentInvestment = investmentData.status 
        ? await storage.getInvestment(id) 
        : null;
      
      const isCompletingInvestment = currentInvestment 
        && currentInvestment.status !== 'completed' 
        && investmentData.status === 'completed';
      
      let investment = await storage.updateInvestment(id, investmentData, customDistributions);
      
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }

      // If status changed to 'completed', automatically mark all pending cashflows as received
      if (isCompletingInvestment) {
        try {
          await storage.completeAllPendingPayments(
            id,
            new Date(), // fallback date (not used when useDueDates=true)
            { 
              clearLateStatus: true, // Clear late status when marking as completed
              useDueDates: true // Use each cashflow's dueDate as receivedDate
            }
          );
          
          // Refetch investment with platform to get the latest state after completing payments
          const allInvestments = await storage.getInvestments();
          const refreshedInvestment = allInvestments.find(inv => inv.id === id);
          if (refreshedInvestment) {
            investment = refreshedInvestment;
          }
        } catch (error) {
          console.error("Error completing pending payments:", error);
          return res.status(500).json({
            error: "Investment was updated but auto-completion of pending payments failed",
          });
        }
      }

      res.json(investment);
    } catch (error: any) {
      // #region agent log
      appendDebugSessionLog({
        runId: "initial",
        hypothesisId: "H4",
        location: "server/routes.ts:PATCH /api/investments/:id catch",
        message: "update investment rejected",
        data: { errorMessage: error?.message || "unknown" },
      });
      // #endregion
      console.error("Investment update error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  });

  app.delete("/api/investments/:id", withDataEntryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteInvestment(id);
      
      if (!success) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Investment deletion error:", error);
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Complete all pending payments for an investment
  app.post("/api/investments/:id/complete-all-payments", withDataEntryToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Schema for bulk completion with late status management
      const bulkCompleteSchema = z.object({
        receivedDate: z.coerce.date().optional(),
        clearLateStatus: z.boolean().optional(),
        updateLateInfo: z.object({
          lateDays: z.number().int().min(1),
        }).strict().optional(),
      }).refine(
        (data) => {
          // Reject contradictory payloads
          if (data.clearLateStatus && data.updateLateInfo) {
            return false;
          }
          return true;
        },
        {
          message: "Cannot both clear late status and update late info simultaneously",
        }
      );
      
      const { receivedDate, clearLateStatus, updateLateInfo } = bulkCompleteSchema.parse(req.body);
      
      const result = await storage.completeAllPendingPayments(
        id,
        receivedDate || new Date(),
        { clearLateStatus, updateLateInfo }
      );
      
      if (!result) {
        return res.status(404).json({ error: "Investment not found or no pending payments" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Bulk completion error:", error);
      res.status(400).json({ error: error.message || "Failed to complete payments" });
    }
  });

  // Preview cashflows for investment (before creation)
  app.post("/api/investments/preview-cashflows", withDataEntryToken, async (req, res) => {
    try {
      const previewSchema = z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        faceValue: z.coerce.number().positive(),
        totalExpectedProfit: z.coerce.number().nonnegative(),
        distributionFrequency: z.enum(['monthly', 'quarterly', 'semi_annually', 'annually', 'at_maturity']),
        profitPaymentStructure: z.enum(['periodic', 'at_maturity']).default('periodic'),
      });

      const data = previewSchema.parse(req.body);
      
      const previewCashflows = generateCashflows({
        startDate: data.startDate,
        endDate: data.endDate,
        faceValue: data.faceValue,
        totalExpectedProfit: data.totalExpectedProfit,
        distributionFrequency: data.distributionFrequency as DistributionFrequency,
        profitPaymentStructure: data.profitPaymentStructure as ProfitPaymentStructure,
      });

      res.json(previewCashflows);
    } catch (error: any) {
      console.error("Cashflow preview error:", error);
      res.status(400).json({ error: error.message || "Invalid preview parameters" });
    }
  });

  // Cashflows
  app.get("/api/cashflows", withDataEntryToken, async (_req, res) => {
    try {
      const cashflows = await storage.getCashflows();
      res.json(cashflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashflows" });
    }
  });

  app.post("/api/cashflows", withDataEntryToken, async (req, res) => {
    const idempotency = beginIdempotentRequest(req, res, "POST:/api/cashflows");
    if (!idempotency.shouldProceed) return;
    try {
      const data = insertCashflowSchema.parse(req.body);
      const cashflow = await storage.createCashflow(data);
      finalizeIdempotentRequest(idempotency.key, 201, cashflow);
      res.status(201).json(cashflow);
    } catch (error: any) {
      clearIdempotentRequest(idempotency.key);
      res.status(400).json({ error: error.message || "Invalid cashflow data" });
    }
  });

  app.patch("/api/cashflows/:id", withDataEntryToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Extended schema to support late status management and receivedDate
      const extendedCashflowSchema = insertCashflowSchema.partial().extend({
        receivedDate: z.coerce.date().nullable().optional(),
        clearLateStatus: z.boolean().optional(),
        updateLateInfo: z.object({
          lateDays: z.number().int().min(1),
        }).strict().optional(), // Require lateDays if updateLateInfo is provided
      }).refine(
        (data) => {
          // Reject contradictory payloads (both clearLateStatus and updateLateInfo)
          if (data.clearLateStatus && data.updateLateInfo) {
            return false;
          }
          return true;
        },
        {
          message: "Cannot both clear late status and update late info simultaneously",
        }
      );
      
      const { clearLateStatus, updateLateInfo, ...cashflowData } = extendedCashflowSchema.parse(req.body);
      
      // Update the cashflow
      const cashflow = await storage.updateCashflow(id, cashflowData);
      
      if (!cashflow) {
        return res.status(404).json({ error: "Cashflow not found" });
      }
      
      // Handle late status management if payment is being marked as received
      if (cashflowData.status === "received" && cashflowData.receivedDate) {
        // Get the investment to check its status
        const investment = await storage.getInvestment(cashflow.investmentId);
        
        if (investment && (investment.status === "late" || investment.status === "defaulted")) {
          // Check if user wants to clear late status
          if (clearLateStatus === true) {
            // Clear late/defaulted dates
            await storage.updateInvestmentStatus(
              cashflow.investmentId,
              "active", // Will be recalculated by status checker
              null,
              null
            );
          } else if (updateLateInfo?.lateDays) {
            // Update late date to reflect custom late days
            const now = new Date();
            const customLateDate = new Date(now.getTime() - (updateLateInfo.lateDays * 24 * 60 * 60 * 1000));
            
            // Keep defaultedDate if it exists, just update lateDate
            await storage.updateInvestmentStatus(
              cashflow.investmentId,
              investment.status,
              customLateDate,
              investment.defaultedDate ? new Date(investment.defaultedDate) : null
            );
          }
          // If neither option is specified, keep existing late/defaulted status
        }
      }

      res.json(cashflow);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid cashflow data" });
    }
  });

  app.delete("/api/cashflows/:id", withDataEntryToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCashflow(id);
      
      if (!success) {
        return res.status(404).json({ error: "Cashflow not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Cashflow deletion error:", error);
      res.status(500).json({ error: "Failed to delete cashflow" });
    }
  });

  // Alerts
  app.get("/api/alerts", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/read", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.markAlertAsRead(id);
      
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  app.post("/api/alerts/generate", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      
      if (!settings || !settings.alertsEnabled) {
        return res.json({ message: "Alerts disabled", generatedCount: 0 });
      }

      const allCashflows = await storage.getCashflows();
      const allInvestments = await storage.getInvestments();
      const cashflows = allCashflows.map(cf => {
        const investment = allInvestments.find(inv => inv.id === cf.investmentId);
        return { ...cf, investment };
      }).filter(cf => cf.investment);
      const alerts = await storage.getAlerts();
      const now = new Date();
      const generatedAlerts: any[] = [];

      for (const cashflow of cashflows) {
        if (cashflow.status === 'received' || !cashflow.dueDate || !cashflow.investment) continue;

        const dueDate = new Date(cashflow.dueDate);
        const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const alertKey = `cashflow-${cashflow.id}`;
        const existingAlert = alerts.find((a) => a.message.includes(alertKey));
        
        if (existingAlert) continue;

        if (daysDiff < 0 && settings.latePaymentAlertsEnabled) {
          const alert = await storage.createAlert({
            type: 'distribution',
            title: 'Late Payment Alert',
            message: `${alertKey}: ${cashflow.type} payment for ${cashflow.investment.name} is overdue by ${Math.abs(daysDiff)} days`,
            investmentId: cashflow.investmentId,
            severity: 'error',
            read: 0,
          });
          generatedAlerts.push(alert);
        }
        else if (daysDiff >= 0 && daysDiff <= settings.alertDaysBefore) {
          const alert = await storage.createAlert({
            type: 'distribution',
            title: 'Upcoming Payment',
            message: `${alertKey}: ${cashflow.type} payment for ${cashflow.investment.name} is due in ${daysDiff} days`,
            investmentId: cashflow.investmentId,
            severity: daysDiff <= 3 ? 'warning' : 'info',
            read: 0,
          });
          generatedAlerts.push(alert);
        }
      }

      res.json({ 
        message: "Alerts generated successfully", 
        generatedCount: generatedAlerts.length,
        alerts: generatedAlerts 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate alerts" });
    }
  });

  // Data Quality
  app.get("/api/data-quality/issues", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const issues = await storage.getDataQualityIssues();
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch data quality issues" });
    }
  });

  app.post("/api/data-quality/scan", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      await storage.clearDataQualityIssues();

      const allInvestments = await storage.getInvestments();
      const allCashflows = await storage.getCashflows();
      const balanceData = await storage.getCashBalance();

      let createdCount = 0;

      for (const inv of allInvestments) {
        const startDate = inv.startDate ? new Date(inv.startDate) : null;
        const endDate = inv.endDate ? new Date(inv.endDate) : null;

        if (startDate && endDate && endDate < startDate) {
          await storage.createDataQualityIssue({
            entityType: "investment",
            entityId: inv.id,
            issueType: "invalid_date_range",
            severity: "error",
            message: `Investment "${inv.name}" has end date earlier than start date`,
            suggestedFix: "Edit investment dates to a valid range",
            status: "open",
          });
          createdCount += 1;
        }

        if (inv.fundedFromCash === 1) {
          const byPlatformBalance = balanceData.byPlatform[inv.platformId] ?? 0;
          const required = Number.parseFloat(String(inv.faceValue || 0));
          if (required > byPlatformBalance) {
            await storage.createDataQualityIssue({
              entityType: "investment",
              entityId: inv.id,
              issueType: "insufficient_platform_cash",
              severity: "warning",
              message: `Investment "${inv.name}" exceeds platform cash balance`,
              suggestedFix: "Adjust funding source or investment amount",
              status: "open",
            });
            createdCount += 1;
          }
        }
      }

      for (const cf of allCashflows) {
        const amount = Number.parseFloat(String(cf.amount || 0));
        if (Number.isNaN(amount) || amount <= 0) {
          await storage.createDataQualityIssue({
            entityType: "cashflow",
            entityId: cf.id,
            issueType: "invalid_cashflow_amount",
            severity: "error",
            message: `Cashflow "${cf.id}" has invalid amount`,
            suggestedFix: "Update amount to a valid positive number",
            status: "open",
          });
          createdCount += 1;
        }
      }

      const issues = await storage.getDataQualityIssues();
      res.json({ scanned: true, issues, createdCount });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to scan data quality issues" });
    }
  });

  app.patch("/api/data-quality/issues/:id/resolve", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const issue = await storage.resolveDataQualityIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }
      res.json(issue);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to resolve issue" });
    }
  });

  app.post("/api/data-quality/issues/:id/apply-fix", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const issue = await storage.resolveDataQualityIssue(req.params.id);
      if (!issue) {
        return res.status(404).json({ error: "Issue not found" });
      }
      res.json({ applied: true, issue });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to apply fix" });
    }
  });

  // Import Center
  app.post("/api/import/preview", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const parsed = importPreviewSchema.parse(req.body);
      const sampleRow = parsed.rows[0] || {};
      const detectedColumns = detectMappingHints(sampleRow);
      const summary = {
        totalRows: parsed.rows.length,
        sample: parsed.rows.slice(0, 5),
        sourceType: parsed.sourceType,
        entityType: parsed.entityType,
        mappingHints: detectedColumns,
      };

      const job = await storage.createImportJob({
        sourceType: parsed.sourceType,
        entityType: parsed.entityType,
        status: "previewed",
        payload: parsed.rows.map((row) => ({ ...row, entityType: parsed.entityType })),
        summary,
        errors: [],
        committedCount: 0,
      });

      res.json({ jobId: job.id, summary });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid import preview payload" });
    }
  });

  app.post("/api/import/ocr/preview", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const parsed = ocrPreviewSchema.parse(req.body);

      const extractedRows = parseOcrLines(parsed.lines, parsed.entityType);

      const summary = {
        totalRows: extractedRows.length,
        sample: extractedRows.slice(0, 5),
        sourceType: parsed.sourceType,
        entityType: parsed.entityType,
        mappingHints: detectMappingHints(extractedRows[0] as Record<string, unknown> | undefined),
      };

      const job = await storage.createImportJob({
        sourceType: "ocr",
        entityType: parsed.entityType,
        status: "previewed",
        payload: extractedRows,
        summary,
        errors: [],
        committedCount: 0,
      });

      res.json({ jobId: job.id, summary });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid OCR preview payload" });
    }
  });

  app.post("/api/import/pdf/preview", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const parsed = pdfPreviewSchema.parse(req.body);

      const parsedResult = parseManafaPdfLines(parsed.lines, {
        platformId: parsed.platformId,
        platformName: parsed.platformName,
      });

      const filteredRows = parsedResult.rows.filter((row) => {
        if (parsed.sectionFilter === "all") return true;
        const section = String(row.sourceSection || "unknown");
        if (parsed.sectionFilter === "active") return section === "active";
        if (parsed.sectionFilter === "closed") return section === "closed";
        return true;
      });

      if (filteredRows.length === 0) {
        return res.status(400).json({
          error:
            parsed.sectionFilter === "all"
              ? "No investment rows were detected from PDF content"
              : `No ${parsed.sectionFilter} investment rows were detected from PDF content`,
          warnings: [
            ...parsedResult.warnings,
            `Applied section filter: ${parsed.sectionFilter}`,
          ],
        });
      }

      const sampleRow = filteredRows[0] || {};
      const detectedColumns = detectMappingHints(sampleRow as Record<string, unknown>);
      const summary = {
        totalRows: filteredRows.length,
        sourceRows: parsedResult.rows.length,
        sample: filteredRows.slice(0, 5),
        sourceType: parsed.sourceType,
        entityType: parsed.entityType,
        sectionFilter: parsed.sectionFilter,
        mappingHints: detectedColumns,
        warnings: [
          ...parsedResult.warnings,
          `Applied section filter: ${parsed.sectionFilter}`,
        ],
        duplicateCandidates: parsedResult.duplicateCandidates,
        skippedLines: parsedResult.skippedLines,
      };

      const job = await storage.createImportJob({
        sourceType: "pdf",
        entityType: parsed.entityType,
        status: "previewed",
        payload: filteredRows.map((row) => ({ ...row, entityType: parsed.entityType })),
        summary,
        errors: [],
        committedCount: 0,
      });

      res.json({
        jobId: job.id,
        summary,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid PDF preview payload" });
    }
  });

  app.post("/api/import/commit", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const schema = z.object({ jobId: z.string().min(1) });
      const parsed = schema.parse(req.body);
      const job = await storage.getImportJob(parsed.jobId);

      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }

      const committed = await storage.commitImportJob(job.id);

      res.json({
        committed: true,
        jobId: committed.job.id,
        sourceType: committed.job.sourceType,
        entityType: committed.job.entityType,
        committedCount: committed.committedCount,
        byType: committed.byType,
        summary: committed.job.summary,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to commit import job" });
    }
  });

  app.get("/api/import/jobs/:id", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const job = await storage.getImportJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Import job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch import job" });
    }
  });

  // Cash Transactions
  app.get("/api/cash/transactions", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const transactions = await storage.getCashTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash transactions" });
    }
  });

  app.post("/api/cash/transactions", withDataEntryToken, blockDataEntry, async (req, res) => {
    const idempotency = beginIdempotentRequest(req, res, "POST:/api/cash/transactions");
    if (!idempotency.shouldProceed) return;
    try {
      const data = insertCashTransactionSchema.parse(req.body);
      const transaction = await storage.createCashTransaction(data);
      finalizeIdempotentRequest(idempotency.key, 201, transaction);
      res.status(201).json(transaction);
    } catch (error: any) {
      clearIdempotentRequest(idempotency.key);
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.get("/api/cash/balance", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const balanceData = await storage.getCashBalance();
      // Return both total and byPlatform for backwards compatibility and new features
      res.json({ 
        balance: balanceData.total, // Backwards compatible
        total: balanceData.total,
        byPlatform: balanceData.byPlatform
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash balance" });
    }
  });

  // Portfolio Stats
  app.get("/api/portfolio/stats", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const stats = await storage.getPortfolioStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio stats" });
    }
  });

  // Settings
  app.get("/api/settings", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const data = insertUserSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error: any) {
      console.error("Settings update error:", error);
      res.status(400).json({ error: error.message || "Invalid settings data" });
    }
  });

  // Generate or regenerate data entry token (owner only)
  app.post("/api/settings/generate-data-entry-token", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      // Generate a secure random token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      
      // Update settings with new token
      const settings = await storage.updateSettings({ dataEntryToken: token });
      res.json({ token, settings });
    } catch (error: any) {
      console.error("Token generation error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  // Export all data for backup
  app.get("/api/export-data", async (_req, res) => {
    try {
      const investments = await storage.getInvestments();
      const customDistributionBuckets = await Promise.all(
        investments.map((investment) => storage.getCustomDistributions(investment.id))
      );

      const data = {
        platforms: await storage.getPlatforms(),
        investments,
        cashflows: await storage.getCashflows(),
        customDistributions: customDistributionBuckets.flat(),
        alerts: await storage.getAlerts(),
        userSettings: await storage.getSettings(),
        cashTransactions: await storage.getCashTransactions(),
        savedScenarios: await storage.getSavedScenarios(),
        portfolioSnapshots: await storage.getSnapshots(),
        portfolioHistory: await storage.getPortfolioHistory(),
        visionTargets: await storage.getVisionTargets(),
      };

      res.json(data);
    } catch (error: any) {
      console.error("Data export error:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Verify data entry token
  app.get("/api/verify-data-entry-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const settings = await storage.getSettings();
      
      if (!settings.dataEntryToken) {
        return res.status(404).json({ valid: false, error: "No token configured" });
      }
      
      const valid = settings.dataEntryToken === token;
      res.json({ valid });
    } catch (error: any) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  // Saved Scenarios
  app.get("/api/saved-scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getSavedScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved scenarios" });
    }
  });

  app.post("/api/saved-scenarios", async (req, res) => {
    try {
      const data = insertSavedScenarioSchema.parse(req.body);
      const scenario = await storage.createSavedScenario(data);
      res.json(scenario);
    } catch (error: any) {
      console.error("Create scenario error:", error);
      if (error.message?.includes("Maximum of 5")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || "Invalid scenario data" });
      }
    }
  });

  app.delete("/api/saved-scenarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSavedScenario(id);
      if (!success) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete scenario error:", error);
      res.status(500).json({ error: "Failed to delete scenario" });
    }
  });

  // Portfolio Snapshots (Checkpoints)
  app.get("/api/snapshots", async (_req, res) => {
    try {
      const snapshots = await storage.getSnapshots();
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.post("/api/snapshots", async (req, res) => {
    try {
      const { name } = insertPortfolioSnapshotSchema.pick({ name: true }).parse(req.body);
      const snapshot = await storage.createSnapshot(name);
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Create snapshot error:", error);
      res.status(400).json({ error: error.message || "Invalid snapshot data" });
    }
  });

  app.post("/api/snapshots/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.restoreSnapshot(id);
      res.json(result);
    } catch (error: any) {
      console.error("Restore snapshot error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Snapshot not found" });
      } else {
        res.status(500).json({ error: error.message || "Failed to restore snapshot" });
      }
    }
  });

  app.delete("/api/snapshots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSnapshot(id);
      if (!success) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete snapshot error:", error);
      res.status(500).json({ error: "Failed to delete snapshot" });
    }
  });

  // Auto-cleanup old snapshots
  app.post("/api/snapshots/cleanup", async (req, res) => {
    try {
      const { maxCheckpoints } = req.body;
      const result = await storage.cleanupOldSnapshots(maxCheckpoints || 10);
      res.json(result);
    } catch (error: any) {
      console.error("Cleanup snapshots error:", error);
      res.status(500).json({ error: error.message || "Failed to cleanup snapshots" });
    }
  });

  // Portfolio History
  app.get("/api/portfolio-history", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      // Parse query params for date range filtering
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const history = await storage.getPortfolioHistory(start, end);
      res.json(history);
    } catch (error: any) {
      console.error("Fetch portfolio history error:", error);
      res.status(500).json({ error: "Failed to fetch portfolio history" });
    }
  });

  app.get("/api/portfolio-history/:month", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { month } = req.params;
      const monthDate = new Date(month);
      
      if (isNaN(monthDate.getTime())) {
        return res.status(400).json({ error: "Invalid month format" });
      }
      
      const entry = await storage.getPortfolioHistoryEntry(monthDate);
      
      if (!entry) {
        return res.status(404).json({ error: "No portfolio history entry for this month" });
      }
      
      res.json(entry);
    } catch (error: any) {
      console.error("Fetch portfolio history entry error:", error);
      res.status(500).json({ error: "Failed to fetch portfolio history entry" });
    }
  });

  app.post("/api/portfolio-history", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      // Parse and validate the request body
      const data = insertPortfolioHistorySchema.parse(req.body);
      
      const entry = await storage.upsertPortfolioHistory(data);
      res.status(201).json(entry);
    } catch (error: any) {
      console.error("Create portfolio history error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid portfolio history data" });
      } else {
        res.status(400).json({ error: error.message || "Invalid portfolio history data" });
      }
    }
  });

  app.put("/api/portfolio-history", async (req, res) => {
    try {
      // Parse and validate the request body
      const data = insertPortfolioHistorySchema.parse(req.body);
      
      const entry = await storage.upsertPortfolioHistory(data);
      res.json(entry);
    } catch (error: any) {
      console.error("Update portfolio history error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid portfolio history data" });
      } else {
        res.status(400).json({ error: error.message || "Invalid portfolio history data" });
      }
    }
  });

  app.delete("/api/portfolio-history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePortfolioHistory(id);
      
      if (!success) {
        return res.status(404).json({ error: "Portfolio history entry not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete portfolio history error:", error);
      res.status(500).json({ error: "Failed to delete portfolio history entry" });
    }
  });

  // Monthly Progress (Vision Targets + Portfolio History)
  app.get("/api/monthly-progress", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const progress = await storage.getMonthlyProgress(start, end);
      res.json(progress);
    } catch (error: any) {
      console.error("Fetch monthly progress error:", error);
      res.status(500).json({ error: "Failed to fetch monthly progress" });
    }
  });

  // Vision Targets
  app.get("/api/vision-targets", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const targets = await storage.getVisionTargets(start, end);
      res.json(targets);
    } catch (error: any) {
      console.error("Fetch vision targets error:", error);
      res.status(500).json({ error: "Failed to fetch vision targets" });
    }
  });

  app.post("/api/vision-targets", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { insertVisionTargetSchema } = await import("@shared/schema");
      const data = insertVisionTargetSchema.parse(req.body);
      
      const target = await storage.upsertVisionTarget(data);
      res.status(201).json(target);
    } catch (error: any) {
      console.error("Create vision target error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid vision target data" });
      } else {
        res.status(400).json({ error: error.message || "Invalid vision target data" });
      }
    }
  });

  app.post("/api/vision-targets/bulk", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { targets } = req.body;
      if (!Array.isArray(targets)) {
        return res.status(400).json({ error: "Targets must be an array" });
      }
      
      // Convert string dates to Date objects before validation
      const convertedTargets = targets.map(t => ({
        ...t,
        month: new Date(t.month)
      }));
      
      const { insertVisionTargetSchema } = await import("@shared/schema");
      const validTargets = convertedTargets.map(t => insertVisionTargetSchema.parse(t));
      
      const results = await storage.bulkUpsertVisionTargets(validTargets);
      res.status(201).json(results);
    } catch (error: any) {
      console.error("Bulk create vision targets error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid vision targets data" });
      } else {
        res.status(400).json({ error: error.message || "Invalid vision targets data" });
      }
    }
  });

  app.put("/api/vision-targets", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      // Convert string date to Date object before validation
      const convertedData = {
        ...req.body,
        month: new Date(req.body.month)
      };
      
      const { insertVisionTargetSchema } = await import("@shared/schema");
      const data = insertVisionTargetSchema.parse(convertedData);
      
      const target = await storage.upsertVisionTarget(data);
      res.json(target);
    } catch (error: any) {
      console.error("Update vision target error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0]?.message || "Invalid vision target data" });
      } else {
        res.status(400).json({ error: error.message || "Invalid vision target data" });
      }
    }
  });

  app.delete("/api/vision-targets/:id", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteVisionTarget(id);
      
      if (!success) {
        return res.status(404).json({ error: "Vision target not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete vision target error:", error);
      res.status(500).json({ error: "Failed to delete vision target" });
    }
  });

  // Investment Status Check Trigger (owner only - background task)
  app.post("/api/investments/check-status", withDataEntryToken, blockDataEntry, async (_req, res) => {
    try {
      const { checkAllInvestmentStatuses } = await import("@shared/status-manager");
      
      // Get all investments and cashflows
      const investments = await storage.getInvestments();
      const allCashflows = await storage.getCashflows();
      
      // Group cashflows by investment
      const cashflowsByInvestment = new Map<string, typeof allCashflows>();
      for (const cashflow of allCashflows) {
        const investmentCashflows = cashflowsByInvestment.get(cashflow.investmentId) || [];
        investmentCashflows.push(cashflow);
        cashflowsByInvestment.set(cashflow.investmentId, investmentCashflows);
      }
      
      const investmentsWithCashflows = investments.map((investment) => ({
        investment,
        cashflows: cashflowsByInvestment.get(investment.id) || [],
      }));

      // Check for status updates
      const statusUpdates = checkAllInvestmentStatuses(investmentsWithCashflows);
      
      if (statusUpdates.length > 0) {
        // Apply each status update
        for (const update of statusUpdates) {
          await storage.updateInvestmentStatus(
            update.investmentId,
            update.newStatus,
            update.lateDate,
            update.defaultedDate
          );
        }
      }
      
      res.json({ 
        message: "Status check completed", 
        updatesApplied: statusUpdates.length,
        updates: statusUpdates 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check investment statuses" });
    }
  });

  // Portfolio Data Reset (Destructive Operation)
  // Note: This is a single-user application with no authentication system.
  // Security relies on server-side confirmation validation only.
  app.post("/api/portfolio/reset", withDataEntryToken, blockDataEntry, async (req, res) => {
    try {
      // Validate confirmation string from user input
      const { confirm } = req.body;
      if (!confirm || confirm !== 'DELETE_ALL_DATA') {
        return res.status(400).json({ 
          error: 'Invalid confirmation. Please type DELETE_ALL_DATA exactly as shown.' 
        });
      }
      
      // Log the reset action
      await storage.logAudit({
        actorId: 'system',
        actionType: 'data_reset',
        targetType: 'portfolio',
        targetId: null,
        details: 'All portfolio data reset (investments, cashflows, cash transactions, alerts, custom distributions)',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });
      
      // Execute reset
      await storage.resetAllData();
      
      res.json({ 
        success: true, 
        message: 'Portfolio data reset successfully. All investments, cashflows, cash transactions, alerts, and custom distributions have been deleted.' 
      });
    } catch (error: any) {
      console.error('Portfolio reset failed:', error);
      res.status(500).json({ error: 'Failed to reset portfolio data. Transaction rolled back.' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
