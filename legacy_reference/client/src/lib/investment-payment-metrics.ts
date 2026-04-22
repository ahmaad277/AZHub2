import type { Cashflow, Investment } from "@shared/schema";

export interface ProfitPaymentDisplay {
  profitCashflows: Cashflow[];
  receivedCount: number;
  totalCount: number;
  displayReceived: number;
  displayTotal: number;
}

/**
 * Profit-only payment progress. Display counts may treat completed investments as fully settled.
 */
export function getProfitPaymentDisplay(
  investment: Pick<Investment, "id" | "status" | "totalExpectedProfit">,
  cashflows: Cashflow[]
): ProfitPaymentDisplay {
  const investmentCashflows = cashflows.filter((cf) => cf.investmentId === investment.id);
  const profitCashflows = investmentCashflows.filter((cf) => cf.type === "profit");
  const receivedCount = profitCashflows.filter((cf) => cf.status === "received").length;
  const totalCount = profitCashflows.length;

  let displayReceived = receivedCount;
  let displayTotal = totalCount;

  if (investment.status === "completed") {
    if (totalCount > 0) {
      displayReceived = totalCount;
      displayTotal = totalCount;
    } else if (parseFloat(String(investment.totalExpectedProfit ?? "0")) > 0) {
      displayReceived = 1;
      displayTotal = 1;
    }
  }

  return {
    profitCashflows,
    receivedCount,
    totalCount,
    displayReceived,
    displayTotal,
  };
}
