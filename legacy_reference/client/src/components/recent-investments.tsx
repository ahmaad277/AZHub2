import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatPercentage, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Wallet } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";

export function RecentInvestments() {
  const { t } = useLanguage();
  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const recent = investments
    ?.sort((a, b) => {
      const ta = a.startDate ? new Date(a.startDate).getTime() : 0;
      const tb = b.startDate ? new Date(b.startDate).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 5);

  if (!recent || recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="empty-state-recent-investments">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Wallet className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{t("investments.noInvestmentsYet")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards — no horizontal table scroll */}
      <div className="space-y-3 sm:hidden">
        {recent.map((investment) => (
          <div
            key={investment.id}
            className="rounded-lg border p-3 space-y-2"
            data-testid={`recent-investment-card-${investment.id}`}
          >
            <div className="font-medium break-words leading-snug">
              {formatInvestmentDisplayName(investment, "")}
            </div>
            <Badge variant="outline" className="text-xs">
              {investment.platform.name}
            </Badge>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t("investments.amount")}</p>
                <p className="font-semibold tabular-nums">{formatCurrency(investment.faceValue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("investments.irr")}</p>
                <p className="font-medium text-chart-1 tabular-nums">{formatPercentage(investment.expectedIrr)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("investments.startDate")}</p>
                <p className="text-muted-foreground tabular-nums">{formatDate(investment.startDate)}</p>
              </div>
              <div className="flex items-end">
                <Badge
                  variant="outline"
                  className={`capitalize ${
                    investment.status === "active"
                      ? "bg-chart-2/10 text-chart-2"
                      : "bg-muted"
                  }`}
                  data-testid={`badge-status-${investment.status}`}
                >
                  {t(`investments.${investment.status}`)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-start text-sm text-muted-foreground">
              <th className="pb-3 font-medium">{t("investments.title")}</th>
              <th className="pb-3 font-medium">{t("dialog.platform")}</th>
              <th className="pb-3 font-medium">{t("investments.amount")}</th>
              <th className="pb-3 font-medium">{t("investments.irr")}</th>
              <th className="pb-3 font-medium">{t("investments.startDate")}</th>
              <th className="pb-3 font-medium">{t("investments.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {recent.map((investment) => (
              <tr
                key={investment.id}
                className="hover-elevate transition-colors"
                data-testid={`recent-investment-${investment.id}`}
              >
                <td className="py-3">
                  <div className="font-medium break-words leading-snug whitespace-normal">{formatInvestmentDisplayName(investment, "")}</div>
                </td>
                <td className="py-3">
                  <Badge variant="outline" className="text-xs">
                    {investment.platform.name}
                  </Badge>
                </td>
                <td className="py-3 font-semibold tabular-nums">
                  {formatCurrency(investment.faceValue)}
                </td>
                <td className="py-3 text-chart-1 font-medium tabular-nums">
                  {formatPercentage(investment.expectedIrr)}
                </td>
                <td className="py-3 text-sm text-muted-foreground tabular-nums">
                  {formatDate(investment.startDate)}
                </td>
                <td className="py-3">
                  <Badge
                    variant="outline"
                    className={`capitalize ${
                      investment.status === "active"
                        ? "bg-chart-2/10 text-chart-2"
                        : "bg-muted"
                    }`}
                    data-testid={`badge-status-${investment.status}`}
                  >
                    {t(`investments.${investment.status}`)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
