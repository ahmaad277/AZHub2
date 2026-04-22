/**
 * Auto-generates Cashflow rows for an Investment based on its
 * distribution_frequency, dividing expected_profit equally across the periods
 * and placing the principal return on the end_date.
 *
 * This is SSOT for all automatic schedule generation. The frontend must never
 * duplicate this logic — it should call POST /api/investments/preview-schedule
 * when it needs to show a preview.
 */

import { addMonths } from "./date-smart";
import { splitMoneyEvenly, roundToMoney } from "./money";

export type DistributionFrequency =
  | "monthly"
  | "quarterly"
  | "semi_annually"
  | "annually"
  | "at_maturity"
  | "custom";

export interface ScheduleInput {
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  principalAmount: number;
  expectedProfit: number;
  frequency: DistributionFrequency;
}

export interface ScheduleRow {
  dueDate: Date;
  amount: number;
  type: "profit" | "principal";
  isCustomSchedule: boolean;
}

/** How many profit periods fit in `months` for the given frequency. */
function periodsForFrequency(
  frequency: DistributionFrequency,
  months: number,
): number {
  switch (frequency) {
    case "monthly":
      return Math.max(1, Math.floor(months));
    case "quarterly":
      return Math.max(1, Math.floor(months / 3));
    case "semi_annually":
      return Math.max(1, Math.floor(months / 6));
    case "annually":
      return Math.max(1, Math.floor(months / 12));
    case "at_maturity":
    case "custom":
      return 0; // custom handled separately; at_maturity has no profit rows
    default:
      return 1;
  }
}

function monthsPerPeriod(frequency: DistributionFrequency): number {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "semi_annually":
      return 6;
    case "annually":
      return 12;
    default:
      return 0;
  }
}

export function generateSchedule(input: ScheduleInput): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const {
    startDate,
    endDate,
    durationMonths,
    principalAmount,
    expectedProfit,
    frequency,
  } = input;

  // at_maturity: a single profit + principal row on endDate.
  if (frequency === "at_maturity") {
    if (expectedProfit > 0) {
      rows.push({
        dueDate: endDate,
        amount: roundToMoney(expectedProfit),
        type: "profit",
        isCustomSchedule: false,
      });
    }
    rows.push({
      dueDate: endDate,
      amount: roundToMoney(principalAmount),
      type: "principal",
      isCustomSchedule: false,
    });
    return rows;
  }

  // custom: no auto-generation — caller supplies rows explicitly.
  if (frequency === "custom") {
    return rows;
  }

  const periods = periodsForFrequency(frequency, durationMonths);
  const step = monthsPerPeriod(frequency);
  const parts = splitMoneyEvenly(expectedProfit, periods);

  for (let i = 0; i < periods; i++) {
    // Each period's due date = startDate + (i+1) * step months.
    const due = addMonths(startDate, (i + 1) * step);
    // Clamp the very last profit due date to endDate to keep things aligned.
    const effectiveDue = i === periods - 1 ? endDate : due;
    if (parts[i] > 0) {
      rows.push({
        dueDate: effectiveDue,
        amount: roundToMoney(parts[i]),
        type: "profit",
        isCustomSchedule: false,
      });
    }
  }

  // Principal return always on endDate.
  rows.push({
    dueDate: endDate,
    amount: roundToMoney(principalAmount),
    type: "principal",
    isCustomSchedule: false,
  });

  return rows;
}
