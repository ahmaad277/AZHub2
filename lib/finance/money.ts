/**
 * Money helpers — always treat money as a 2-decimal SAR value.
 * All math passes through these helpers to avoid halala (فلس) drift.
 */

export const MONEY_SCALE = 100; // two decimals

export function roundToMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Adding Number.EPSILON mitigates floating-point representation issues such
  // as 1.005 being stored as 1.004999... which would otherwise round DOWN to 1.
  return Math.round((value + Number.EPSILON) * MONEY_SCALE) / MONEY_SCALE;
}

/**
 * Splits a total into N equal parts without losing any halalah.
 * Any rounding residue is added to the LAST element.
 *
 * Example: splitMoneyEvenly(100, 3) -> [33.33, 33.33, 33.34]
 */
export function splitMoneyEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  if (parts === 1) return [roundToMoney(total)];
  const rounded = roundToMoney(total);
  const per = Math.floor((rounded * MONEY_SCALE) / parts) / MONEY_SCALE;
  const result = new Array<number>(parts).fill(per);
  const distributed = roundToMoney(per * parts);
  const residue = roundToMoney(rounded - distributed);
  result[parts - 1] = roundToMoney(result[parts - 1] + residue);
  return result;
}

export function sumMoney(values: Array<number | string | null | undefined>): number {
  let total = 0;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    const n = typeof v === "string" ? Number(v) : v;
    if (Number.isFinite(n)) total += n;
  }
  return roundToMoney(total);
}

export function parseMoney(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(n) ? roundToMoney(n) : 0;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "SAR",
  locale = "en-US",
): string {
  const n = parseMoney(value);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(
  value: number | string | null | undefined,
  locale = "en-US",
  fractionDigits = 0,
): string {
  const n = typeof value === "string" ? Number(value) : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n);
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 2,
  locale = "en-US",
): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0%";
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(n)}%`;
}
