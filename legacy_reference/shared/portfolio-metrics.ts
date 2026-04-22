import type { Investment, Cashflow } from "./schema";
import { isPendingCashflow } from "./cashflow-filters";
import { fromHalalas, sumMoney, toHalalas } from "./money";

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(num) ? num : 0;
}

export function parseMoneyValue(value: string | number | null | undefined): number {
  return fromHalalas(toHalalas(parseNumber(value)));
}

/** Single display bucket per investment — pie charts and counts must not double-count. */
export type InvestmentDisplayBucket =
  | "completed"
  | "pending"
  | "defaulted"
  | "late"
  | "active";

export function isInvestmentLate(investment: Investment, cashflows: Cashflow[]): boolean {
  if (investment.status === "completed" || investment.status === "pending") {
    return false;
  }

  const today = new Date();
  const investmentCashflows = cashflows.filter((cf) => cf.investmentId === investment.id);

  const hasOverdue = investmentCashflows.some((cf) => {
    if (cf.status === "received") return false;
    const dueDate = new Date(cf.dueDate);
    return dueDate < today;
  });

  return hasOverdue;
}

export function isInvestmentDefaulted(investment: Investment, cashflows: Cashflow[]): boolean {
  if (investment.status === "defaulted") return true;
  if (investment.status === "completed" || investment.status === "pending") return false;

  const today = new Date();
  const investmentCashflows = cashflows.filter((cf) => cf.investmentId === investment.id);

  const hasDefaulted = investmentCashflows.some((cf) => {
    if (cf.status === "received") return false;
    const dueDate = new Date(cf.dueDate);
    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 30;
  });

  return hasDefaulted;
}

/**
 * Priority: completed → pending → defaulted → late → active.
 * Ensures each investment appears in exactly one status bucket for reporting.
 */
export function classifyInvestmentDisplayBucket(
  inv: Investment,
  cashflows: Cashflow[]
): InvestmentDisplayBucket {
  if (inv.status === "completed") return "completed";
  if (inv.status === "pending") return "pending";
  if (isInvestmentDefaulted(inv, cashflows)) return "defaulted";
  if (inv.status === "late" || isInvestmentLate(inv, cashflows)) return "late";
  if (inv.status === "active") return "active";
  if (inv.status === "defaulted") return "defaulted";
  if (inv.status === "late") return "late";
  return "pending";
}

export function computeRealizedGainsWithFallback(
  investments: Investment[],
  cashflows: Cashflow[]
): number {
  const profitReceivedHalalas = cashflows
    .filter((cf) => cf.status === "received" && cf.type === "profit")
    .reduce((sum, cf) => sum + toHalalas(parseNumber(cf.amount)), 0);

  const investmentsWithRecordedProfit = new Set(
    cashflows
      .filter((cf) => cf.status === "received" && cf.type === "profit")
      .map((cf) => cf.investmentId)
  );

  const fallbackHalalas = investments
    .filter((inv) => inv.status === "completed" && !investmentsWithRecordedProfit.has(inv.id))
    .reduce((sum, inv) => sum + toHalalas(parseNumber(inv.totalExpectedProfit)), 0);

  return fromHalalas(profitReceivedHalalas + fallbackHalalas);
}

export function computePrincipalRepaid(cashflows: Cashflow[]): number {
  const amounts = cashflows
    .filter((cf) => cf.status === "received" && cf.type === "principal")
    .map((cf) => cf.amount);
  return sumMoney(amounts);
}

/** Sum of non-received cashflows (profit + principal) — pending settlement exposure */
export function computePendingSettlementsAmount(cashflows: Cashflow[]): number {
  const amounts = cashflows
    .filter((cf) => isPendingCashflow(cf))
    .map((cf) => cf.amount);
  return sumMoney(amounts);
}

export function sumFaceValues(investments: Investment[]): number {
  return sumMoney(investments.map((inv) => inv.faceValue));
}
