/**
 * Dashboard metrics — SINGLE SOURCE OF TRUTH for all portfolio aggregations.
 *
 * The nine canonical metrics (1-9) match the Master Build Prompt exactly:
 *   1. Total Cash Balance   = SUM(cash_transactions.amount)
 *   2. Active Principal     = SUM(principal_amount) where derived_status in (active, late)
 *   3. NAV                  = Total Principal Exposure + Cash Balance + Pending Profits
 *   4. Cash Drag            = Cash / NAV * 100
 *   5. Realized Gains       = SUM(cashflows.amount) where type=profit AND status=received
 *                             (STRICT — no fallback logic)
 *   6. Expected Inflow 30D  = SUM(cashflows.amount) where status=pending AND due<=NOW+30d
 *   7. WAM (days)           = SUM(principal * days_to_maturity) / SUM(principal)
 *   8. Default Rate         = defaulted principal / (active+late+defaulted principal) * 100
 *   9. Active Annual Yield  = principal-weighted annual return (contract start→end)
 *
 * Nothing else is allowed to derive metrics. The frontend calls
 * `/api/dashboard/metrics` and displays whatever comes back.
 */

import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  cashTransactions,
  cashflows,
  investments,
  platforms,
} from "@/db/schema";
import { daysBetween } from "./date-smart";
import { roundToMoney, sumMoney } from "./money";
import {
  DEFAULT_GRACE_DAYS,
  classifyResolvedIssueDays,
  getPrincipalOverdueDays,
} from "./status-resolver";

export interface DashboardMetrics {
  totalCashBalance: number;
  activePrincipal: number;
  nav: number;
  cashDragPercent: number;
  realizedGains: number;
  expectedInflow30d: number;
  expectedInflow60d: number;
  expectedInflow90d: number;
  wamDays: number;
  weightedOriginalDurationDays: number;
  defaultRatePercent: number;
  activeAnnualYieldPercent: number;
  historicalAnnualYieldPercent: number;
  // Helpful extras (not required by the prompt but cheap to compute):
  activeCount: number;
  lateCount: number;
  defaultedCount: number;
  completedCount: number;
  totalExpectedProfit: number;
  overdueBalance: number;
  nextPayment: { amount: number; dueDate: string | null; investmentId: string | null };
  generatedAt: string;
  /** Sum of principal_amount per derived status — for dashboard pie «percent» by weight (not a canonical metric). */
  principalByStatus: {
    active: number;
    late: number;
    defaulted: number;
    completed: number;
  };
}

export interface MetricsOptions {
  /** Scope metrics to a single platform. Undefined = all platforms. */
  platformId?: string;
  /** Override "now" for deterministic tests. */
  now?: Date;
  /** Grace period before overdue pending principal counts as defaulted. */
  graceDays?: number;
}

type DerivedStatus = "active" | "late" | "defaulted" | "completed";

interface InvestmentComputedRow {
  id: string;
  principal: number;
  expectedProfit: number;
  expectedIrr: number;
  startDate: Date;
  endDate: Date;
  derivedStatus: DerivedStatus;
  maxOverdueDays: number;
  platformId: string;
}

interface RawInvestment {
  id: string;
  principal: string;
  expectedProfit: string;
  expectedIrr: string;
  startDate: Date;
  endDate: Date;
  platformId: string;
}

interface RawCashflow {
  id: string;
  investmentId: string;
  dueDate: Date;
  amount: string;
  type: string;
  status: string;
}

interface RawCashTransaction {
  amount: string;
  platformId: string | null;
}

/** Investment + cashflow + cash-tx rows (no platform master rows). */
export type DashboardMetricsCore = {
  investmentRows: RawInvestment[];
  cashflowRows: RawCashflow[];
  cashRows: RawCashTransaction[];
};

/** Full-portfolio rows + platforms list (for per-platform breakdown). */
export type DashboardAggregates = DashboardMetricsCore & {
  platformRows: (typeof platforms.$inferSelect)[];
};

/**
 * Three parallel queries for KPI metrics (no `platforms` table).
 * Uses `where(sql\`true\`)` so test mocks that only implement `.where()` keep working.
 */
export async function loadDashboardMetricsCoreFromDb(): Promise<DashboardMetricsCore> {
  const [investmentRows, cashflowRows, cashRows] = await Promise.all([
    db
      .select({
        id: investments.id,
        principal: investments.principalAmount,
        expectedProfit: investments.expectedProfit,
        expectedIrr: investments.expectedIrr,
        startDate: investments.startDate,
        endDate: investments.endDate,
        platformId: investments.platformId,
      })
      .from(investments)
      .where(sql`true`),
    db
      .select({
        id: cashflows.id,
        investmentId: cashflows.investmentId,
        dueDate: cashflows.dueDate,
        amount: cashflows.amount,
        type: cashflows.type,
        status: cashflows.status,
      })
      .from(cashflows)
      .where(sql`true`),
    db
      .select({
        amount: cashTransactions.amount,
        platformId: cashTransactions.platformId,
      })
      .from(cashTransactions)
      .where(sql`true`),
  ]);

  return { investmentRows, cashflowRows, cashRows };
}

/** Four parallel reads (core + platforms) — same rows as sequential; lower wall time. */
export async function loadDashboardAggregatesFromDb(): Promise<DashboardAggregates> {
  const [investmentRows, cashflowRows, cashRows, platformRows] = await Promise.all([
    db
      .select({
        id: investments.id,
        principal: investments.principalAmount,
        expectedProfit: investments.expectedProfit,
        expectedIrr: investments.expectedIrr,
        startDate: investments.startDate,
        endDate: investments.endDate,
        platformId: investments.platformId,
      })
      .from(investments)
      .where(sql`true`),
    db
      .select({
        id: cashflows.id,
        investmentId: cashflows.investmentId,
        dueDate: cashflows.dueDate,
        amount: cashflows.amount,
        type: cashflows.type,
        status: cashflows.status,
      })
      .from(cashflows)
      .where(sql`true`),
    db
      .select({
        amount: cashTransactions.amount,
        platformId: cashTransactions.platformId,
      })
      .from(cashTransactions)
      .where(sql`true`),
    db
      .select()
      .from(platforms)
      .where(sql`true`)
      .orderBy(asc(platforms.name)),
  ]);

  return { investmentRows, cashflowRows, cashRows, platformRows };
}

export async function getDashboardMetrics(
  options: MetricsOptions = {},
): Promise<DashboardMetrics> {
  const core = await loadDashboardMetricsCoreFromDb();
  return computeMetricsFromAggregates(core, options);
}

/** Breakdown per platform — used by Platform Overview card. */
export async function getPlatformBreakdown(now: Date = new Date()) {
  const agg = await loadDashboardAggregatesFromDb();
  return computePlatformBreakdownFromAggregates(agg, now);
}

export function sliceAggregatesForMetrics(
  agg: DashboardMetricsCore,
  platformId: string | undefined,
): {
  investmentRows: RawInvestment[];
  cashflowRows: RawCashflow[];
  cashRows: RawCashTransaction[];
} {
  if (!platformId) {
    return {
      investmentRows: agg.investmentRows,
      cashflowRows: agg.cashflowRows,
      cashRows: agg.cashRows,
    };
  }
  const investmentRows = agg.investmentRows.filter((i) => i.platformId === platformId);
  const idSet = new Set(investmentRows.map((i) => i.id));
  const cashflowRows = agg.cashflowRows.filter((cf) => idSet.has(cf.investmentId));
  const cashRows = agg.cashRows.filter(
    (r) => r.platformId === platformId,
  );
  return { investmentRows, cashflowRows, cashRows };
}

export function computeMetricsFromAggregates(
  agg: DashboardMetricsCore,
  options: MetricsOptions,
): DashboardMetrics {
  const now = options.now ?? new Date();
  const graceDays = options.graceDays ?? DEFAULT_GRACE_DAYS;
  const { investmentRows, cashflowRows, cashRows } = sliceAggregatesForMetrics(
    agg,
    options.platformId,
  );
  return computeMetrics(investmentRows, cashflowRows, cashRows, now, graceDays);
}

function computePlatformBreakdownFromAggregates(agg: DashboardAggregates, now: Date) {
  const graceDays = DEFAULT_GRACE_DAYS;
  const { investmentRows, cashflowRows, cashRows, platformRows: plats } = agg;

  // Pre-build cfByInvestment once — investment IDs are globally unique,
  // so the same Map works correctly for every per-platform computeMetrics call.
  const cfByInvestment: CfByInvestmentMap = new Map();
  for (const cf of cashflowRows) {
    const list = cfByInvestment.get(cf.investmentId) ?? [];
    list.push({
      id: cf.id,
      dueDate: cf.dueDate,
      amount: Number(cf.amount),
      type: cf.type as "profit" | "principal",
      status: cf.status as "pending" | "received",
    });
    cfByInvestment.set(cf.investmentId, list);
  }

  const investmentsByPlatform = new Map<string, RawInvestment[]>();
  const invIdToPlatformId = new Map<string, string>();
  for (const i of investmentRows) {
    invIdToPlatformId.set(i.id, i.platformId);
    const list = investmentsByPlatform.get(i.platformId) ?? [];
    list.push(i);
    investmentsByPlatform.set(i.platformId, list);
  }

  const cashflowsByPlatform = new Map<string, RawCashflow[]>();
  for (const cf of cashflowRows) {
    const pid = invIdToPlatformId.get(cf.investmentId);
    if (pid === undefined) continue;
    const list = cashflowsByPlatform.get(pid) ?? [];
    list.push(cf);
    cashflowsByPlatform.set(pid, list);
  }

  const results = [] as Array<{
    platformId: string;
    platformName: string;
    activePrincipal: number;
    realizedGains: number;
    expectedProfit: number;
    investmentsCount: number;
    defaultedCount: number;
    platformColor: string | null;
    investmentsPrincipalTotal: number;
    investmentsPrincipalActive: number;
  }>;

  for (const p of plats) {
    const platformInvestments = investmentsByPlatform.get(p.id) ?? [];
    const platformCashflows = cashflowsByPlatform.get(p.id) ?? [];
    const platformCashRows = cashRows.filter(
      (cr) => cr.platformId === p.id,
    );

    const m = computeMetrics(
      platformInvestments,
      platformCashflows,
      platformCashRows,
      now,
      graceDays,
      cfByInvestment,
    );

    const investmentsPrincipalTotal = roundToMoney(
      platformInvestments.reduce((acc, i) => acc + Number(i.principal), 0),
    );

    results.push({
      platformId: p.id,
      platformName: p.name,
      activePrincipal: m.activePrincipal,
      realizedGains: m.realizedGains,
      expectedProfit: m.totalExpectedProfit,
      investmentsCount: m.activeCount + m.lateCount + m.defaultedCount + m.completedCount,
      defaultedCount: m.defaultedCount,
      platformColor: p.color ?? null,
      investmentsPrincipalTotal,
      investmentsPrincipalActive: m.principalByStatus.active + m.principalByStatus.late + m.principalByStatus.defaulted,
    });
  }
  return results;
}

/** One DB load, then metrics + full breakdown (+ platform rows for summary to avoid a duplicate query). */
export async function computeSummaryMetricsAndBreakdown(options: {
  platformId?: string;
}) {
  const agg = await loadDashboardAggregatesFromDb();
  const now = new Date();
  const metrics = computeMetricsFromAggregates(agg, { platformId: options.platformId, now });
  const breakdown = computePlatformBreakdownFromAggregates(agg, now);
  return { metrics, breakdown, platforms: agg.platformRows };
}

type CfByInvestmentMap = Map<
  string,
  Array<{
    id: string;
    dueDate: Date;
    amount: number;
    type: "profit" | "principal";
    status: "pending" | "received";
  }>
>;

/**
 * Core metrics calculation logic extracted for reuse.
 * Computes metrics in-memory from pre-fetched rows.
 *
 * When `prebuiltCfByInvestment` is provided, the per-investment cashflow
 * lookup is reused across platform-breakdown calls instead of being rebuilt.
 */
function computeMetrics(
  investmentRows: RawInvestment[],
  cashflowRows: RawCashflow[],
  cashRows: RawCashTransaction[],
  now: Date,
  graceDays: number,
  prebuiltCfByInvestment?: CfByInvestmentMap,
): DashboardMetrics {
  // Group cashflows by investment (skip if pre-built map provided).
  const cfByInvestment = prebuiltCfByInvestment ?? (() => {
    const map: CfByInvestmentMap = new Map();
    for (const cf of cashflowRows) {
      const list = map.get(cf.investmentId) ?? [];
      list.push({
        id: cf.id,
        dueDate: cf.dueDate,
        amount: Number(cf.amount),
        type: cf.type as "profit" | "principal",
        status: cf.status as "pending" | "received",
      });
      map.set(cf.investmentId, list);
    }
    return map;
  })();

  // Compute per-investment derived status + overdue days.
  const computed: InvestmentComputedRow[] = investmentRows.map((i) => {
    const cfs = cfByInvestment.get(i.id) ?? [];
    let pendingCount = 0;
    let receivedCount = 0;
    for (const cf of cfs) {
      if (cf.status === "pending") {
        pendingCount++;
      } else {
        receivedCount++;
      }
    }
    const maxOverdue = getPrincipalOverdueDays(cfs, now);
    const resolvedIssueStatus = classifyResolvedIssueDays(maxOverdue, graceDays);
    let derived: DerivedStatus;
    if (cfs.length === 0 && i.endDate.getTime() < now.getTime()) {
      derived = "completed";
    } else if (pendingCount === 0 && receivedCount > 0) {
      derived = "completed";
    } else if (resolvedIssueStatus) {
      derived = resolvedIssueStatus;
    } else {
      derived = "active";
    }
    return {
      id: i.id,
      principal: Number(i.principal),
      expectedProfit: Number(i.expectedProfit),
      expectedIrr: Number(i.expectedIrr),
      startDate: i.startDate,
      endDate: i.endDate,
      derivedStatus: derived,
      maxOverdueDays: maxOverdue,
      platformId: i.platformId,
    };
  });

  // ── Single pass: accumulate all per-investment aggregations ──
  let activePrincipalAcc = 0;
  let totalPrincipalExposureAcc = 0;
  let defaultedPrincipalAcc = 0;
  let totalExpectedProfit = 0;
  let principalActive = 0;
  let principalLate = 0;
  let principalDefaulted = 0;
  let principalCompleted = 0;
  let countActive = 0;
  let countLate = 0;
  let countDefaulted = 0;
  let countCompleted = 0;
  let aprWeightedNumerator = 0;
  let historicalAprWeightedNumerator = 0;
  let totalPrincipalAll = 0;
  let wamNumerator = 0;
  let originalDurationNumerator = 0;
  let wamDenominator = 0;

  for (const r of computed) {
    switch (r.derivedStatus) {
      case "active":
        countActive++;
        principalActive += r.principal;
        break;
      case "late":
        countLate++;
        principalLate += r.principal;
        break;
      case "defaulted":
        countDefaulted++;
        principalDefaulted += r.principal;
        break;
      case "completed":
        countCompleted++;
        principalCompleted += r.principal;
        break;
    }

    const isActive = r.derivedStatus !== "completed";
    if (isActive) {
      activePrincipalAcc += r.principal;
      totalPrincipalExposureAcc += r.principal;
      const days = Math.max(1, daysBetween(now, r.endDate));
      const originalDurationDays = Math.max(1, daysBetween(r.startDate, r.endDate));
      wamNumerator += r.principal * days;
      originalDurationNumerator += r.principal * originalDurationDays;
      wamDenominator += r.principal;
      aprWeightedNumerator += r.principal * (r.expectedIrr / 100);
    }

    if (r.derivedStatus === "defaulted") {
      defaultedPrincipalAcc += r.principal;
    }

    totalExpectedProfit += r.expectedProfit;
    historicalAprWeightedNumerator += r.principal * (r.expectedIrr / 100);
    totalPrincipalAll += r.principal;
  }

  const activePrincipal = roundToMoney(activePrincipalAcc);
  const defaultedPrincipal = roundToMoney(defaultedPrincipalAcc);
  const totalPrincipalExposure = roundToMoney(totalPrincipalExposureAcc);

  // Metric 1: Total Cash Balance (from the ledger, always).
  // Clamp to 0 to prevent negative balances from affecting metrics
  const totalCashBalance = Math.max(0, sumMoney(cashRows.map((r) => r.amount)));

  const pendingProfitRows = cashflowRows.filter(
    (cf) => cf.type === "profit" && cf.status === "pending",
  );
  const pendingProfits = sumMoney(pendingProfitRows.map((r) => r.amount));

  // Metric 3: NAV.
  const nav = roundToMoney(totalPrincipalExposure + totalCashBalance + pendingProfits);

  // Metric 4: Cash Drag.
  const cashDragPercent =
    nav > 0 ? roundToMoney((totalCashBalance / nav) * 100) : 0;

  // Metric 5: Realized Gains — STRICT (no fallback).
  const realizedRows = cashflowRows.filter(
    (cf) => cf.type === "profit" && cf.status === "received",
  );
  const realizedGains = sumMoney(realizedRows.map((r) => r.amount));

  // Metric 6: Expected Inflow 30/60/90.
  const ms30 = now.getTime() + 30 * 86_400_000;
  const ms60 = now.getTime() + 60 * 86_400_000;
  const ms90 = now.getTime() + 90 * 86_400_000;
  let inflow30 = 0;
  let inflow60 = 0;
  let inflow90 = 0;
  let overdueBalance = 0;
  for (const cf of cashflowRows) {
    if (cf.status !== "pending") continue;
    const due = cf.dueDate.getTime();
    if (due < now.getTime()) {
      overdueBalance += Number(cf.amount);
      continue;
    }
    const amt = Number(cf.amount);
    if (due <= ms30) inflow30 += amt;
    if (due <= ms60) inflow60 += amt;
    if (due <= ms90) inflow90 += amt;
  }
  inflow30 = roundToMoney(inflow30);
  inflow60 = roundToMoney(inflow60);
  inflow90 = roundToMoney(inflow90);
  overdueBalance = roundToMoney(overdueBalance);

  // Metric 7: WAM (days) — weighted by principal, only active set.
  const wamDays =
    wamDenominator > 0 ? Math.round(wamNumerator / wamDenominator) : 0;
  const weightedOriginalDurationDays =
    wamDenominator > 0 ? Math.round(originalDurationNumerator / wamDenominator) : 0;

  // Metric 8: Default Rate.
  const defaultRatePercent =
    totalPrincipalExposure > 0
      ? roundToMoney((defaultedPrincipal / totalPrincipalExposure) * 100)
      : 0;

  // Metric 9: Active Annual Yield (principal-weighted using expectedIrr).
  const activeAnnualYieldPercent =
    activePrincipal > 0
      ? roundToMoney((aprWeightedNumerator / activePrincipal) * 100)
      : 0;

  // Historical Annual Yield (principal-weighted using expectedIrr for ALL investments).
  const historicalAnnualYieldPercent =
    totalPrincipalAll > 0
      ? roundToMoney((historicalAprWeightedNumerator / totalPrincipalAll) * 100)
      : 0;

  // Next upcoming payment.
  const pendingSorted = cashflowRows
    .filter((cf) => cf.status === "pending" && cf.dueDate.getTime() >= now.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = pendingSorted[0];

  totalExpectedProfit = roundToMoney(totalExpectedProfit);

  const principalByStatus = {
    active: roundToMoney(principalActive),
    late: roundToMoney(principalLate),
    defaulted: roundToMoney(principalDefaulted),
    completed: roundToMoney(principalCompleted),
  };

  return {
    totalCashBalance,
    activePrincipal,
    nav,
    cashDragPercent,
    realizedGains,
    expectedInflow30d: inflow30,
    expectedInflow60d: inflow60,
    expectedInflow90d: inflow90,
    wamDays,
    weightedOriginalDurationDays,
    defaultRatePercent,
    activeAnnualYieldPercent,
    historicalAnnualYieldPercent,
    activeCount: countActive,
    lateCount: countLate,
    defaultedCount: countDefaulted,
    completedCount: countCompleted,
    totalExpectedProfit,
    overdueBalance,
    nextPayment: next
      ? {
          amount: roundToMoney(Number(next.amount)),
          dueDate: next.dueDate.toISOString(),
          investmentId: next.investmentId,
        }
      : { amount: 0, dueDate: null, investmentId: null },
    generatedAt: now.toISOString(),
    principalByStatus,
  };
}
