/**
 * Vision 2040 projection math — pure, deterministic, server-friendly.
 *
 * This module is intentionally NOT a portfolio aggregation. It accepts
 * already-aggregated values (NAV, annual rate, target) and produces
 * forecasting curves on a monthly time axis. The only "metrics" source
 * of truth remains `lib/finance/metrics.ts` (FIN-R-001).
 *
 * Conventions:
 *   - All rates are passed as decimals (0.12 = 12%). Helpers below convert
 *     percent→decimal via `pctToDecimal` for callers reading server fields
 *     like `historicalAnnualYieldPercent`.
 *   - Time anchor uses UTC midnight on the 1st of each month.
 *   - "month key" = ISO string of that UTC date — used to merge plan rows.
 */

import { roundToMoney } from "./money";

export const VISION_TARGET_YEAR = 2040;

export interface PlanTargetInput {
  month: string | Date;
  /** Monthly target value (number or numeric string from API). */
  value: number | string;
}

export interface ProjectionPoint {
  /** ISO date string for the 1st of the month (UTC). */
  month: string;
  /** Required compound (CAGR) path from NAV → target by endYear. `null` when not computable. */
  required: number | null;
  /** Compound projection at historical APY. `null` when not computable. */
  current: number | null;
  /** Compound projection at user-supplied what-if APY. `null` when input is null. */
  whatIf: number | null;
  /** Saved monthly plan value at this month (matched by ISO month key). `null` when missing. */
  plan: number | null;
}

export interface BuildProjectionSeriesInput {
  navNow: number;
  target: number;
  /** Historical annual yield in percent (e.g. 12 for 12%). */
  historicalApyPct: number;
  /** What-if annual yield in percent. `null` hides the series. */
  whatIfApyPct: number | null;
  /** Saved monthly targets (the blue plan line). */
  planTargets: PlanTargetInput[];
  /** Anchor date — typically `new Date()`. Snapped to the 1st of the month UTC. */
  startDate: Date;
  /** Optional override for the goal year. Defaults to `VISION_TARGET_YEAR`. */
  endYear?: number;
}

/** Convert a percent value (e.g. 12.5) to a decimal rate (0.125). Safe for null/NaN. */
export function pctToDecimal(percent: number | null | undefined): number {
  const n = Number(percent ?? 0);
  return Number.isFinite(n) ? n / 100 : 0;
}

/**
 * Compound annual growth rate required to grow `navNow` to `target` over `years`.
 * Returns 0 in degenerate cases (no NAV, no target, target already met, or no time).
 */
export function requiredCAGR(navNow: number, target: number, years: number): number {
  if (!Number.isFinite(navNow) || !Number.isFinite(target) || !Number.isFinite(years)) return 0;
  if (navNow <= 0 || target <= 0 || years <= 0) return 0;
  if (target <= navNow) return 0;
  return Math.pow(target / navNow, 1 / years) - 1;
}

/**
 * Project `navNow` forward `months` steps using `annualRate` compounded monthly.
 * Returns `months + 1` points; element 0 is `navNow`. Money-rounded.
 *
 * Monthly rate r_m = (1 + r_a)^(1/12) - 1, so 12 monthly steps reproduce r_a annually.
 */
export function compoundProjection(
  navNow: number,
  annualRate: number,
  months: number,
): number[] {
  if (!Number.isFinite(navNow) || !Number.isFinite(annualRate) || !Number.isFinite(months)) {
    return [];
  }
  if (months < 0) return [];
  const monthlyRate =
    annualRate === 0 ? 0 : Math.pow(1 + annualRate, 1 / 12) - 1;
  const out: number[] = new Array(months + 1);
  let value = navNow;
  out[0] = roundToMoney(value);
  for (let i = 1; i <= months; i++) {
    value = value * (1 + monthlyRate);
    out[i] = roundToMoney(value);
  }
  return out;
}

/** Snap a date to the 1st of its month at UTC midnight. */
export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Number of whole months between two UTC month-anchors (a → b). Negative if b precedes a. */
export function monthsBetweenUTC(a: Date, b: Date): number {
  const aMonth = a.getUTCFullYear() * 12 + a.getUTCMonth();
  const bMonth = b.getUTCFullYear() * 12 + b.getUTCMonth();
  return bMonth - aMonth;
}

/**
 * Build the full series for the chart. Always returns one point per month from the
 * start anchor (snapped to 1st-of-month UTC) up to and including December of `endYear`.
 *
 * If the start anchor is already past `endYear`, returns an empty array (caller renders
 * an empty state).
 */
export function buildProjectionSeries(input: BuildProjectionSeriesInput): ProjectionPoint[] {
  const {
    navNow,
    target,
    historicalApyPct,
    whatIfApyPct,
    planTargets,
    startDate,
    endYear = VISION_TARGET_YEAR,
  } = input;

  const start = startOfMonthUTC(startDate);
  const end = new Date(Date.UTC(endYear, 11, 1));
  const totalMonths = monthsBetweenUTC(start, end);
  if (totalMonths < 0) return [];

  const yearsToTarget = totalMonths / 12;
  const requiredRate = requiredCAGR(navNow, target, yearsToTarget);
  const currentRate = pctToDecimal(historicalApyPct);
  const hasWhatIf =
    whatIfApyPct !== null &&
    whatIfApyPct !== undefined &&
    Number.isFinite(whatIfApyPct);
  const whatIfRate = hasWhatIf ? pctToDecimal(whatIfApyPct) : 0;

  const navIsValid = Number.isFinite(navNow) && navNow > 0;
  const targetIsValid = Number.isFinite(target) && target > 0;

  // Required: only meaningful when NAV>0 AND target>NAV AND yearsToTarget>0.
  const canDrawRequired =
    navIsValid && targetIsValid && target > navNow && yearsToTarget > 0;
  // Current/WhatIf: only meaningful when NAV>0.
  const canDrawCurrent = navIsValid;
  const canDrawWhatIf = navIsValid && hasWhatIf;

  const requiredSeries = canDrawRequired
    ? compoundProjection(navNow, requiredRate, totalMonths)
    : null;
  const currentSeries = canDrawCurrent
    ? compoundProjection(navNow, currentRate, totalMonths)
    : null;
  const whatIfSeries = canDrawWhatIf
    ? compoundProjection(navNow, whatIfRate, totalMonths)
    : null;

  // Index plan targets by month-key (ISO of 1st-of-month UTC) and clip to range.
  const planByMonth = new Map<string, number>();
  for (const row of planTargets) {
    const raw = row.month instanceof Date ? row.month : new Date(row.month);
    if (Number.isNaN(raw.getTime())) continue;
    const key = startOfMonthUTC(raw).toISOString();
    const v = typeof row.value === "string" ? Number(row.value) : row.value;
    if (!Number.isFinite(v)) continue;
    planByMonth.set(key, roundToMoney(v));
  }

  const points: ProjectionPoint[] = new Array(totalMonths + 1);
  for (let i = 0; i <= totalMonths; i++) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const key = date.toISOString();
    const planValue = planByMonth.has(key) ? (planByMonth.get(key) as number) : null;
    points[i] = {
      month: key,
      required: requiredSeries ? requiredSeries[i] : null,
      current: currentSeries ? currentSeries[i] : null,
      whatIf: whatIfSeries ? whatIfSeries[i] : null,
      plan: planValue,
    };
  }

  return points;
}
