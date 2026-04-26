/**
 * Pure-TS status resolver. Used for places where we already have cashflows
 * in memory (e.g. API responses, tests). The authoritative production
 * computation still comes from the `investment_status_view` SQL view.
 */

import { daysBetween } from "./date-smart";
import type { DerivedInvestmentStatus } from "@/db/schema";

export interface StatusInputCashflow {
  status: "pending" | "received";
  dueDate: Date;
  type: "profit" | "principal";
}

export interface StatusInput {
  endDate: Date;
  cashflows: StatusInputCashflow[];
}

/**
 * Grace period in days before a pending cashflow tips the investment into
 * "defaulted". 1..90 days overdue → "late".
 */
export const DEFAULT_GRACE_DAYS = 90;

export type ResolvedIssueStatus = "late" | "defaulted";

export function classifyResolvedIssueDays(
  days: number,
  graceDays: number = DEFAULT_GRACE_DAYS,
): ResolvedIssueStatus | null {
  if (days <= 0) return null;
  return days > graceDays ? "defaulted" : "late";
}

export function getPrincipalOverdueDays(
  cashflows: StatusInputCashflow[],
  now: Date,
): number {
  let maxOverdue = 0;
  for (const cf of cashflows) {
    if (
      cf.type === "principal" &&
      cf.status === "pending" &&
      cf.dueDate.getTime() < now.getTime()
    ) {
      const d = daysBetween(cf.dueDate, now);
      if (d > maxOverdue) maxOverdue = d;
    }
  }
  return maxOverdue;
}

export function resolveStatus(
  input: StatusInput,
  now: Date = new Date(),
  graceDays: number = DEFAULT_GRACE_DAYS,
): { status: DerivedInvestmentStatus; overdueDays: number } {
  const cfs = input.cashflows ?? [];

  if (cfs.length === 0) {
    return {
      status: input.endDate.getTime() < now.getTime() ? "completed" : "active",
      overdueDays: 0,
    };
  }

  const pending = cfs.filter((c) => c.status === "pending");
  const received = cfs.filter((c) => c.status === "received");

  if (pending.length === 0 && received.length > 0) {
    return { status: "completed", overdueDays: 0 };
  }

  const maxOverdue = getPrincipalOverdueDays(cfs, now);

  const resolvedIssueStatus = classifyResolvedIssueDays(maxOverdue, graceDays);
  if (resolvedIssueStatus) {
    return { status: resolvedIssueStatus, overdueDays: maxOverdue };
  }
  return { status: "active", overdueDays: 0 };
}
