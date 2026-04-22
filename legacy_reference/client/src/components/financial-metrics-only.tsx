import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatPercentage, METRIC_COLOR_MAP, cn } from "@/lib/utils";
import { CombinedChartsCard } from "@/components/combined-charts-card";
import {
  Wallet,
  Landmark,
  DollarSign,
  TrendingUp,
  Droplet,
  Percent,
  Target,
  Banknote,
  Clock,
  LineChart,
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface FinancialMetricsOnlyProps {
  metrics: DashboardMetrics;
}

export function FinancialMetricsOnly({ metrics }: FinancialMetricsOnlyProps) {
  const { t } = useLanguage();

  const metricCards = [
    {
      id: "total-aum",
      icon: Wallet,
      label: t("metrics.totalAum"),
      value: formatCurrency(metrics.totalAum),
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      id: "active-principal",
      icon: Landmark,
      label: t("metrics.activePrincipal"),
      value: formatCurrency(metrics.activePrincipal),
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      id: "liquidity-cash",
      icon: DollarSign,
      label: t("metrics.liquidityCash"),
      value: formatCurrency(metrics.totalCash),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "realized-gains",
      icon: Target,
      label: t("metrics.realizedGains"),
      value: formatPercentage(metrics.portfolioROI),
      secondaryValue: formatCurrency(metrics.totalProfitAmount),
      colorLight: METRIC_COLOR_MAP.roi.colorLight,
      colorDark: METRIC_COLOR_MAP.roi.colorDark,
      bgColor: METRIC_COLOR_MAP.roi.bgColor,
    },
    {
      id: "pending-settlements",
      icon: Clock,
      label: t("metrics.pendingSettlements"),
      value: formatCurrency(metrics.pendingSettlementsAmount),
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      id: "principal-repaid",
      icon: Banknote,
      label: t("metrics.principalRepaid"),
      value: formatCurrency(metrics.principalRepaid),
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      id: "portfolio-cagr",
      icon: LineChart,
      label: t("metrics.portfolioCagr"),
      value: formatPercentage(metrics.portfolioCagr),
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "active-apr",
      icon: TrendingUp,
      label: t("metrics.activeAPR"),
      value: formatPercentage(metrics.activeAPR),
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "weighted-apr",
      icon: Percent,
      label: t("metrics.historicalAPR"),
      value: formatPercentage(metrics.weightedAPR),
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "cash-ratio",
      icon: Droplet,
      label: t("metrics.cashRatio"),
      value: formatPercentage(metrics.cashRatio),
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="hover-elevate flex flex-col min-h-[6rem] sm:min-h-[6.5rem] md:min-h-[7rem]"
              data-testid={`metric-card-${card.id}`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-1.5 space-y-0 pb-1 pt-2 px-2.5 sm:px-3 md:px-3.5">
                <CardTitle className="app-stat-card-label whitespace-normal">
                  {card.label}
                </CardTitle>
                <div className={`${card.bgColor} ${card.color} rounded-md p-1.5 sm:p-2 shrink-0`}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[1.125rem] md:w-[1.125rem]" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-2.5 sm:px-3 md:px-3.5 pb-2 sm:pb-2.5">
                {card.secondaryValue ? (
                  <div className="flex flex-col gap-0.5">
                    <div
                      className={cn(
                        "app-stat-card-value",
                        card.colorLight,
                        card.colorDark
                      )}
                      data-testid={`metric-value-${card.id}`}
                    >
                      {card.value}
                    </div>
                    <div
                      className="app-stat-card-secondary break-words"
                      data-testid={`metric-secondary-value-${card.id}`}
                    >
                      {card.secondaryValue}
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "app-stat-card-value",
                      card.colorLight,
                      card.colorDark,
                      card.color
                    )}
                    data-testid={`metric-value-${card.id}`}
                  >
                    {card.value}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CombinedChartsCard metrics={metrics} />
    </div>
  );
}
