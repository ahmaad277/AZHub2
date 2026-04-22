/**
 * Investment Status Manager
 * 
 * Automatically manages investment status transitions based on cashflow payment dates:
 * - Active → Late (when a payment is overdue)
 * - Late → Defaulted (after grace period - 30 days)
 * - Active/Late → Completed (when all payments are received)
 */

import { Investment, Cashflow } from "./schema";

export interface StatusUpdate {
  investmentId: string;
  newStatus: 'active' | 'late' | 'defaulted' | 'completed';
  lateDate?: Date | null;
  defaultedDate?: Date | null;
}

interface InvestmentWithCashflows {
  investment: Investment;
  cashflows: Cashflow[];
}

/**
 * Check and determine the appropriate status for an investment based on its cashflows
 */
export function determineInvestmentStatus(
  investment: Investment,
  cashflows: Cashflow[]
): StatusUpdate {
  const now = new Date();
  
  // Count cashflows
  const totalCashflows = cashflows.length;
  const receivedCashflows = cashflows.filter(cf => cf.status === 'received').length;
  const pendingCashflows = cashflows.filter(cf => cf.status !== 'received');

  // Preserve explicitly completed investments that were archived/imported
  // without a generated payment schedule.
  if (investment.status === 'completed' && totalCashflows === 0) {
    return {
      investmentId: investment.id,
      newStatus: 'completed',
      lateDate: null,
      defaultedDate: null,
    };
  }
  
  // If all cashflows are received, mark as completed
  if (totalCashflows > 0 && receivedCashflows === totalCashflows) {
    return {
      investmentId: investment.id,
      newStatus: 'completed',
      lateDate: null,
      defaultedDate: null,
    };
  }
  
  // Check for overdue cashflows
  const overdueCashflows = pendingCashflows.filter(cf => {
    const dueDate = new Date(cf.dueDate);
    return dueDate < now;
  });
  
  // If no overdue cashflows, investment is active
  if (overdueCashflows.length === 0) {
    return {
      investmentId: investment.id,
      newStatus: 'active',
      lateDate: null,
      defaultedDate: null,
    };
  }
  
  // Find the oldest overdue cashflow
  const oldestOverdue = overdueCashflows.reduce((oldest, current) => {
    const oldestDate = new Date(oldest.dueDate);
    const currentDate = new Date(current.dueDate);
    return currentDate < oldestDate ? current : oldest;
  });
  
  const overdueDate = new Date(oldestOverdue.dueDate);
  const daysPastDue = Math.floor((now.getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Grace period for defaulted status: 30 days
  const GRACE_PERIOD_DAYS = 30;
  
  // If payment is more than 30 days late, mark as defaulted
  if (daysPastDue > GRACE_PERIOD_DAYS) {
    const defaultedDate = new Date(overdueDate.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
    
    return {
      investmentId: investment.id,
      newStatus: 'defaulted',
      lateDate: investment.lateDate ? new Date(investment.lateDate) : overdueDate,
      defaultedDate: defaultedDate,
    };
  }
  
  // Payment is overdue but within grace period - mark as late
  return {
    investmentId: investment.id,
    newStatus: 'late',
    lateDate: investment.lateDate ? new Date(investment.lateDate) : overdueDate,
    defaultedDate: null,
  };
}

/**
 * Check all investments and return a list of status updates
 */
export function checkAllInvestmentStatuses(
  investmentsWithCashflows: InvestmentWithCashflows[]
): StatusUpdate[] {
  const updates: StatusUpdate[] = [];
  
  for (const { investment, cashflows } of investmentsWithCashflows) {
    const currentStatus = investment.status;
    const statusUpdate = determineInvestmentStatus(investment, cashflows);
    
    // Only add to updates if status has changed
    if (statusUpdate.newStatus !== currentStatus) {
      updates.push(statusUpdate);
    }
  }
  
  return updates;
}

/**
 * Get a human-readable description of the status transition
 */
export function getStatusTransitionMessage(
  oldStatus: string,
  newStatus: string,
  language: 'en' | 'ar' = 'en'
): string {
  const transitions: Record<string, Record<'en' | 'ar', string>> = {
    'active_late': {
      en: 'Investment marked as late due to overdue payment',
      ar: 'تم وضع علامة متأخر على الاستثمار بسبب دفعة متأخرة',
    },
    'late_defaulted': {
      en: 'Investment marked as defaulted after 30 days grace period',
      ar: 'تم وضع علامة متعثر على الاستثمار بعد 30 يوماً من فترة السماح',
    },
    'active_completed': {
      en: 'Investment completed - all payments received',
      ar: 'اكتمل الاستثمار - تم استلام جميع الدفعات',
    },
    'late_completed': {
      en: 'Investment completed - all payments received',
      ar: 'اكتمل الاستثمار - تم استلام جميع الدفعات',
    },
    'late_active': {
      en: 'Investment back to active status',
      ar: 'عاد الاستثمار إلى الحالة النشطة',
    },
  };
  
  const key = `${oldStatus}_${newStatus}`;
  return transitions[key]?.[language] || `Status changed from ${oldStatus} to ${newStatus}`;
}
