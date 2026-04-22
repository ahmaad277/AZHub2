import type { CashflowWithInvestment, CashTransaction } from "@shared/schema";

export type TimelineEventKind = "cashflow" | "cashTransaction";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  date: Date;
  title: string;
  subtitle: string;
  amount: number;
  investmentId?: string;
  platformId?: string;
  status?: string;
  direction: "in" | "out";
}

export function buildTimelineEvents(
  cashflows: CashflowWithInvestment[],
  cashTransactions: CashTransaction[],
): TimelineEvent[] {
  const cashflowEvents: TimelineEvent[] = cashflows.map((cf) => ({
    id: `cf-${cf.id}`,
    kind: "cashflow",
    date: new Date(cf.dueDate),
    title: cf.investment.name,
    subtitle: `${cf.investment.platform.name} • ${cf.type}`,
    amount: Number.parseFloat(String(cf.amount || 0)),
    investmentId: cf.investmentId,
    platformId: cf.investment.platformId,
    status: cf.status,
    direction: "in",
  }));

  const cashTransactionEvents: TimelineEvent[] = cashTransactions.map((tx) => {
    const amount = Number.parseFloat(String(tx.amount || 0));
    const direction = tx.type === "deposit" || tx.type === "distribution" ? "in" : "out";

    return {
      id: `ct-${tx.id}`,
      kind: "cashTransaction",
      date: new Date(tx.date),
      title: tx.type,
      subtitle: tx.source || "-",
      amount,
      investmentId: tx.investmentId || undefined,
      platformId: tx.platformId || undefined,
      direction,
    };
  });

  return [...cashflowEvents, ...cashTransactionEvents].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export function filterTimelineEventsByRange(
  events: TimelineEvent[],
  range?: { start: Date; end: Date },
): TimelineEvent[] {
  if (!range) return events;
  const start = range.start.getTime();
  const end = range.end.getTime();
  return events.filter((event) => {
    const at = event.date.getTime();
    return at >= start && at <= end;
  });
}
