import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/components/date-range-filter";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildTimelineEvents, filterTimelineEventsByRange } from "@/lib/timeline";
import type { CashflowWithInvestment, CashTransaction, InvestmentWithPlatform } from "@shared/schema";

interface FinanceTimelineProps {
  cashflows: CashflowWithInvestment[];
  cashTransactions: CashTransaction[];
  investments: InvestmentWithPlatform[];
  dateRange?: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date } | undefined) => void;
  onOpenInvestmentDetails: (investment: InvestmentWithPlatform) => void;
}

export function FinanceTimeline({
  cashflows,
  cashTransactions,
  investments,
  dateRange,
  onDateRangeChange,
  onOpenInvestmentDetails,
}: FinanceTimelineProps) {
  const { t } = useLanguage();

  const events = useMemo(() => {
    const all = buildTimelineEvents(cashflows, cashTransactions);
    return filterTimelineEventsByRange(all, dateRange);
  }, [cashflows, cashTransactions, dateRange]);

  return (
    <Card className="shadcn-card" data-testid="card-finance-timeline">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("financeTimeline.title")}</CardTitle>
          <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            {t("financeTimeline.empty")}
          </div>
        ) : (
          events.map((event) => {
            const investment = event.investmentId
              ? investments.find((inv) => inv.id === event.investmentId)
              : undefined;
            return (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
                data-testid={`timeline-event-${event.id}`}
              >
                <div className="min-w-0">
                  <p className="break-words leading-snug whitespace-normal text-sm font-semibold">{event.title}</p>
                  <p className="break-words leading-relaxed whitespace-normal text-xs text-muted-foreground">{event.subtitle}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {event.status && (
                    <Badge variant="outline" className="capitalize">
                      {event.status}
                    </Badge>
                  )}
                  <Badge variant={event.direction === "in" ? "default" : "destructive"}>
                    {event.direction === "in" ? "+" : "-"}
                    {formatCurrency(event.amount)}
                  </Badge>
                  {investment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenInvestmentDetails(investment)}
                      data-testid={`button-open-details-${event.id}`}
                    >
                      {t("financeTimeline.details")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
