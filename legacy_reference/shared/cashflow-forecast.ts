import { startOfMonth, addMonths, format, isBefore } from "date-fns";
import type { Cashflow, CashflowWithInvestment } from "./schema";
import { toHalalas, fromHalalas } from "./money";
import { isPendingCashflow } from "./cashflow-filters";

export interface MonthlyForecast {
  month: string; // "2025-01" format
  monthLabel: string; // "Jan 2025" format
  principal: number;
  profit: number;
  total: number;
  date: Date; // First day of the month
}

/**
 * Calculate monthly cashflow forecast for the next N months
 * Groups pending (non-received) cashflows by month and separates principal vs profit
 * 
 * @param cashflows - Array of cashflows to forecast
 * @param months - Number of months to forecast (default: 40)
 * @returns Array of monthly forecasts sorted chronologically
 */
export function calculateMonthlyForecast(
  cashflows: Cashflow[] | CashflowWithInvestment[],
  months: number = 40
): MonthlyForecast[] {
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = addMonths(startMonth, months);

  // Pending cashflows due before the end of the horizon (includes overdue → rolled into current month)
  const futureCashflows = cashflows.filter((cf) => {
    if (!isPendingCashflow(cf)) return false;
    const dueDate = new Date(cf.dueDate);
    return isBefore(dueDate, endMonth);
  });

  // Group cashflows by month
  const monthlyData = new Map<string, { principalHalalas: number; profitHalalas: number }>();

  // Initialize all months with zero values
  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startMonth, i);
    const monthKey = format(monthDate, "yyyy-MM");
    monthlyData.set(monthKey, { principalHalalas: 0, profitHalalas: 0 });
  }

  // Aggregate cashflows by month and type
  for (const cf of futureCashflows) {
    const dueDate = new Date(cf.dueDate);
    const bucketStart =
      isBefore(dueDate, startMonth) ? startMonth : startOfMonth(dueDate);
    const monthKey = format(bucketStart, "yyyy-MM");
    
    const existing = monthlyData.get(monthKey);
    if (!existing) continue; // Skip if outside forecast window
    
    const amountHalalas = toHalalas(cf.amount);
    
    if (cf.type === "principal") {
      existing.principalHalalas += amountHalalas;
    } else {
      // profit or any other type
      existing.profitHalalas += amountHalalas;
    }
  }

  // Convert to array format
  const forecast: MonthlyForecast[] = [];
  
  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startMonth, i);
    const monthKey = format(monthDate, "yyyy-MM");
    const data = monthlyData.get(monthKey) || { principalHalalas: 0, profitHalalas: 0 };
    const principal = fromHalalas(data.principalHalalas);
    const profit = fromHalalas(data.profitHalalas);
    
    // Format: (1) Sep-25, (2) Oct-25, etc.
    const monthLabel = `(${i + 1}) ${format(monthDate, "MMM-yy")}`;
    
    forecast.push({
      month: monthKey,
      monthLabel,
      principal,
      profit,
      total: principal + profit,
      date: monthDate,
    });
  }

  return forecast;
}

/**
 * Calculate summary totals for different time periods
 * 
 * @param forecast - Monthly forecast data
 * @returns Object with totals for different periods
 */
export function calculateForecastSummaries(forecast: MonthlyForecast[]) {
  const calculatePeriod = (months: number) => {
    const periodData = forecast.slice(0, months);
    return {
      principal: periodData.reduce((sum, m) => sum + m.principal, 0),
      profit: periodData.reduce((sum, m) => sum + m.profit, 0),
      total: periodData.reduce((sum, m) => sum + m.total, 0),
    };
  };

  return {
    month1: calculatePeriod(1),
    months3: calculatePeriod(3),
    months6: calculatePeriod(6),
    months12: calculatePeriod(12),
    months24: calculatePeriod(24),
    months60: calculatePeriod(60),
  };
}
