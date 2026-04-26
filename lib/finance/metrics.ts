/**
 * Dashboard metrics — SINGLE SOURCE OF TRUTH for all portfolio aggregations.
 *
 * The nine canonical metrics (1-9) match the Master Build Prompt exactly:
 *   1. Total Cash Balance   = SUM(cash_transactions.amount)
 *   2. Active Principal     = SUM(principal_amount) where derived_status in (active, late)
 *   3. NAV                  = Active Principal + Cash Balance
 *   4. Cash Drag            = Cash / NAV * 100
 *   5. Realized Gains       = SUM(cashflows.amount) where type=profit AND status=received
 *                             (STRICT — no fallback logic)
 *   6. Expected Inflow 30D  = SUM(cashflows.amount) where status=pending AND due<=NOW+30d
 *   7. WAM (days)           = SUM(principal * days_to_maturity) / SUM(principal)
 *   8. Default Rate         = SUM(principal where overdue>90d) / NAV * 100
 *   9. Active Annual Yield  = SUM(expected_profit) / Active Principal * (365 / WAM_days)
 *
 * Nothing else is allowed to derive metrics. The frontend calls
 * `/api/dashboard/metrics` and displays whatever comes back.
 */

import { and, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
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
  defaultRatePercent: number;
  activeAnnualYieldPercent: number;
  // Helpful extras (not required by the prompt but cheap to compute):
  activeCount: number;
  lateCount: number;
  defaultedCount: number;
  completedCount: number;
  totalExpectedProfit: number;
  overdueBalance: number;
  nextPayment: { amount: number; dueDate: string | null; investmentId: string | null };
  generatedAt: string;
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
  endDate: Date;
  derivedStatus: DerivedStatus;
  maxOverdueDays: number;
  platformId: string;
}

interface RawInvestment {
  id: string;
  principal: string;
  expectedProfit: string;
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

/**
 * Core metrics calculation logic extracted for reuse.
 * Computes metrics in-memory from pre-fetched rows.
 */
function computeMetrics(
  investmentRows: RawInvestment[],
  cashflowRows: RawCashflow[],
  cashRows: RawCashTransaction[],
  now: Date,
  graceDays: number,
): DashboardMetrics {
  // Group cashflows by investment.
  const cfByInvestment = new Map<
    string,
    Array<{
      id: string;
      dueDate: Date;
      amount: number;
      type: "profit" | "principal";
      status: "pending" | "received";
    }>
  >();
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
      endDate: i.endDate,
      derivedStatus: derived,
      maxOverdueDays: maxOverdue,
      platformId: i.platformId,
    };
  });

  // Active set = active + late (i.e., not completed, not defaulted).
  const activeSet = computed.filter(
    (r) => r.derivedStatus === "active" || r.derivedStatus === "late",
  );

  // Metric 1: Total Cash Balance (from the ledger, always).
  const totalCashBalance = sumMoney(cashRows.map((r) => r.amount));

  // Metric 2: Active Principal.
  const activePrincipal = roundToMoney(
    activeSet.reduce((acc, r) => acc + r.principal, 0),
  );

  // Metric 3: NAV.
  const nav = roundToMoney(activePrincipal + totalCashBalance);

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
  let wamNumerator = 0;
  let wamDenominator = 0;
  for (const r of activeSet) {
    const days = Math.max(1, daysBetween(now, r.endDate));
    wamNumerator += r.principal * days;
    wamDenominator += r.principal;
  }
  const wamDays =
    wamDenominator > 0 ? Math.round(wamNumerator / wamDenominator) : 0;

  // Metric 8: Default Rate.
  const defaultedPrincipal = roundToMoney(
    computed
      .filter((r) => r.derivedStatus === "defaulted")
      .reduce((acc, r) => acc + r.principal, 0),
  );
  const defaultRatePercent =
    nav > 0 ? roundToMoney((defaultedPrincipal / nav) * 100) : 0;

  // Metric 9: Active Annual Yield.
  const totalExpectedProfitActive = roundToMoney(
    activeSet.reduce((acc, r) => acc + r.expectedProfit, 0),
  );
  const activeAnnualYieldPercent =
    activePrincipal > 0 && wamDays > 0
      ? roundToMoney((totalExpectedProfitActive / activePrincipal) * (365 / wamDays) * 100)
      : 0;

  // Next upcoming payment (helpful for Lite mode).
  const pendingSorted = cashflowRows
    .filter((cf) => cf.status === "pending" && cf.dueDate.getTime() >= now.getTime())
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const next = pendingSorted[0];

  const totalExpectedProfit = roundToMoney(
    computed.reduce((acc, r) => acc + r.expectedProfit, 0),
  );

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
    defaultRatePercent,
    activeAnnualYieldPercent,
    activeCount: computed.filter((r) => r.derivedStatus === "active").length,
    lateCount: computed.filter((r) => r.derivedStatus === "late").length,
    defaultedCount: computed.filter((r) => r.derivedStatus === "defaulted").length,
    completedCount: computed.filter((r) => r.derivedStatus === "completed").length,
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
  };
}

/**
 * Compute metrics ENTIRELY in the backend. This function performs a minimal
 * number of parallel queries and then joins the results in memory — which
 * keeps the code portable across Postgres/SQLite and easy to test.
 */
export async function getDashboardMetrics(
  options: MetricsOptions = {},
): Promise<DashboardMetrics> {
  const now = options.now ?? new Date();
  const graceDays = options.graceDays ?? DEFAULT_GRACE_DAYS;
  const platformId = options.platformId;

  // Load investments (optionally scoped to platform).
  const investmentRows = await db
    .select({
      id: investments.id,
      principal: investments.principalAmount,
      expectedProfit: investments.expectedProfit,
      endDate: investments.endDate,
      platformId: investments.platformId,
    })
    .from(investments)
    .where(platformId ? eq(investments.platformId, platformId) : sql`true`);

  const investmentIds = investmentRows.map((i) => i.id);

  // Load all cashflows for those investments.
  const cashflowRows =
    investmentIds.length === 0
      ? []
      : await db
          .select({
            id: cashflows.id,
            investmentId: cashflows.investmentId,
            dueDate: cashflows.dueDate,
            amount: cashflows.amount,
            type: cashflows.type,
            status: cashflows.status,
          })
          .from(cashflows)
          .where(inArray(cashflows.investmentId, investmentIds));

  // Metric 1: Total Cash Balance (from the ledger, always).
  const cashRows = await db
    .select({ amount: cashTransactions.amount, platformId: cashTransactions.platformId })
    .from(cashTransactions)
    .where(
      platformId
        ? or(
            eq(cashTransactions.platformId, platformId),
            isNull(cashTransactions.platformId),
          )
        : sql`true`,
    );

  return computeMetrics(investmentRows, cashflowRows, cashRows, now, graceDays);
}

/** Breakdown per platform — used by Platform Overview card. */
export async function getPlatformBreakdown(now: Date = new Date()) {
  const plats = await db.select().from(platforms);
  const graceDays = DEFAULT_GRACE_DAYS;

  // 1. Fetch all investments
  const investmentRows = await db
    .select({
      id: investments.id,
      principal: investments.principalAmount,
      expectedProfit: investments.expectedProfit,
      endDate: investments.endDate,
      platformId: investments.platformId,
    })
    .from(investments);

  // 2. Fetch all cashflows
  const cashflowRows = await db
    .select({
      id: cashflows.id,
      investmentId: cashflows.investmentId,
      dueDate: cashflows.dueDate,
      amount: cashflows.amount,
      type: cashflows.type,
      status: cashflows.status,
    })
    .from(cashflows);

  // 3. Fetch all cash transactions
  const cashRows = await db
    .select({ amount: cashTransactions.amount, platformId: cashTransactions.platformId })
    .from(cashTransactions);

  const results = [] as Array<{
    platformId: string;
    platformName: string;
    activePrincipal: number;
    realizedGains: number;
    expectedProfit: number;
    investmentsCount: number;
    defaultedCount: number;
    platformColor: string | null;
  }>;

  for (const p of plats) {
    // Filter rows for this specific platform
    const platformInvestments = investmentRows.filter((i) => i.platformId === p.id);
    const platformInvestmentIds = new Set(platformInvestments.map((i) => i.id));
    const platformCashflows = cashflowRows.filter((cf) => platformInvestmentIds.has(cf.investmentId));
    const platformCashRows = cashRows.filter((cr) => cr.platformId === p.id || cr.platformId === null);

    const m = computeMetrics(platformInvestments, platformCashflows, platformCashRows, now, graceDays);
    
    results.push({
      platformId: p.id,
      platformName: p.name,
      activePrincipal: m.activePrincipal,
      realizedGains: m.realizedGains,
      expectedProfit: m.totalExpectedProfit,
      investmentsCount: m.activeCount + m.lateCount + m.defaultedCount + m.completedCount,
      defaultedCount: m.defaultedCount,
      platformColor: p.color ?? null,
    });
  }
  return results;
}
