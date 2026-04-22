export interface Investment {
  id: string;
  principal: number; // أصل الاستثمار
  expectedProfit: number; // الربح المتوقع عند الاستحقاق
  actualProfitDistributed: number; // الأرباح المستلمة فعلياً (للتوزيعات الدورية)
  platformName: string; // e.g., 'Manafa', 'Lendo', 'Sukuk'
  status: 'active' | 'completed' | 'defaulted' | 'delayed';
  startDate: string; // ISO Date
  maturityDate: string; // ISO Date
  expectedPaymentDate?: string; // موعد الدفعة القادمة (إن وجد)
  type?: string; // 'Sukuk' or 'Murabaha' etc. - optional for future use
}

export function calculateNAV(investments: Investment[], cashBalance: number): number {
  const activePrincipal = investments
    .filter(inv => inv.status === 'active')
    .reduce((sum, inv) => sum + inv.principal, 0);
  return activePrincipal + cashBalance;
}

export function calculateCashDrag(cashBalance: number, nav: number): { percentage: number; amount: number } {
  if (nav === 0) return { percentage: 0, amount: 0 };
  const percentage = (cashBalance / nav) * 100;
  return { percentage, amount: cashBalance };
}

export function calculateActiveAnnualYield(investments: Investment[]): { percentage: number; estimatedAnnualProfit: number } {
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  if (activeInvestments.length === 0) return { percentage: 0, estimatedAnnualProfit: 0 };

  const totalPrincipal = activeInvestments.reduce((sum, inv) => sum + inv.principal, 0);
  let weightedYieldSum = 0;

  for (const inv of activeInvestments) {
    const daysToMaturity = Math.max(1, (new Date(inv.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const individualYield = (inv.expectedProfit / inv.principal) * (365 / daysToMaturity);
    weightedYieldSum += inv.principal * individualYield;
  }

  const percentage = (weightedYieldSum / totalPrincipal) * 100;
  const estimatedAnnualProfit = (percentage / 100) * totalPrincipal;

  return { percentage, estimatedAnnualProfit };
}

export function calculateTotalDistributedProfit(investments: Investment[]): number {
  return investments.reduce((sum, inv) => sum + inv.actualProfitDistributed, 0);
}

export function calculateDefaultRate(investments: Investment[]): { percentage: number; atRiskAmount: number } {
  const totalPrincipal = investments.reduce((sum, inv) => sum + inv.principal, 0);
  if (totalPrincipal === 0) return { percentage: 0, atRiskAmount: 0 };

  const atRiskAmount = investments
    .filter(inv => inv.status === 'defaulted' || inv.status === 'delayed')
    .reduce((sum, inv) => sum + inv.principal, 0);

  const percentage = (atRiskAmount / totalPrincipal) * 100;
  return { percentage, atRiskAmount };
}

export function calculateWAM(investments: Investment[]): { averageDays: number; percentMaturingIn90Days: number } {
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  if (activeInvestments.length === 0) return { averageDays: 0, percentMaturingIn90Days: 0 };

  const totalPrincipal = activeInvestments.reduce((sum, inv) => sum + inv.principal, 0);
  let weightedDaysSum = 0;
  let maturingIn90DaysPrincipal = 0;

  for (const inv of activeInvestments) {
    const daysToMaturity = Math.max(0, (new Date(inv.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    weightedDaysSum += inv.principal * daysToMaturity;
    if (daysToMaturity <= 90) {
      maturingIn90DaysPrincipal += inv.principal;
    }
  }

  const averageDays = weightedDaysSum / totalPrincipal;
  const percentMaturingIn90Days = (maturingIn90DaysPrincipal / totalPrincipal) * 100;

  return { averageDays, percentMaturingIn90Days };
}

export function calculateExpectedInflow(investments: Investment[], daysForward: number = 30): { totalAmount: number; count: number } {
  const now = Date.now();
  const futureTime = now + daysForward * 24 * 60 * 60 * 1000;

  const relevantInvestments = investments.filter(inv => {
    if (!inv.expectedPaymentDate) return false;
    const paymentTime = new Date(inv.expectedPaymentDate).getTime();
    return paymentTime >= now && paymentTime <= futureTime;
  });

  const totalAmount = relevantInvestments.reduce((sum, inv) => sum + inv.principal + inv.expectedProfit, 0);
  const count = relevantInvestments.length;

  return { totalAmount, count };
}

export function calculatePlatformConcentration(investments: Investment[]): { topPlatform: string; percentage: number } {
  const activeInvestments = investments.filter(inv => inv.status === 'active');
  if (activeInvestments.length === 0) return { topPlatform: 'None', percentage: 0 };

  const platformSums: Record<string, number> = {};
  for (const inv of activeInvestments) {
    platformSums[inv.platformName] = (platformSums[inv.platformName] || 0) + inv.principal;
  }

  let topPlatform = '';
  let maxSum = 0;
  for (const [platform, sum] of Object.entries(platformSums)) {
    if (sum > maxSum) {
      maxSum = sum;
      topPlatform = platform;
    }
  }

  const totalPrincipal = activeInvestments.reduce((sum, inv) => sum + inv.principal, 0);
  const percentage = (maxSum / totalPrincipal) * 100;

  return { topPlatform, percentage };
}

export function calculateHistoricalYield(investments: Investment[], totalPrincipalEverInvested: number): number {
  if (totalPrincipalEverInvested === 0) return 0;
  const totalDistributed = calculateTotalDistributedProfit(investments);
  return (totalDistributed / totalPrincipalEverInvested) * 100;
}