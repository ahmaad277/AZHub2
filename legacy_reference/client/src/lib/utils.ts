import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized color mapping for financial metrics (APR and ROI).
 * 
 * IMPORTANT: Use separate colorLight and colorDark properties instead of 
 * concatenating them (e.g., "text-blue-600 dark:text-blue-400") because 
 * Tailwind's twMerge utility will remove the base class when it encounters
 * the dark variant as a single string.
 * 
 * Usage: cn("text-lg font-bold", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)
 * 
 * Color scheme:
 * - APR: Uses CSS variable --chart-1 (blue, automatically adapts to dark mode)
 * - ROI: Uses CSS variable --chart-2 (green, automatically adapts to dark mode)
 */
export const METRIC_COLOR_MAP = {
  apr: {
    colorLight: "text-chart-1",
    colorDark: "", // Not needed - CSS variable adapts automatically
    bgColor: "bg-chart-1/10",
  },
  roi: {
    colorLight: "text-chart-2",
    colorDark: "", // Not needed - CSS variable adapts automatically
    bgColor: "bg-chart-2/10",
  },
} as const;

export function formatCurrency(amount: number | string | null | undefined, currency = "SAR"): string {
  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/** Currency formatting with locale matching the active UI language. */
export function formatCurrencyLocale(
  amount: number | string | null | undefined,
  language: "en" | "ar",
  currency = "SAR",
): string {
  const locale = "en-SA";
  const format = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  if (amount === null || amount === undefined) {
    return format(0);
  }
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) {
    return format(0);
  }
  return format(num);
}

/** Formatted amount with fraction digits, locale follows UI language (no currency symbol). */
export function formatMoneyAmount(
  amount: number,
  language: "en" | "ar",
  options?: { minFractionDigits?: number; maxFractionDigits?: number },
): string {
  const locale = language === "ar" ? "ar-SA" : "en-SA";
  const min = options?.minFractionDigits ?? 2;
  const max = options?.maxFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(amount);
}

export function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "0.00%";
  }
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return "0.00%";
  }
  
  return `${num.toFixed(2)}%`;
}

/** App standard: Gregorian calendar for all displayed dates (including Arabic UI). */
export const GREGORIAN_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  calendar: "gregory",
  year: "numeric",
  month: "short",
  day: "numeric",
};

export function formatDate(date: Date | string | null | undefined): string {
  if (date == null) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const locale =
    typeof document !== "undefined" && document.documentElement.lang?.toLowerCase().startsWith("ar")
      ? "ar-SA"
      : "en-US";
  return new Intl.DateTimeFormat(locale, GREGORIAN_DATE_FORMAT).format(d);
}

export function calculateDaysUntil(date: Date | string | null | undefined): number {
  if (date == null) return 0;
  const target = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calculateIRR(cashflows: Array<{ date: Date; amount: number }>): number {
  // Simplified IRR calculation for display purposes
  const totalInvestment = Math.abs(cashflows[0]?.amount || 0);
  const totalReturns = cashflows.slice(1).reduce((sum, cf) => sum + cf.amount, 0);
  const years = cashflows.length > 1 
    ? (cashflows[cashflows.length - 1].date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;
  
  if (years === 0 || totalInvestment === 0) return 0;
  return ((totalReturns / totalInvestment) / years) * 100;
}

export function calculateROI(investmentAmount: number | string, totalReturns: number | string): number {
  const amount = typeof investmentAmount === "string" ? parseFloat(investmentAmount) : investmentAmount;
  const returns = typeof totalReturns === "string" ? parseFloat(totalReturns) : totalReturns;
  
  if (isNaN(amount) || isNaN(returns) || amount === 0) return 0;
  // ROI = (Profit / Investment) * 100
  // totalReturns already represents the profit (received cashflows)
  return (returns / amount) * 100;
}

export function getInvestmentTotalReturns(
  investmentId: string,
  cashflows: Array<{ investmentId: string; amount: number | string; status: string; type?: string }>
): number {
  return cashflows
    .filter(cf => 
      cf.investmentId === investmentId && 
      cf.status === "received" &&
      cf.type === "profit" // Only count profit cashflows, not principal returns
    )
    .reduce((sum, cf) => {
      const amount = typeof cf.amount === "string" ? parseFloat(cf.amount) : cf.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
}

export function convertArabicToEnglishNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  
  // تحويل الأرقام العربية إلى إنجليزية
  arabicNumbers.forEach((arabic, index) => {
    result = result.replace(new RegExp(arabic, 'g'), englishNumbers[index]);
  });
  
  // تحويل الفاصلة العشرية العربية (٫) والفاصلة العربية (،) إلى نقطة إنجليزية
  result = result.replace(/٫/g, '.');
  result = result.replace(/،/g, '.');
  
  return result;
}

export function normalizeNumberInput(value: string): string {
  return convertArabicToEnglishNumbers(value);
}

export interface InvestmentStatusConfig {
  badge: string;
  rowBackground: string;
  /** Logical start border (`border-s-*`) for RTL/LTR parity */
  borderStart: string;
}

export function getInvestmentStatusConfig(status: string): InvestmentStatusConfig {
  const configs: Record<string, InvestmentStatusConfig> = {
    active: {
      badge: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      rowBackground: "bg-chart-2/5 hover:bg-chart-2/10",
      borderStart: "border-s-chart-2",
    },
    completed: {
      badge: "bg-muted text-muted-foreground",
      rowBackground: "bg-muted/50 hover:bg-muted/70",
      borderStart: "border-s-muted-foreground",
    },
    late: {
      badge:
        "bg-yellow-500/15 text-yellow-800 dark:text-yellow-300 border-yellow-600/35 dark:border-yellow-400/40 font-medium",
      rowBackground: "bg-yellow-500/5 hover:bg-yellow-500/10",
      borderStart: "border-s-yellow-500",
    },
    defaulted: {
      badge:
        "bg-destructive/15 text-destructive border-destructive/35 dark:border-destructive/40 font-medium",
      rowBackground: "bg-destructive/5 hover:bg-destructive/10",
      borderStart: "border-s-destructive",
    },
    pending: {
      badge: "bg-primary/10 text-primary border-primary/20",
      rowBackground: "bg-primary/5 hover:bg-primary/10",
      borderStart: "border-s-primary",
    },
  };

  // Neutral fallback for unknown statuses
  const neutralFallback: InvestmentStatusConfig = {
    badge: "bg-muted text-muted-foreground border-muted-foreground/20",
    rowBackground: "bg-muted/30 hover:bg-muted/50",
    borderStart: "border-s-muted-foreground",
  };

  return configs[status] || neutralFallback;
}

/**
 * Format investment display name with number prefix
 * Returns: "#12 — Name" (both English and Arabic)
 * Falls back to just the name if number is missing
 */
export function formatInvestmentDisplayName(
  investment: { name: string; investmentNumber?: number | null },
  numberPrefix: string = "Investment #"
): string {
  if (!investment.investmentNumber) {
    return investment.name;
  }
  return `#${investment.investmentNumber} — ${investment.name}`;
}
