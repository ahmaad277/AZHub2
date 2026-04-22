import { roundToMoney } from "./money";

/**
 * Profit Calculator Utility
 * Auto-calculates totalExpectedProfit based on faceValue, IRR, and duration
 */

/**
 * Calculate expected profit for Sukuk investment
 * Formula: faceValue × (IRR / 100) × (durationMonths / 12)
 * 
 * @param faceValue - Principal amount (القيمة الاسمية)
 * @param irrPercent - Internal Rate of Return as percentage (e.g., 15.6 for 15.6%)
 * @param durationMonths - Duration in months
 * @returns Total expected profit
 */
export function calculateExpectedProfit(
  faceValue: number,
  irrPercent: number,
  durationMonths: number
): number {
  if (faceValue <= 0 || irrPercent < 0 || durationMonths <= 0) {
    return 0;
  }
  
  const durationYears = durationMonths / 12;
  const profit = faceValue * (irrPercent / 100) * durationYears;
  
  return roundToMoney(profit);
}

/**
 * Apply platform fee to gross profit when fee deduction is enabled.
 */
export function applyPlatformFeeToProfit(
  grossProfit: number,
  feePercentage: number,
  shouldDeductFee: boolean
): number {
  if (!shouldDeductFee || feePercentage <= 0 || grossProfit <= 0) {
    return roundToMoney(grossProfit);
  }

  const safeFeePercentage = Math.min(100, Math.max(0, feePercentage));
  const feeAmount = grossProfit * (safeFeePercentage / 100);
  return roundToMoney(Math.max(0, grossProfit - feeAmount));
}

/**
 * Reverse fee deduction to estimate gross profit from net profit.
 */
export function estimateGrossProfitFromNet(
  netProfit: number,
  feePercentage: number,
  feeWasDeducted: boolean
): number {
  if (!feeWasDeducted || feePercentage <= 0 || netProfit <= 0) {
    return roundToMoney(netProfit);
  }

  const safeFeePercentage = Math.min(99.99, Math.max(0, feePercentage));
  const feeMultiplier = 1 - safeFeePercentage / 100;
  if (feeMultiplier <= 0) {
    return roundToMoney(netProfit);
  }
  return roundToMoney(netProfit / feeMultiplier);
}

/**
 * Completed calendar months between two dates (date-only, UTC components).
 * A month is counted only after it is fully completed: e.g. 1 Jan → 10 Dec same year = 11 months
 * (December is not a full month yet). Does NOT add an extra month when the end day is after the start day
 * within the same span (avoids overstating vs. completed-months convention).
 *
 * Uses UTC year/month/day so ISO date-only strings (YYYY-MM-DD) stay consistent across time zones.
 */
export function calculateDurationMonths(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
  if (daysDiff <= 0) return 0;

  const y = endDate.getUTCFullYear() - startDate.getUTCFullYear();
  const m = endDate.getUTCMonth() - startDate.getUTCMonth();
  const d = endDate.getUTCDate() - startDate.getUTCDate();
  let totalMonths = y * 12 + m;
  if (d < 0) {
    totalMonths -= 1;
  }

  return Math.max(1, totalMonths);
}

/**
 * Calculate end date from start date + duration in months
 * 
 * @param startDate - Investment start date
 * @param durationMonths - Duration in months
 * @returns Calculated end date
 */
export function calculateEndDate(startDate: Date, durationMonths: number): Date {
  const endDate = new Date(startDate.getTime());
  endDate.setUTCMonth(endDate.getUTCMonth() + durationMonths);
  return endDate;
}

/**
 * Validate and auto-calculate investment financial fields
 * Used for maintaining consistency between dates, duration, and profit calculations
 * 
 * @param data - Investment data (partial or complete)
 * @returns Validated data with auto-calculated fields
 */
export function validateInvestmentFinancials(data: {
  faceValue: number;
  expectedIrr: number;
  startDate: Date;
  endDate?: Date;
  durationMonths?: number;
  totalExpectedProfit?: number;
}): {
  faceValue: number;
  expectedIrr: number;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  totalExpectedProfit: number;
} {
  let { faceValue, expectedIrr, startDate, endDate, durationMonths, totalExpectedProfit } = data;

  // If durationMonths provided but no endDate, calculate endDate
  if (durationMonths && !endDate) {
    endDate = calculateEndDate(startDate, durationMonths);
  }
  
  // If endDate provided but no durationMonths, calculate durationMonths
  if (endDate && !durationMonths) {
    durationMonths = calculateDurationMonths(startDate, endDate);
  }

  // If neither provided, throw error
  if (!endDate || !durationMonths) {
    throw new Error("Either endDate or durationMonths must be provided");
  }

  // Dates are authoritative: duration always matches calendar months between start and end
  if (startDate && endDate) {
    durationMonths = calculateDurationMonths(startDate, endDate);
  }

  // Auto-calculate profit if not provided or if it's zero
  if (!totalExpectedProfit || totalExpectedProfit === 0) {
    totalExpectedProfit = calculateExpectedProfit(faceValue, expectedIrr, durationMonths);
  }
  
  return {
    faceValue,
    expectedIrr,
    startDate,
    endDate,
    durationMonths,
    totalExpectedProfit,
  };
}
