import type { Investment, CashTransaction, Platform, Cashflow } from '@shared/schema';
import { fromHalalas, sumMoney, toHalalas } from '@shared/money';
import { calculateDurationMonths as calculateDurationMonthsShared } from '@shared/profit-calculator';
import {
  isInvestmentLate,
  isInvestmentDefaulted,
  classifyInvestmentDisplayBucket,
  computeRealizedGainsWithFallback,
  computePrincipalRepaid,
  computePendingSettlementsAmount,
} from '@shared/portfolio-metrics';

export { isInvestmentLate, isInvestmentDefaulted };

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(num) ? num : 0;
}

function parseMoney(value: string | number | null | undefined): number {
  return fromHalalas(toHalalas(parseNumber(value)));
}

export interface DashboardMetrics {
  /** Live face value + cash (إجمالي الأصول تحت الإدارة) */
  portfolioValue: number;
  totalAum: number;
  /** Principal deployed in open positions only */
  activePrincipal: number;
  totalCash: number;
  cashByPlatform: Record<string, number>;

  actualReturns: number;
  expectedReturns: number;
  activeAPR: number;
  cashRatio: number;

  weightedAPR: number;
  portfolioROI: number;
  totalProfitAmount: number;

  /** Annualized portfolio return from aggregate ROI and portfolio age */
  portfolioCagr: number;

  principalRepaid: number;
  pendingSettlementsAmount: number;

  avgDuration: number;
  avgAmount: number;
  avgPaymentAmount: number;

  totalInvestments: number;
  /** Strict DB active only */
  activeInvestments: number;
  /** Live positions: active + late + defaulted */
  liveInvestmentsCount: number;
  completedInvestments: number;
  lateInvestments: number;
  defaultedInvestments: number;
  pendingInvestments: number;

  statusDistribution: {
    active: number;
    completed: number;
    late: number;
    defaulted: number;
    pending: number;
  };

  platformDistribution: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];

  platformDistributionAll: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];

  platformDistributionActive: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];

  platformDistributionCount: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];
}

function calculateDurationMonths(startDate: Date, endDate: Date): number {
  return calculateDurationMonthsShared(new Date(startDate), new Date(endDate));
}

/**
 * Calculate APR (Annual Percentage Rate) for an investment
 */
export function calculateAPR(
  amount: number,
  profit: number,
  durationMonths: number
): number {
  if (durationMonths === 0 || amount === 0) return 0;

  const roi = profit / amount;
  const apr = roi * (12 / durationMonths);

  return apr * 100;
}

/**
 * Calculate total cash from cash transactions
 */
export function calculateTotalCash(cashTransactions: CashTransaction[]): number {
  if (cashTransactions.length === 0) return 0;

  return cashTransactions.reduce((balance, transaction) => {
    const amount = parseMoney(transaction.amount);

    if (transaction.type === 'deposit' || transaction.type === 'distribution') {
      return balance + amount;
    } else if (transaction.type === 'withdrawal' || transaction.type === 'investment') {
      return balance - amount;
    }

    return balance;
  }, 0);
}

/**
 * Calculate comprehensive dashboard metrics
 */
export function calculateDashboardMetrics(
  investments: Investment[],
  cashTransactions: CashTransaction[],
  platforms: Platform[],
  cashflows: Cashflow[],
  dateRange?: { start: Date; end: Date },
  selectedPlatform?: string
): DashboardMetrics {
  let filteredInvestments = investments;
  let filteredCashTransactions = cashTransactions;

  if (selectedPlatform && selectedPlatform !== 'all') {
    filteredInvestments = investments.filter(inv => inv.platformId === selectedPlatform);
    filteredCashTransactions = cashTransactions.filter(
      tx => tx.platformId === selectedPlatform
    );
  }

  if (dateRange) {
    filteredInvestments = filteredInvestments.filter(inv => {
      if (!inv.startDate) return false;
      const startDate = new Date(inv.startDate);
      return startDate >= dateRange.start && startDate <= dateRange.end;
    });
  }

  const filteredInvestmentIds = new Set(filteredInvestments.map(inv => inv.id));
  const filteredCashflows = cashflows.filter(cf => filteredInvestmentIds.has(cf.investmentId));

  const totalCash = calculateTotalCash(filteredCashTransactions);

  const cashByPlatform: Record<string, number> = {};
  if (selectedPlatform && selectedPlatform !== 'all') {
    cashByPlatform[selectedPlatform] = totalCash;
  } else {
    for (const tx of filteredCashTransactions) {
      if (tx.platformId) {
        const amount = parseMoney(tx.amount);
        const effect = ['deposit', 'distribution'].includes(tx.type) ? amount : -amount;
        cashByPlatform[tx.platformId] = (cashByPlatform[tx.platformId] || 0) + effect;
      }
    }
  }

  const liveInvestments = filteredInvestments.filter(
    inv => inv.status === 'active' || inv.status === 'late' || inv.status === 'defaulted'
  );
  const activePrincipal = sumMoney(liveInvestments.map(inv => inv.faceValue));
  const portfolioValue = activePrincipal + totalCash;
  const totalAum = portfolioValue;

  const normalizedActualReturns = computeRealizedGainsWithFallback(filteredInvestments, filteredCashflows);
  const principalRepaid = computePrincipalRepaid(filteredCashflows);
  const pendingSettlementsAmount = computePendingSettlementsAmount(filteredCashflows);

  const expectedReturns = liveInvestments.reduce((sum, inv) => {
    return sum + parseMoney(inv.totalExpectedProfit || "0");
  }, 0);

  const cashRatio = portfolioValue > 0 ? (totalCash / portfolioValue) * 100 : 0;

  const activeFilteredInvestments = filteredInvestments.filter(
    inv => inv.status === 'active' || inv.status === 'late' || inv.status === 'defaulted'
  );
  const totalActiveValue = sumMoney(activeFilteredInvestments.map(inv => inv.faceValue));
  const activeAPR = totalActiveValue > 0
    ? activeFilteredInvestments.reduce((sum, inv) => {
        if (!inv.startDate || !inv.endDate) return sum;
        const amount = parseMoney(inv.faceValue);
        const profit = parseMoney(inv.totalExpectedProfit || "0");
        const durationMonths = calculateDurationMonths(inv.startDate, inv.endDate);
        const apr = calculateAPR(amount, profit, durationMonths);
        const weight = amount / totalActiveValue;
        return sum + (apr * weight);
      }, 0)
    : 0;

  const allInvestmentsValue = sumMoney(filteredInvestments.map(inv => inv.faceValue));
  const weightedAPR = allInvestmentsValue > 0
    ? filteredInvestments.reduce((sum, inv) => {
        if (!inv.startDate || !inv.endDate) return sum;
        const amount = parseMoney(inv.faceValue);
        const profit = parseMoney(inv.totalExpectedProfit || "0");
        const durationMonths = calculateDurationMonths(inv.startDate, inv.endDate);
        const apr = calculateAPR(amount, profit, durationMonths);
        const weight = amount / allInvestmentsValue;
        return sum + (apr * weight);
      }, 0)
    : 0;

  const totalInvestedCapital = allInvestmentsValue;
  const portfolioROI = totalInvestedCapital > 0 ? (normalizedActualReturns / totalInvestedCapital) * 100 : 0;
  const totalProfitAmount = normalizedActualReturns;

  const starts = filteredInvestments
    .filter(inv => inv.startDate)
    .map(inv => new Date(inv.startDate!).getTime());
  const minStart = starts.length > 0 ? Math.min(...starts) : Date.now();
  const yearsElapsed = Math.max((Date.now() - minStart) / (365.25 * 24 * 60 * 60 * 1000), 1 / 12);
  const roiDecimal = totalInvestedCapital > 0 ? normalizedActualReturns / totalInvestedCapital : 0;
  const portfolioCagr =
    roiDecimal > -1 && yearsElapsed > 0
      ? ((1 + roiDecimal) ** (1 / yearsElapsed) - 1) * 100
      : 0;

  const investmentsWithDates = filteredInvestments.filter(inv => inv.startDate && inv.endDate);
  const totalDuration = investmentsWithDates.reduce((sum, inv) => {
    return sum + calculateDurationMonths(inv.startDate!, inv.endDate!);
  }, 0);
  const avgDuration = investmentsWithDates.length > 0
    ? Math.round((totalDuration / investmentsWithDates.length) * 100) / 100
    : 0;
  const avgAmount = filteredInvestments.length > 0
    ? sumMoney(filteredInvestments.map(inv => inv.faceValue)) / filteredInvestments.length
    : 0;

  const totalPayments = filteredCashflows.filter(cf => cf.type === 'profit').length;
  const avgPaymentAmount = totalPayments > 0
    ? filteredCashflows
        .filter(cf => cf.type === 'profit')
        .reduce((sum, cf) => sum + parseMoney(cf.amount), 0) / totalPayments
    : 0;

  const statusDistribution = {
    active: 0,
    completed: 0,
    late: 0,
    defaulted: 0,
    pending: 0,
  };

  for (const inv of filteredInvestments) {
    const bucket = classifyInvestmentDisplayBucket(inv, filteredCashflows);
    statusDistribution[bucket]++;
  }

  const completedInvestments = statusDistribution.completed;
  const lateInvestments = statusDistribution.late;
  const defaultedInvestments = statusDistribution.defaulted;
  const pendingInvestments = statusDistribution.pending;
  const liveInvestmentsCount =
    statusDistribution.active + statusDistribution.late + statusDistribution.defaulted;
  const strictActiveCount = filteredInvestments.filter(inv => inv.status === 'active').length;

  const platformMap = new Map(platforms.map(p => [p.id, p]));

  const platformStatsAll = new Map<string, { value: number; count: number }>();
  const platformStatsLive = new Map<string, { value: number; count: number }>();

  filteredInvestments.forEach(inv => {
    const currentAll = platformStatsAll.get(inv.platformId) || { value: 0, count: 0 };
    currentAll.value += parseMoney(inv.faceValue);
    currentAll.count += 1;
    platformStatsAll.set(inv.platformId, currentAll);

    if (inv.status === 'active' || inv.status === 'late' || inv.status === 'defaulted') {
      const currentLive = platformStatsLive.get(inv.platformId) || { value: 0, count: 0 };
      currentLive.value += parseMoney(inv.faceValue);
      currentLive.count += 1;
      platformStatsLive.set(inv.platformId, currentLive);
    }
  });

  const totalAllInvestmentsValue = sumMoney(filteredInvestments.map(inv => inv.faceValue));
  const totalLiveInvestmentsValue = sumMoney(liveInvestments.map(inv => inv.faceValue));
  const totalAllCount = filteredInvestments.length;

  const platformDistributionAll = Array.from(platformStatsAll.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalAllInvestmentsValue > 0 ? (stats.value / totalAllInvestmentsValue) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const platformDistributionActive = Array.from(platformStatsLive.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalLiveInvestmentsValue > 0 ? (stats.value / totalLiveInvestmentsValue) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const platformDistributionCount = Array.from(platformStatsAll.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalAllCount > 0 ? (stats.count / totalAllCount) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);

  const platformDistribution = platformDistributionAll;

  return {
    portfolioValue,
    totalAum,
    activePrincipal,
    totalCash,
    cashByPlatform,
    actualReturns: normalizedActualReturns,
    expectedReturns,
    activeAPR,
    cashRatio,
    weightedAPR,
    portfolioROI,
    totalProfitAmount,
    portfolioCagr,
    principalRepaid,
    pendingSettlementsAmount,
    avgDuration,
    avgAmount,
    avgPaymentAmount,
    totalInvestments: filteredInvestments.length,
    activeInvestments: strictActiveCount,
    liveInvestmentsCount,
    completedInvestments,
    lateInvestments,
    defaultedInvestments,
    pendingInvestments,
    statusDistribution,
    platformDistribution,
    platformDistributionAll,
    platformDistributionActive,
    platformDistributionCount,
  };
}

export function formatCurrency(value: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ' + currency;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

export function getPerformanceColor(value: number, threshold: { good: number; warning: number }): string {
  if (value >= threshold.good) return 'text-green-500';
  if (value >= threshold.warning) return 'text-yellow-500';
  return 'text-red-500';
}
