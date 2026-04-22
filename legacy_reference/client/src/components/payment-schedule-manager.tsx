import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CashflowWithInvestment } from "@shared/schema";

interface PaymentScheduleManagerProps {
  investmentId: string;
  cashflows: CashflowWithInvestment[];
  expectedProfit: number;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkAsReceived?: (cashflowId: string) => void;
}

export function PaymentScheduleManager({
  investmentId,
  cashflows,
  expectedProfit,
  onAddPayment,
  onRemovePayment,
  onMarkAsReceived,
}: PaymentScheduleManagerProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  
  // Filter cashflows for this investment only
  const investmentCashflows = cashflows
    .filter(cf => cf.investmentId === investmentId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  const totalPayments = investmentCashflows.length;
  
  // Calculate payment value: expectedProfit / number of profit payments (exclude principal)
  const profitPayments = investmentCashflows.filter(cf => cf.type === "profit");
  const avgPaymentValue = profitPayments.length > 0 
    ? expectedProfit / profitPayments.length
    : 0;
  
  // Get payment box color based on status, due date, and type (profit vs principal)
  const getPaymentBoxColor = (cashflow: CashflowWithInvestment) => {
    const now = new Date();
    const dueDate = new Date(cashflow.dueDate);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isPrincipal = cashflow.type === "principal";
    
    // Overdue takes priority regardless of type
    if (daysUntilDue < 0 && cashflow.status !== "received") {
      return "bg-destructive border-destructive"; // Red - overdue
    }
    
    // Due soon takes second priority
    if (daysUntilDue <= 7 && daysUntilDue >= 0 && cashflow.status !== "received") {
      return "bg-yellow-500 border-yellow-500"; // Yellow - due soon
    }
    
    // Then apply type-based colors
    if (cashflow.status === "received") {
      // Solid colors for received payments
      return isPrincipal 
        ? "bg-blue-500 border-blue-500"   // Blue - principal received
        : "bg-chart-2 border-chart-2";     // Green - profit received
    } else {
      // Light colors for upcoming payments
      return isPrincipal
        ? "bg-blue-500/30 border-blue-500/30"    // Light blue - principal upcoming
        : "bg-chart-2/30 border-chart-2/30";     // Light green - profit upcoming
    }
  };
  
  // Get tooltip text for payment box
  const getPaymentTooltip = (cashflow: CashflowWithInvestment, index: number) => {
    const dueDate = formatDate(cashflow.dueDate);
    const amount = formatCurrency(parseFloat(cashflow.amount || "0"));
    const typeLabel =
      cashflow.type === "principal" ? t("cashflows.principal") : t("cashflows.profit");
    const paymentWord = t("paymentSchedule.payment");

    if (cashflow.status === "received") {
      return `${paymentWord} #${index + 1} - ${typeLabel} - ${amount} - ${t("paymentSchedule.received")} (${dueDate})`;
    }
    const now = new Date();
    const dueDateObj = new Date(cashflow.dueDate);
    const daysUntilDue = Math.floor((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return `${paymentWord} #${index + 1} - ${typeLabel} - ${amount} - ${t("paymentSchedule.overdue")} (${dueDate})`;
    }
    if (daysUntilDue <= 7) {
      return `${paymentWord} #${index + 1} - ${typeLabel} - ${amount} - ${t("paymentSchedule.dueSoon")} (${dueDate})`;
    }
    return `${paymentWord} #${index + 1} - ${typeLabel} - ${amount} - ${t("paymentSchedule.upcoming")} (${dueDate})`;
  };
  
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  
  return (
    <div className="space-y-3">
      {/* Top Row: Expected Profit on right, Payment Value on left */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Expected Profit (Right in RTL) */}
        <div>
          <div className="text-muted-foreground">
            {t("investments.expectedProfit")}
          </div>
          <div className="font-bold text-chart-1 text-sm">
            {formatCurrency(expectedProfit)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("paymentSchedule.exPrincipal")}
          </div>
        </div>
        
        {/* Payment Value (Left in RTL) */}
        <div>
          <div className="text-muted-foreground">
            {t("dialog.paymentValue")}
          </div>
          <div className="font-bold text-sm">
            {formatCurrency(avgPaymentValue)}
          </div>
          <div className="text-xs text-muted-foreground">
            {totalPayments} {t("paymentSchedule.payments")}
          </div>
        </div>
      </div>
      
      {/* Payment Boxes Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            {t("paymentSchedule.title")}
          </div>
          {onAddPayment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddPayment(investmentId)}
              className="h-9 px-3 text-xs"
              data-testid="button-add-payment"
            >
              <Plus className="ltr:mr-1 rtl:ml-1 h-4 w-4" />
              {t("paymentSchedule.add")}
            </Button>
          )}
        </div>
        
        {totalPayments === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {t("paymentSchedule.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {investmentCashflows.map((cashflow, index) => (
              <div
                key={cashflow.id}
                className="relative group"
                data-testid={`payment-box-${index}`}
              >
                <div
                  className={`
                    aspect-square min-h-8 min-w-8 rounded-sm border-2 transition-all cursor-pointer
                    ${getPaymentBoxColor(cashflow)}
                    ${selectedPaymentIndex === index ? 'ring-2 ring-primary ring-offset-1' : ''}
                    hover:scale-110 hover:shadow-lg
                  `}
                  title={getPaymentTooltip(cashflow, index)}
                  onClick={() => setSelectedPaymentIndex(index === selectedPaymentIndex ? null : index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedPaymentIndex(index === selectedPaymentIndex ? null : index);
                    }
                  }}
                >
                  {cashflow.status === "received" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Payment Actions (shown when selected) */}
                {selectedPaymentIndex === index && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 bg-popover border rounded-md shadow-lg p-1 flex gap-1">
                    {cashflow.status !== "received" && onMarkAsReceived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsReceived(cashflow.id);
                          setSelectedPaymentIndex(null);
                        }}
                        className="h-9 px-3 text-xs"
                        data-testid={`button-mark-received-${index}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {onRemovePayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePayment(cashflow.id);
                          setSelectedPaymentIndex(null);
                        }}
                        className="h-9 px-3 text-xs text-destructive hover:text-destructive"
                        data-testid={`button-remove-payment-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-chart-2 border-chart-2" />
            <span>{t("cashflows.profit")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-blue-500 border-blue-500" />
            <span>{t("cashflows.principal")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500 border-yellow-500" />
            <span>{t("paymentSchedule.dueSoon")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-destructive border-destructive" />
            <span>{t("paymentSchedule.overdue")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
