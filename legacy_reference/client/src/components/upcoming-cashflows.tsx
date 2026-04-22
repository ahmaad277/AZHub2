import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { TrendingUp } from "lucide-react";
import type { CashflowWithInvestment } from "@shared/schema";
import { isPendingCashflow } from "@shared/cashflow-filters";

export function UpcomingCashflows() {
  const { t } = useLanguage();
  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const upcoming = cashflows
    ?.filter((cf) => isPendingCashflow(cf))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (!upcoming || upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="empty-state-upcoming-cashflows">
        <div className="rounded-full bg-muted p-3 mb-3">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("cashflows.noCashflows")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.map((cashflow) => (
        <div
          key={cashflow.id}
          className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
          data-testid={`upcoming-cashflow-${cashflow.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm break-words leading-snug whitespace-normal">
              {cashflow.investment.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(cashflow.dueDate)}
            </div>
          </div>
          <div className="text-end">
            <div className="font-semibold text-sm text-chart-2 tabular-nums">
              {formatCurrency(cashflow.amount)}
            </div>
            <Badge
              variant="outline"
              className={`mt-1 text-xs ${
                cashflow.status === "expected"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted"
              }`}
              data-testid={`badge-status-${cashflow.status}`}
            >
              {t(
                cashflow.status === "expected" || cashflow.status === "upcoming"
                  ? `cashflows.${cashflow.status}`
                  : "cashflows.pending"
              )}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
