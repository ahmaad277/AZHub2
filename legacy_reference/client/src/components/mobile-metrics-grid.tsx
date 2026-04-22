import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatPercentage, METRIC_COLOR_MAP, cn } from "@/lib/utils";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Droplet, 
  Percent, 
  Target, 
  Calendar, 
  Activity,
  CheckCircle,
  Clock,
  Hourglass,
  XCircle
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface MobileMetricsGridProps {
  metrics: DashboardMetrics;
}

export function MobileMetricsGrid({ metrics }: MobileMetricsGridProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const metricCards = [
    {
      id: "portfolio-value",
      icon: Wallet,
      label: isRTL ? "قيمة المحفظة" : "Portfolio Value",
      value: formatCurrency(metrics.portfolioValue),
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      id: "cash-available",
      icon: DollarSign,
      label: isRTL ? "الكاش المتاح" : "Cash Available",
      value: formatCurrency(metrics.totalCash),
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      id: "active-apr",
      icon: TrendingUp,
      label: isRTL ? "العائد السنوي النشط" : "Active Annual Return",
      value: formatPercentage(metrics.activeAPR),
      subtitle: isRTL 
        ? "متوسط العائد السنوي للفرص (القائمة والمتأخرة والمتعثرة)" 
        : "Average annual return for active, late, and defaulted opportunities",
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "cash-ratio",
      icon: Droplet,
      label: isRTL ? "نسبة الكاش" : "Cash Ratio",
      value: formatPercentage(metrics.cashRatio),
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
    {
      id: "weighted-apr",
      icon: Percent,
      label: isRTL ? "متوسط العائد السنوي التاريخي" : "Historical Average APR",
      value: formatPercentage(metrics.weightedAPR),
      subtitle: isRTL 
        ? "متوسط العائد السنوي لجميع فرص المحفظة" 
        : "Average annual return for all portfolio opportunities",
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "roi",
      icon: Target,
      label: isRTL ? "العائد على الاستثمار" : "Portfolio ROI",
      value: formatPercentage(metrics.portfolioROI),
      colorLight: METRIC_COLOR_MAP.roi.colorLight,
      colorDark: METRIC_COLOR_MAP.roi.colorDark,
      bgColor: METRIC_COLOR_MAP.roi.bgColor,
    },
    {
      id: "avg-duration",
      icon: Calendar,
      label: isRTL ? "متوسط المدة" : "Avg Duration",
      value: isRTL ? `${metrics.avgDuration} شهر` : `${metrics.avgDuration} months`,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      id: "avg-amount",
      icon: DollarSign,
      label: isRTL ? "متوسط القيمة" : "Avg Amount",
      value: formatCurrency(metrics.avgAmount),
      color: "text-chart-5",
      bgColor: "bg-chart-5/10",
    },
  ];

  const statusCards = [
    {
      id: "total",
      icon: Activity,
      label: isRTL ? "إجمالي الاستثمارات" : "Total Investments",
      value: metrics.totalInvestments,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-600/10",
    },
    {
      id: "live",
      icon: Activity,
      label: isRTL ? "قائمة" : "Live",
      value: metrics.liveInvestmentsCount,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-600/10",
    },
    {
      id: "pending",
      icon: Hourglass,
      label: isRTL ? "معلقة" : "Pending",
      value: metrics.pendingInvestments,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-600/10",
    },
    {
      id: "completed",
      icon: CheckCircle,
      label: isRTL ? "منتهية" : "Completed",
      value: metrics.completedInvestments,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-600/10",
    },
    {
      id: "late",
      icon: Clock,
      label: isRTL ? "متأخرة" : "Late",
      value: metrics.lateInvestments,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-600/10",
    },
    {
      id: "defaulted",
      icon: XCircle,
      label: isRTL ? "متعثرة" : "Defaulted",
      value: metrics.defaultedInvestments,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-600/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Financial Metrics Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3" data-testid="heading-financial-metrics">
          {isRTL ? "المؤشرات المالية" : "Financial Metrics"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card 
                key={card.id} 
                className="hover-elevate transition-all duration-200" 
                data-testid={`metric-card-${card.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1.5 pt-3 px-3.5">
                  <CardTitle className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground break-words leading-snug">
                    {card.label}
                  </CardTitle>
                  <div className={`${card.bgColor} ${card.color} rounded-md p-1.5 shrink-0`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
                <CardContent className="px-3.5 pb-3 pt-0.5">
                  <div className={cn("text-lg sm:text-xl font-bold", card.colorLight, card.colorDark)} data-testid={`metric-value-${card.id}`}>
                    {card.value}
                  </div>
                  {card.subtitle && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 break-words leading-relaxed" data-testid={`metric-subtitle-${card.id}`}>
                      {card.subtitle}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Status Counters Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3" data-testid="heading-status-counters">
          {isRTL ? "حالة الاستثمارات" : "Investment Status"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card 
                key={card.id} 
                className="hover-elevate transition-all duration-200" 
                data-testid={`status-card-${card.id}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1.5 pt-3 px-3.5">
                  <CardTitle className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground break-words leading-snug">
                    {card.label}
                  </CardTitle>
                  <div className={`${card.bgColor} ${card.color} rounded-md p-1.5 shrink-0`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </CardHeader>
                <CardContent className="px-3.5 pb-3 pt-0.5">
                  <div className={cn("text-2xl font-bold", card.color)} data-testid={`status-value-${card.id}`}>
                    {card.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
