/**
 * Smart date helpers for the "enter duration OR enter end-date" UX.
 *
 * Rule: durationMonths is an INTEGER. When derived from an endDate, we compute
 * the number of whole months between start and end (floor), minimum 1.
 */

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getUTCMonth() + months;
  const result = new Date(Date.UTC(d.getUTCFullYear(), targetMonth, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
  // If the source day is 31 and target month has 30 days, JS will roll forward; clamp.
  if (result.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setUTCDate(0); // last day of previous month
  }
  return result;
}

export function endDateFromDuration(startDate: Date, durationMonths: number): Date {
  const months = Math.max(1, Math.floor(durationMonths));
  return addMonths(startDate, months);
}

export function durationFromEndDate(startDate: Date, endDate: Date): number {
  if (endDate.getTime() <= startDate.getTime()) return 1;
  const yearDiff = endDate.getUTCFullYear() - startDate.getUTCFullYear();
  const monthDiff = endDate.getUTCMonth() - startDate.getUTCMonth();
  let months = yearDiff * 12 + monthDiff;
  // If end day is before start day, we haven't hit the next month boundary yet.
  if (endDate.getUTCDate() < startDate.getUTCDate()) months -= 1;
  return Math.max(1, months);
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

export function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
