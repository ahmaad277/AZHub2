import { useMemo } from "react";
import { formatCurrency, formatPercentage, formatDate, getInvestmentStatusConfig } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import { getProfitPaymentDisplay } from "@/lib/investment-payment-metrics";
import {
  getDisplayRoiPercent,
  getInvestmentDurationMonths,
  getNetExpectedProfitForDisplay,
} from "@/lib/investment-display-metrics";

// Hook: Calculate all investment metrics once
function useInvestmentMetrics(investment: InvestmentWithPlatform, cashflows: CashflowWithInvestment[]) {
  return useMemo(() => {
    const durationMonths = getInvestmentDurationMonths(investment.startDate, investment.endDate);
    
    // Get cashflows for this investment
    const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);

    const {
      profitCashflows,
      receivedCount: receivedPayments,
      totalCount: totalPayments,
      displayReceived: displayPaymentReceived,
      displayTotal: displayPaymentTotal,
    } = getProfitPaymentDisplay(investment, cashflows);
    
    const netExpectedProfit = getNetExpectedProfitForDisplay(investment);
    
    // Calculate total returns received so far (PROFIT ONLY - exclude principal)
    const totalReturns = investmentCashflows
      .filter(cf => cf.status === "received" && cf.type === "profit")
      .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
    
    const roi = getDisplayRoiPercent(investment, totalReturns);
    
    // Calculate average payment amount (PROFIT ONLY - exclude principal)
    const avgPayment = totalPayments > 0 
      ? profitCashflows.reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0) / totalPayments
      : 0;

    return {
      durationMonths,
      investmentCashflows,
      profitCashflows,
      receivedPayments,
      totalPayments,
      displayPaymentReceived,
      displayPaymentTotal,
      netExpectedProfit,
      totalReturns,
      roi,
      avgPayment,
    };
  }, [investment, cashflows]);
}


interface InvestmentRowProps {
  investment: InvestmentWithPlatform;
  cashflows: CashflowWithInvestment[];
  onEdit: () => void;
  onOpenDetails?: () => void;
  onCompletePayment?: () => void;
  onDelete?: () => void;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkPaymentAsReceived?: (cashflowId: string) => void;
  onTogglePaymentStatus?: (cashflowId: string, newStatus: "received" | "upcoming") => void;
  viewMode?: "ultra-compact" | "compact" | "expanded";
}

export function InvestmentRow({ 
  investment, 
  cashflows, 
  onEdit, 
  onOpenDetails,
  onCompletePayment, 
  onDelete, 
  onAddPayment, 
  onRemovePayment, 
  onMarkPaymentAsReceived,
  onTogglePaymentStatus,
  viewMode: controlledViewMode,
}: InvestmentRowProps) {
  const { t } = useLanguage();
  
  // Use controlled mode if props provided, otherwise use internal state
  const [internalViewMode] = usePersistedViewMode();
  const viewMode = controlledViewMode ?? internalViewMode;
  const handlePrimaryRowAction = () => {
    onOpenDetails?.();
  };
  
  // Calculate all metrics once using hook
  const metrics = useInvestmentMetrics(investment, cashflows);
  const {
    durationMonths,
    investmentCashflows,
    profitCashflows,
    receivedPayments,
    totalPayments,
    displayPaymentReceived,
    displayPaymentTotal,
    netExpectedProfit,
    totalReturns,
    roi,
    avgPayment,
  } = metrics;
  
  const statusConfig = getInvestmentStatusConfig(investment.status);
  const platformBorderClasses = getPlatformBorderClasses(investment.platform?.name);

  return (
    <div
      className={`
        group flex flex-col rounded-xl border border-border/70 border-s-4 shadow-sm transition-all duration-200 hover:shadow-md
        ${statusConfig.rowBackground} ${platformBorderClasses}
      `}
      data-testid={`row-investment-${investment.id}`}
    >
      {/* Ultra-Compact Strip View - Smallest view with APR(blue)+ROI(green) */}
      {viewMode === "ultra-compact" && (
        <div 
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
          onClick={handlePrimaryRowAction}
          data-testid={`ultra-compact-view-${investment.id}`}
        >
          {/* Platform + Status */}
          <div className="flex items-center gap-1 shrink-0">
            {investment.platform && (
              <Badge variant="outline" className={`text-xs px-1 py-0 h-4 ${getPlatformBadgeClasses(investment.platform.name)}`}>
                {investment.platform.name}
              </Badge>
            )}
            <Badge 
              className={`${statusConfig.badge} text-xs px-1 py-0 h-4`}
              variant="outline"
            >
              {t(`investments.${investment.status}`)}
            </Badge>
          </div>

          {/* Investment Number (or Name if no number) */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs break-words leading-snug whitespace-normal">
              {investment.investmentNumber ? `#${investment.investmentNumber}` : investment.name}
            </h3>
          </div>

          {/* APR (blue) + ROI (green) - Inline with slightly larger font */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-muted-foreground uppercase">{t("investments.aprShort")}</span>
              <span className="text-xs font-bold text-chart-1 tabular-nums">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-muted-foreground uppercase">{t("investments.roiShort")}</span>
              <span className={`text-xs font-bold tabular-nums ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {formatPercentage(roi)}
              </span>
            </div>
          </div>

          {/* Face Value */}
          <div className="text-end shrink-0">
            <div className="text-xs font-bold tabular-nums">
              {formatCurrency(parseFloat(investment.faceValue))}
            </div>
          </div>
        </div>
      )}

      {/* Compact View - Taller 3-column layout */}
      {viewMode === "compact" && (
        <div 
          className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,max-content)_auto] gap-2 sm:gap-3 p-3 sm:p-3.5 cursor-pointer hover:bg-muted/20"
          onClick={handlePrimaryRowAction}
          data-testid={`compact-view-${investment.id}`}
        >
          {/* RIGHT COLUMN - Platform/Status/Duration + Number/Name */}
          <div className="flex flex-col gap-1 min-w-0">
            {/* Top: Platform + Status + Duration */}
            <div className="flex items-center gap-1 flex-wrap">
              {investment.platform && (
                <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 font-medium ${getPlatformBadgeClasses(investment.platform.name)}`}>
                  {investment.platform.name}
                </Badge>
              )}
              <Badge 
                className={`${statusConfig.badge} text-xs px-1.5 py-0 h-5 font-medium`}
                variant="outline"
              >
                {t(`investments.${investment.status}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {durationMonths}
                {t("investments.durationShortSuffix")}
              </span>
            </div>
            
            {/* Bottom: Name only as title */}
            <h3 className="font-semibold text-sm break-words leading-snug whitespace-normal" title={investment.name}>
              {investment.name}
            </h3>
          </div>

          {/* CENTER COLUMN - APR (blue) + ROI (green) - Values only, no labels */}
          <div className="flex flex-col gap-0.5 justify-center items-center text-center min-w-0">
            {/* APR (blue) */}
            <div className="text-sm font-bold text-chart-1 tabular-nums">
              {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
            </div>
            
            {/* ROI (green) */}
            <div className={`text-sm font-bold tabular-nums ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {formatPercentage(roi)}
            </div>
          </div>

          {/* LEFT COLUMN - Face Value + net expected profit */}
          <div className="flex flex-col gap-0.5 justify-center items-end min-w-0">
            <div className="text-sm font-bold tabular-nums">
              {formatCurrency(parseFloat(investment.faceValue))}
            </div>
            <span className="text-[10px] text-muted-foreground leading-none max-w-[8rem] text-end">
              {t("investments.expectedProfit")}
            </span>
            <div className="text-sm font-bold text-chart-2 tabular-nums">
              {formatCurrency(netExpectedProfit)}
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Exact Compact Copy at Top + Organized Details Below */}
      {viewMode === "expanded" && (
        <div className="flex flex-col" data-testid={`expanded-view-${investment.id}`}>
          {/* TOP SECTION: Exact copy of Compact View (3-column grid with label-free values) */}
          <div 
            className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,max-content)_auto] gap-2 sm:gap-3 p-3 sm:p-3.5 cursor-pointer hover:bg-muted/20"
            onClick={handlePrimaryRowAction}
          >
            {/* RIGHT COLUMN - Platform/Status/Duration + Number/Name */}
            <div className="flex flex-col gap-1 min-w-0">
              {/* Top: Platform + Status + Duration */}
              <div className="flex items-center gap-1 flex-wrap">
                {investment.platform && (
                  <Badge variant="outline" className={`text-xs px-1.5 py-0 h-5 font-medium ${getPlatformBadgeClasses(investment.platform.name)}`}>
                    {investment.platform.name}
                  </Badge>
                )}
                <Badge 
                  className={`${statusConfig.badge} text-xs px-1.5 py-0 h-5 font-medium`}
                  variant="outline"
                >
                  {t(`investments.${investment.status}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {durationMonths}
                  {t("investments.durationShortSuffix")}
                </span>
              </div>
              
              {/* Bottom: Name only as title */}
              <h3 className="font-semibold text-sm sm:text-[0.95rem] break-words leading-snug whitespace-normal" title={investment.name}>
                {investment.name}
              </h3>
            </div>

            {/* CENTER COLUMN - APR (blue) + ROI (green) - Values only, no labels */}
            <div className="flex flex-col gap-0.5 justify-center items-center text-center min-w-0 rounded-md bg-muted/30 px-2 py-1">
              {/* APR (blue) */}
              <div className="text-sm font-bold text-chart-1 tabular-nums">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </div>
              
              {/* ROI (green) */}
              <div className={`text-sm font-bold tabular-nums ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {formatPercentage(roi)}
              </div>
            </div>

            {/* LEFT COLUMN - Face Value + net expected profit */}
            <div className="flex flex-col gap-0.5 justify-center items-end min-w-0">
              <div className="text-sm font-bold tabular-nums">
                {formatCurrency(parseFloat(investment.faceValue))}
              </div>
              <span className="text-[10px] text-muted-foreground leading-none max-w-[8rem] text-end">
                {t("investments.expectedProfit")}
              </span>
              <div className="text-sm font-bold text-chart-2 tabular-nums">
                {formatCurrency(netExpectedProfit)}
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Additional organized details */}
          <div className="border-t border-border/50 px-3 py-2 space-y-2">
            {/* Payment Progress - Redesigned: Payment Value (left) + Progress (center) + Count with +/- buttons (right) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                {/* Left: Payment Value */}
                <div>
                  <span className="text-muted-foreground">{t("investments.paymentValue")}: </span>
                  <span className="font-medium tabular-nums">{formatCurrency(avgPayment)}</span>
                </div>
                
                {/* Center: Payment Progress label */}
                <span className="text-muted-foreground">{t("investments.paymentProgress")}</span>
                
                {/* Right: Count with +/- buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onTogglePaymentStatus) return;
                      
                      // Find the most recent received profit cashflow and revert it to upcoming
                      const receivedCashflows = profitCashflows
                        .filter(cf => cf.status === "received")
                        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
                      
                      if (receivedCashflows.length > 0) {
                        onTogglePaymentStatus(receivedCashflows[0].id, "upcoming");
                      }
                    }}
                    disabled={!onTogglePaymentStatus || receivedPayments === 0}
                    data-testid={`button-decrease-payment-${investment.id}`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="font-medium min-w-[3ch] text-center tabular-nums">{displayPaymentReceived}/{displayPaymentTotal}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onTogglePaymentStatus) return;
                      
                      // Find the oldest unpaid profit cashflow and mark it as received
                      const unpaidCashflows = profitCashflows
                        .filter(cf => cf.status !== "received")
                        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                      
                      if (unpaidCashflows.length > 0) {
                        onTogglePaymentStatus(unpaidCashflows[0].id, "received");
                      }
                    }}
                    disabled={!onTogglePaymentStatus || receivedPayments === totalPayments}
                    data-testid={`button-increase-payment-${investment.id}`}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-2 transition-all duration-300"
                  style={{
                    width: `${displayPaymentTotal > 0 ? (displayPaymentReceived / displayPaymentTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">{t("investments.startDate")}: </span>
                <span className="font-medium">{investment.startDate ? formatDate(investment.startDate) : "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("investments.endDate")}: </span>
                <span className="font-medium">{investment.endDate ? formatDate(investment.endDate) : "-"}</span>
              </div>
            </div>

            {/* Actions - Moved to bottom after additional info */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {onCompletePayment && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompletePayment();
                  }}
                  data-testid={`button-complete-investment-${investment.id}`}
                  className="h-9 w-full sm:h-8 sm:w-auto"
                >
                  <span>{t("investments.actionComplete")}</span>
                </Button>
              )}
              {onAddPayment && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPayment(investment.id);
                  }}
                  data-testid={`button-add-payment-${investment.id}`}
                  className="h-9 w-full sm:h-8 sm:w-auto"
                >
                  <span>{t("investments.actionAddPayment")}</span>
                </Button>
              )}
              </div>
              <div className="flex items-center justify-end gap-2 sm:justify-start">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                data-testid={`button-edit-investment-${investment.id}`}
                className="h-8 min-w-9"
                aria-label={t("common.edit")}
              >
                <Edit className="h-3.5 w-3.5 sm:ltr:mr-1 sm:rtl:ml-1" />
                <span className="hidden sm:inline">{t("common.edit")}</span>
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  data-testid={`button-delete-investment-${investment.id}`}
                  className="h-8 min-w-9"
                  aria-label={t("investments.deleteVerb")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
