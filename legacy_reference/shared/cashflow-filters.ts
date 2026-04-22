import type { Cashflow } from "./schema";

/** Any scheduled payment not yet received (expected, upcoming, or legacy/import statuses). */
export function isPendingCashflow(cf: Pick<Cashflow, "status">): boolean {
  return cf.status !== "received";
}
