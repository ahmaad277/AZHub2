import type { InvestmentWithPlatform, CashflowWithInvestment, Platform, CashTransaction } from "@shared/schema";
import { calculateDashboardMetrics } from "@/lib/dashboardMetrics";

export interface ExecutiveReportPayload {
  generatedAt: string;
  metrics: ReturnType<typeof calculateDashboardMetrics>;
  investments: InvestmentWithPlatform[];
  cashflows: CashflowWithInvestment[];
  platforms: Platform[];
  cashTransactions: CashTransaction[];
}

export function buildExecutiveReportPayload(params: {
  investments: InvestmentWithPlatform[];
  cashflows: CashflowWithInvestment[];
  platforms: Platform[];
  cashTransactions: CashTransaction[];
}): ExecutiveReportPayload {
  const metrics = calculateDashboardMetrics(
    params.investments,
    params.cashTransactions,
    params.platforms,
    params.cashflows,
  );

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    investments: params.investments,
    cashflows: params.cashflows,
    platforms: params.platforms,
    cashTransactions: params.cashTransactions,
  };
}
