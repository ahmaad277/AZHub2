import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage, formatDate, calculateDaysUntil, getInvestmentStatusConfig, METRIC_COLOR_MAP, cn, formatInvestmentDisplayName } from "@/lib/utils";
import {
  getDisplayRoiPercent,
  getInvestmentDurationMonths,
  getNetExpectedProfitForDisplay,
} from "@/lib/investment-display-metrics";
import { useLanguage } from "@/lib/language-provider";
import { Edit, TrendingUp, Calendar, Target, AlertTriangle, Clock, DollarSign, CheckCircle } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";

interface InvestmentCardProps {
  investment: InvestmentWithPlatform;
  totalReturns?: number;
  onEdit: () => void;
  onCompletePayment?: () => void;
}

export function InvestmentCard({ investment, totalReturns = 0, onEdit, onCompletePayment }: InvestmentCardProps) {
  const { t } = useLanguage();
  const daysRemaining = calculateDaysUntil(investment.endDate);
  const isActive = investment.status === "active";
  const isCompleted = investment.status === "completed";
  
  const durationMonths = getInvestmentDurationMonths(investment.startDate, investment.endDate);
  const expectedProfit = getNetExpectedProfitForDisplay(investment);

  const roi = getDisplayRoiPercent(investment, totalReturns);
  const hasReturns = totalReturns > 0;
  
  // Calculate delay duration for completed investments
  const delayDays =
    isCompleted && investment.actualEndDate && investment.endDate
      ? Math.floor(
          (new Date(investment.actualEndDate).getTime() - new Date(investment.endDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const isDelayed = delayDays > 0;
  const isDistressed = delayDays >= 90; // 3+ months delay

  // Format delay display
  const getDelayDisplay = () => {
    if (delayDays >= 30) {
      const months = Math.floor(delayDays / 30);
      return `${months}${t("investments.durationShortSuffix")}`;
    }
    return `${delayDays}${t("investments.delayShortSuffix")}`;
  };

  const statusConfig = getInvestmentStatusConfig(investment.status);
  const platformBadgeClasses = getPlatformBadgeClasses(investment.platform?.name);
  const platformBorderClasses = getPlatformBorderClasses(investment.platform?.name);

  return (
    <Card className={`hover-elevate transition-all duration-200 border-s-4 ${platformBorderClasses}`} data-testid={`card-investment-${investment.id}`}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            {investment.platform && (
              <Badge variant="outline" className={`mb-2 text-xs ${platformBadgeClasses}`}>
                {investment.platform.name}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg break-words leading-snug min-w-0">
                {formatInvestmentDisplayName(investment, t("investments.number"))}
              </CardTitle>
              {investment.needsReview === 1 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30 text-xs px-2 py-0.5 h-5 shrink-0" data-testid="badge-needs-review">
                  <AlertTriangle className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                  {t("investments.reviewBadge")}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={statusConfig.badge} variant="outline" data-testid={`badge-status-${investment.status}`}>
            {t(`investments.${investment.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="app-card-muted-label mb-1">{t("investments.amount")}</div>
            <div className="text-lg font-bold tabular-nums">{formatCurrency(investment.faceValue)}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-semibold text-chart-2 tabular-nums" data-testid={`apr-${investment.id}`}>
                {formatPercentage(investment.expectedIrr)}
              </span>
              <span className={cn("text-sm font-semibold tabular-nums", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} data-testid={`roi-${investment.id}`}>
                {formatPercentage(roi)}
              </span>
            </div>
          </div>
          <div>
            <div className="app-card-muted-label mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t("investments.irr")}
            </div>
            <div className="text-lg font-bold text-chart-1 tabular-nums">{formatPercentage(investment.expectedIrr)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="app-card-muted-label mb-1">{t("investments.expectedProfit")}</div>
            <div className="text-lg font-bold text-primary tabular-nums">{formatCurrency(expectedProfit)}</div>
          </div>
          <div>
            <div className="app-card-muted-label mb-1">{t("investments.duration")}</div>
            <div className="text-lg font-bold tabular-nums">
              {durationMonths} {t("investments.months")}
            </div>
          </div>
        </div>
        
        {hasReturns && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="app-card-muted-label mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {t("investments.actualROI")}
              </div>
              <div className={cn("text-lg font-bold tabular-nums", roi >= 0 ? cn(METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark) : 'text-destructive')} data-testid={`stat-roi-${investment.id}`}>
                {formatPercentage(roi)}
              </div>
            </div>
            <div>
              <div className="app-card-muted-label mb-1">{t("dashboard.totalReturns")}</div>
              <div className="text-lg font-bold text-chart-2 tabular-nums">{formatCurrency(totalReturns)}</div>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm sm:text-base">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t("investments.startDate")}: {formatDate(investment.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{t("investments.expectedEndDate")}: {formatDate(investment.endDate)}</span>
          </div>
          {isCompleted && investment.actualEndDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={isDelayed ? "text-destructive font-medium" : "text-muted-foreground"}>
                {t("investments.actualEndDate")}: {formatDate(investment.actualEndDate)}
              </span>
            </div>
          )}
          {isActive && daysRemaining > 0 && (
            <div className="text-xs text-primary font-medium">
              {daysRemaining} {t("investments.daysRemaining")}
            </div>
          )}
          {isDelayed && (
            <div className={`flex items-center gap-2 text-xs font-medium ${isDistressed ? "text-destructive" : "text-orange-500"}`} data-testid="delay-indicator">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("investments.delayed")} {getDelayDisplay()}</span>
              {isDistressed && <Badge variant="destructive" className="ltr:ml-1 rtl:mr-1 text-xs">{t("investments.distressed")}</Badge>}
            </div>
          )}
        </div>

        {investment.riskScore !== null && (
          <div>
            <div className="app-card-muted-label mb-2">{t("investments.riskScore")}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    investment.riskScore < 30
                      ? "bg-chart-2"
                      : investment.riskScore < 70
                      ? "bg-primary"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${investment.riskScore}%` }}
                />
              </div>
              <span className="text-sm font-medium">{investment.riskScore}/100</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4 gap-2">
        {isActive && onCompletePayment && (
          <Button
            variant="default"
            size="sm"
            onClick={onCompletePayment}
            data-testid={`button-complete-payment-${investment.id}`}
            className="flex-1 hover-elevate"
          >
                <CheckCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t("investments.confirmPayment") || "Confirm Payment"}
          </Button>
        )}
        <Button
          variant={isActive ? "outline" : "ghost"}
          size="sm"
          onClick={onEdit}
          data-testid={`button-edit-investment-${investment.id}`}
          className={isActive && onCompletePayment ? "flex-1 hover-elevate" : "w-full hover-elevate"}
        >
          <Edit className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("investments.editInvestment")}
        </Button>
      </CardFooter>
    </Card>
  );
}
