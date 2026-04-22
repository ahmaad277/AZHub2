import { formatCurrency, formatPercentage, formatDate, getInvestmentStatusConfig, METRIC_COLOR_MAP, cn, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, Trash2, CheckCircle, X, Calendar, DollarSign, TrendingUp, Target, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { PaymentScheduleManager } from "@/components/payment-schedule-manager";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";
import { isPendingCashflow } from "@shared/cashflow-filters";
import { getPlatformBadgeClasses } from "@/lib/platform-colors";
import { getProfitPaymentDisplay } from "@/lib/investment-payment-metrics";
import {
  getDisplayProfitAmount,
  getDisplayRoiPercent,
  getInvestmentDurationMonths,
  getNetExpectedProfitForDisplay,
} from "@/lib/investment-display-metrics";

interface InvestmentDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: InvestmentWithPlatform | null;
  cashflows: CashflowWithInvestment[];
  onEdit?: () => void;
  onDelete?: () => void;
  onCompletePayment?: () => void;
  onCompleteAllPayments?: () => void;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkPaymentAsReceived?: (cashflowId: string) => void;
}

export function InvestmentDetailsDrawer({
  open,
  onOpenChange,
  investment,
  cashflows,
  onEdit,
  onDelete,
  onCompletePayment,
  onCompleteAllPayments,
  onAddPayment,
  onRemovePayment,
  onMarkPaymentAsReceived,
}: InvestmentDetailsDrawerProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  if (!investment) return null;

  const durationMonths = getInvestmentDurationMonths(investment.startDate, investment.endDate);

  // Get cashflows for this investment
  const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);
  const paymentDisplay = getProfitPaymentDisplay(investment, cashflows);
  const pendingPayments = investmentCashflows.filter((cf) => isPendingCashflow(cf)).length;

  const netExpectedProfit = getNetExpectedProfitForDisplay(investment);

  // Calculate total profit received so far (exclude principal)
  const totalProfitReceived = investmentCashflows
    .filter(cf => cf.status === "received" && cf.type === "profit")
    .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);

  const profitDisplayAmount = getDisplayProfitAmount(investment, totalProfitReceived);
  const roi = getDisplayRoiPercent(investment, totalProfitReceived);

  const statusConfig = getInvestmentStatusConfig(investment.status);

  // Get countdown days
  const getCountdownDays = () => {
    const today = new Date();
    const nextPaymentDate = investmentCashflows
      .filter((cf) => isPendingCashflow(cf))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

    if (!nextPaymentDate) return null;

    const daysUntil = Math.ceil((new Date(nextPaymentDate.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  const countdownDays = getCountdownDays();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]" data-testid="drawer-investment-details">
        <DrawerHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-2xl break-words leading-snug whitespace-normal" data-testid="text-investment-name">
                {formatInvestmentDisplayName(investment, t("investments.number"))}
              </DrawerTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${getPlatformBadgeClasses(investment.platform?.name)}`} data-testid="text-platform-name">
                  {investment.platform?.name || ""}
                </Badge>
                <Badge variant="outline" className={statusConfig.badge} data-testid={`badge-status-${investment.status}`}>
                  {t(`investments.${investment.status}`)}
                </Badge>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" data-testid="button-close-drawer">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {/* Face Value */}
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{t("investments.faceValue")}</span>
              </div>
              <p className="text-lg font-bold text-primary" data-testid="text-face-value">
                {formatCurrency(Number.parseFloat(String(investment.faceValue)), "SAR")}
              </p>
            </div>

            {/* Expected IRR */}
            <div className="bg-chart-2/5 rounded-lg p-3 border border-chart-2/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-chart-2" />
                <span className="text-xs text-muted-foreground">{t("investments.expectedIRR")}</span>
              </div>
              <p className="text-lg font-bold text-chart-2" data-testid="text-expected-irr">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </p>
            </div>

            {/* Expected Profit */}
            <div className={`${METRIC_COLOR_MAP.roi.bgColor} rounded-lg p-3 border border-blue-600/10 dark:border-blue-400/10`}>
              <div className="flex items-center gap-2 mb-1">
                <Target className={cn("h-4 w-4", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} />
                <span className="text-xs text-muted-foreground">{t("investments.expectedProfit")}</span>
              </div>
              <p className={cn("text-lg font-bold", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} data-testid="text-expected-profit">
                {formatCurrency(netExpectedProfit, "SAR")}
              </p>
            </div>

            {/* Total Returns */}
            <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">{t("investments.totalReturns")}</span>
              </div>
              <p className="text-lg font-bold text-green-500" data-testid="text-total-returns">
                {formatCurrency(profitDisplayAmount, "SAR")}
              </p>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-3 mb-6">
            {/* Dates */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("investments.startDate")}</span>
              </div>
              <span className="text-sm font-medium" data-testid="text-start-date">
                {formatDate(investment.startDate)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("investments.endDate")}</span>
              </div>
              <span className="text-sm font-medium" data-testid="text-end-date">
                {formatDate(investment.endDate)}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("investments.duration")}</span>
              </div>
              <span className="text-sm font-medium" data-testid="text-duration">
                {durationMonths} {t("investments.months")}
              </span>
            </div>

            {/* Countdown */}
            {countdownDays !== null && investment.status === "active" && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t("investmentDetails.nextDistribution")}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    countdownDays > 30
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : countdownDays >= 7
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                  }
                  data-testid="badge-countdown"
                >
                  {countdownDays} {t("investments.days")}
                </Badge>
              </div>
            )}

            {/* ROI */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("investments.currentROI")}</span>
              </div>
              <span className={cn("text-sm font-medium", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} data-testid="text-current-roi">
                {formatPercentage(roi)}
              </span>
            </div>

            {/* Payment Progress */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t("investmentDetails.paymentProgress")}
                </span>
              </div>
              <span className="text-sm font-medium" data-testid="text-payment-progress">
                {paymentDisplay.displayReceived}/{paymentDisplay.displayTotal}
              </span>
            </div>
          </div>

          {/* Payment Schedule */}
          {investmentCashflows.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">
                {t("investmentDetails.paymentSchedule")}
              </h3>
              <PaymentScheduleManager
                investmentId={investment.id}
                cashflows={investmentCashflows}
                expectedProfit={netExpectedProfit}
                onAddPayment={onAddPayment}
                onRemovePayment={onRemovePayment}
                onMarkAsReceived={onMarkPaymentAsReceived}
              />
            </div>
          )}
        </div>

        <DrawerFooter className="border-t space-y-2">
          <div className="grid grid-cols-1 gap-2">
            {onCompleteAllPayments && ["active", "late", "defaulted"].includes(investment.status) && pendingPayments > 1 && (
              <Button
                onClick={() => {
                  onCompleteAllPayments();
                  onOpenChange(false);
                }}
                variant="default"
                className="h-10 w-full"
                data-testid="button-complete-all-payments"
              >
                <CheckCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("investmentDetails.completeAllPayments")}
              </Button>
            )}
            {onCompletePayment && ["active", "late", "defaulted"].includes(investment.status) && pendingPayments <= 1 && (
              <Button
                onClick={() => {
                  onCompletePayment();
                  onOpenChange(false);
                }}
                variant="default"
                className="h-10 w-full"
                data-testid="button-complete-payment"
              >
                <CheckCircle className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("investments.completePayment")}
              </Button>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 sm:justify-start">
            {onEdit && (
              <Button
                onClick={() => {
                  onEdit();
                  onOpenChange(false);
                }}
                variant="outline"
                className="h-9 min-w-9"
                data-testid="button-edit"
                aria-label={t("common.edit")}
              >
                <Edit className="h-4 w-4 sm:ltr:mr-2 sm:rtl:ml-2" />
                <span className="hidden sm:inline">{t("common.edit")}</span>
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                variant="destructive"
                className="h-9 min-w-9"
                data-testid="button-delete"
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-4 w-4 sm:ltr:mr-2 sm:rtl:ml-2" />
                <span className="hidden sm:inline">{t("common.delete")}</span>
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
