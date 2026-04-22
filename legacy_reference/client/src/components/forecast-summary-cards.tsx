import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Calendar, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ForecastSummary {
  principal: number;
  profit: number;
  total: number;
}

interface ForecastSummaryCardsProps {
  month1: ForecastSummary;
  months3: ForecastSummary;
  months6: ForecastSummary;
  months12: ForecastSummary;
  months24: ForecastSummary;
  months60: ForecastSummary;
}

interface SummaryCardProps {
  title: string;
  period: string;
  principal: number;
  profit: number;
  total: number;
  icon: React.ReactNode;
  testId: string;
}

function SummaryCard({ title, period, principal, profit, total, icon, testId }: SummaryCardProps) {
  const { t } = useLanguage();

  return (
    <Card 
      className="hover-elevate transition-all duration-200" 
      data-testid={testId}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {icon}
              <span className="text-xs font-medium uppercase">{title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{period}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("forecast.total")}</span>
            <span className="text-lg font-bold" data-testid={`${testId}-total`}>
              {formatCurrency(total, "SAR")}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {t("forecast.principal")}
            </span>
            <span className="font-semibold text-blue-600" data-testid={`${testId}-principal`}>
              {formatCurrency(principal, "SAR")}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {t("forecast.profit")}
            </span>
            <span className="font-semibold text-green-600" data-testid={`${testId}-profit`}>
              {formatCurrency(profit, "SAR")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ForecastSummaryCards({
  month1,
  months3,
  months6,
  months12,
  months24,
  months60,
}: ForecastSummaryCardsProps) {
  const { t } = useLanguage();

  const summaries = [
    {
      key: "month1",
      title: t("forecast.period.month1"),
      period: t("forecast.period.month1Desc"),
      data: month1,
      icon: <Calendar className="h-4 w-4" />,
      testId: "card-forecast-1month",
    },
    {
      key: "months3",
      title: t("forecast.period.months3"),
      period: t("forecast.period.months3Desc"),
      data: months3,
      icon: <Calendar className="h-4 w-4" />,
      testId: "card-forecast-3months",
    },
    {
      key: "months6",
      title: t("forecast.period.months6"),
      period: t("forecast.period.months6Desc"),
      data: months6,
      icon: <Calendar className="h-4 w-4" />,
      testId: "card-forecast-6months",
    },
    {
      key: "months12",
      title: t("forecast.period.year1"),
      period: t("forecast.period.year1Desc"),
      data: months12,
      icon: <TrendingUp className="h-4 w-4" />,
      testId: "card-forecast-12months",
    },
    {
      key: "months24",
      title: t("forecast.period.years2"),
      period: t("forecast.period.years2Desc"),
      data: months24,
      icon: <DollarSign className="h-4 w-4" />,
      testId: "card-forecast-24months",
    },
    {
      key: "months60",
      title: t("forecast.period.years5"),
      period: t("forecast.period.years5Desc"),
      data: months60,
      icon: <DollarSign className="h-4 w-4" />,
      testId: "card-forecast-60months",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" data-testid="forecast-summary-cards">
      {summaries.map((summary) => (
        <SummaryCard
          key={summary.key}
          title={summary.title}
          period={summary.period}
          principal={summary.data.principal}
          profit={summary.data.profit}
          total={summary.data.total}
          icon={summary.icon}
          testId={summary.testId}
        />
      ))}
    </div>
  );
}
