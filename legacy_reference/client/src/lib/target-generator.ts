/**
 * Target generation utilities for Vision 2040 Calculator
 * Generates monthly target values based on scenario projections
 */

interface ScenarioInputs {
  initialAmount: number;
  monthlyDeposit: number;
  expectedIRR: number;
  targetAmount: number;
  durationYears: number;
}

interface MonthlyTarget {
  month: Date;
  targetValue: number;
  scenarioId?: string;
  generated: number;
}

/**
 * Generate monthly targets based on scenario inputs
 * Creates a smooth projection from current value to target
 */
export function generateMonthlyTargets(
  inputs: ScenarioInputs,
  startDate: Date = new Date(),
  scenarioId?: string
): MonthlyTarget[] {
  const { initialAmount, monthlyDeposit, expectedIRR, durationYears } = inputs;
  const monthlyRate = expectedIRR / 100 / 12;
  const totalMonths = durationYears * 12;
  
  const targets: MonthlyTarget[] = [];
  let currentValue = initialAmount;
  
  // Generate monthly targets
  for (let monthIndex = 0; monthIndex <= totalMonths; monthIndex++) {
    const targetDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + monthIndex,
      1
    );
    
    // Calculate compound growth for this month
    if (monthIndex > 0) {
      currentValue = currentValue * (1 + monthlyRate) + monthlyDeposit;
    }
    
    targets.push({
      month: targetDate,
      targetValue: Math.round(currentValue),
      scenarioId,
      generated: 1, // Mark as generated
    });
  }
  
  return targets;
}

/**
 * Generate targets for specific date range
 * Useful for filling gaps or regenerating portions
 */
export function generateTargetsForRange(
  inputs: ScenarioInputs,
  startDate: Date,
  endDate: Date,
  scenarioId?: string
): MonthlyTarget[] {
  const allTargets = generateMonthlyTargets(inputs, startDate, scenarioId);
  
  // Filter to requested range
  return allTargets.filter(
    target => target.month >= startDate && target.month <= endDate
  );
}

/**
 * Calculate required monthly deposit to reach target
 * Solves for PMT in future value formula
 */
export function calculateRequiredMonthly(
  currentValue: number,
  targetValue: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  
  if (months === 0 || monthlyRate === 0) return 0;
  
  // FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
  // Solve for PMT
  const futureValueOfInitial = currentValue * Math.pow(1 + monthlyRate, months);
  const remaining = targetValue - futureValueOfInitial;
  
  if (remaining <= 0) return 0;
  
  const pmt = remaining / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
  return Math.max(0, pmt);
}

/**
 * Linear interpolation for smooth target paths
 * Used when monthly deposits are irregular
 */
export function interpolateTargets(
  startValue: number,
  endValue: number,
  months: number,
  startDate: Date = new Date(),
  scenarioId?: string
): MonthlyTarget[] {
  const targets: MonthlyTarget[] = [];
  const monthlyIncrement = (endValue - startValue) / months;
  
  for (let i = 0; i <= months; i++) {
    const targetDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + i,
      1
    );
    
    targets.push({
      month: targetDate,
      targetValue: Math.round(startValue + (monthlyIncrement * i)),
      scenarioId,
      generated: 1,
    });
  }
  
  return targets;
}

/**
 * Validate and merge generated targets with existing manual entries
 * Preserves manual overrides (generated = 0)
 */
export function mergeTargets(
  generated: MonthlyTarget[],
  existing: Array<{ month: Date; generated: number }>
): MonthlyTarget[] {
  const manualMonths = new Set(
    existing
      .filter(e => e.generated === 0)
      .map(e => e.month.toISOString().substring(0, 7))
  );
  
  // Keep generated targets except where manual overrides exist
  return generated.filter(target => {
    const monthKey = target.month.toISOString().substring(0, 7);
    return !manualMonths.has(monthKey);
  });
}