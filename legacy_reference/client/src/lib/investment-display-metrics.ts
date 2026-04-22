import type { Investment, InvestmentWithPlatform } from "@shared/schema";
import { calculateROI } from "@/lib/utils";
import {
  calculateDurationMonths,
  calculateExpectedProfit,
  applyPlatformFeeToProfit,
} from "@shared/profit-calculator";
import { roundToMoney } from "@shared/money";

const NET_DISPLAY_EPS = 0.03;

function moneyClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= NET_DISPLAY_EPS;
}

/**
 * Expected profit for list/cards/drawer: **net** to the investor (after platform fees when applicable).
 * New saves store net in `totalExpectedProfit`. Legacy rows may still hold **gross** when it matches
 * the theoretical gross from face × IRR × duration — in that case we show net derived from fees.
 */
export function getNetExpectedProfitForDisplay(investment: InvestmentWithPlatform): number {
  const storedRaw = parseFloat(String(investment.totalExpectedProfit ?? "0")) || 0;
  const stored = roundToMoney(storedRaw);
  const platform = investment.platform;

  if (!platform || !investment.startDate || !investment.endDate) {
    return stored;
  }

  const months = calculateDurationMonths(
    new Date(investment.startDate),
    new Date(investment.endDate),
  );
  if (months <= 0) return stored;

  const face = parseFloat(String(investment.faceValue ?? "0"));
  const irr = parseFloat(String(investment.expectedIrr ?? "0"));
  if (face <= 0 || irr <= 0) return stored;

  const grossFromFormula = roundToMoney(calculateExpectedProfit(face, irr, months));
  const feePct = Number(platform.feePercentage) || 0;
  const deduct = platform.deductFees === 1;
  const exclude = investment.excludePlatformFees === 1;
  const netFromFormula = roundToMoney(
    applyPlatformFeeToProfit(grossFromFormula, feePct, deduct && !exclude),
  );

  if (deduct && feePct > 0 && !exclude) {
    if (moneyClose(stored, grossFromFormula) && !moneyClose(stored, netFromFormula)) {
      return netFromFormula;
    }
  }

  return stored;
}

/**
 * Calendar-consistent duration (matches investment dialog / dashboard).
 */
export function getInvestmentDurationMonths(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): number {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 0;
  return calculateDurationMonths(s, e);
}

/**
 * ROI % on face value: uses realized profit when any profit was received;
 * otherwise expected ROI from **net** expected profit so rows do not show 0% when data exists but cashflows are not marked.
 */
export function getDisplayRoiPercent(
  investment: InvestmentWithPlatform,
  totalProfitReceived: number,
): number {
  const face = parseFloat(String(investment.faceValue ?? "0"));
  if (face <= 0) return 0;
  const netExpected = getNetExpectedProfitForDisplay(investment);

  if (totalProfitReceived > 0) {
    return calculateROI(face, totalProfitReceived);
  }
  if (netExpected > 0) {
    return (netExpected / face) * 100;
  }
  return 0;
}

/**
 * Profit amount for overview cards: fallback to expected when completed but nothing recorded as received.
 */
export function getDisplayProfitAmount(
  investment: InvestmentWithPlatform,
  totalProfitReceived: number,
): number {
  const expected = getNetExpectedProfitForDisplay(investment);
  if (investment.status === "completed" && expected > 0 && totalProfitReceived === 0) {
    return expected;
  }
  return totalProfitReceived;
}
