import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Clock, BarChart3, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { calculateDefaultRate, getSeverityColors } from "@/lib/platform-metrics";
import type { Platform, InvestmentWithPlatform } from "@shared/schema";

interface PlatformCardProps {
  platform: Platform;
  investments: InvestmentWithPlatform[];
  totalReturns: number;
  totalLiveCapital: number;
  averageIrr: number;
  averageDurationMonths: number;
  liveCount: number;
  onClick?: () => void;
}

export function PlatformCard({
  platform,
  investments,
  totalReturns,
  totalLiveCapital,
  averageIrr,
  averageDurationMonths,
  liveCount,
  onClick,
}: PlatformCardProps) {
  const { t } = useLanguage();

  const defaultRateData = calculateDefaultRate(investments);
  const severityColors = getSeverityColors(defaultRateData.severity);

  return (
    <Card
      className="hover-elevate active-elevate-2 cursor-pointer group"
      onClick={onClick}
      data-testid={`card-platform-${platform.id}`}
    >
      <CardContent className="p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {platform.logoUrl ? (
                <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">{platform.name[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base leading-tight break-words">{platform.name}</h3>
              <p className="app-card-muted-label">
                {liveCount} {t("dashboard.investments")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {defaultRateData.totalCount > 0 && (
              <Badge
                className={`${severityColors.bg} ${severityColors.text} border-none flex items-center gap-0.5 px-1.5 py-0`}
                data-testid="badge-default-rate"
              >
                {defaultRateData.severity === "low" ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                <span className="text-xs font-semibold">{defaultRateData.rate.toFixed(1)}%</span>
              </Badge>
            )}
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm sm:text-base">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 app-card-muted-label">
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("dashboard.capital")}</span>
            </div>
            <p className="font-semibold text-sm sm:text-base tabular-nums">{formatCurrency(totalLiveCapital)}</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1 app-card-muted-label">
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("dashboard.returns")}</span>
            </div>
            <p className="font-semibold text-sm sm:text-base text-chart-2 tabular-nums">{formatCurrency(totalReturns)}</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1 app-card-muted-label">
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("dashboard.irr")}</span>
            </div>
            <p className="font-semibold text-sm sm:text-base text-chart-1 tabular-nums">{formatPercentage(averageIrr)}</p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-1 app-card-muted-label">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("dashboard.duration")}</span>
            </div>
            <p className="font-semibold text-sm sm:text-base tabular-nums">
              {averageDurationMonths > 0 ? (
                <>
                  {Math.round(averageDurationMonths * 10) / 10} {t("dashboard.months")}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
