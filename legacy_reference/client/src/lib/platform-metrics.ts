import type { InvestmentWithPlatform } from "@shared/schema";

export interface DefaultRateResult {
  rate: number; // Percentage (0-100)
  severity: "low" | "medium" | "high";
  defaultedCount: number;
  totalCount: number;
}

/**
 * Calculate default rate for a platform's investments
 * 
 * Default rate = (defaulted investments / total investments) × 100
 * 
 * Severity levels:
 * - Low: < 5% (green)
 * - Medium: 5-10% (yellow)
 * - High: > 10% (red)
 * 
 * @param investments - Array of platform investments
 * @returns DefaultRateResult with rate, severity, and counts
 */
export function calculateDefaultRate(
  investments: InvestmentWithPlatform[]
): DefaultRateResult {
  if (investments.length === 0) {
    return {
      rate: 0,
      severity: "low",
      defaultedCount: 0,
      totalCount: 0,
    };
  }

  const defaultedCount = investments.filter(
    (inv) => inv.status === "defaulted"
  ).length;
  
  const totalCount = investments.length;
  const rate = (defaultedCount / totalCount) * 100;

  let severity: "low" | "medium" | "high";
  if (rate < 5) {
    severity = "low";
  } else if (rate <= 10) {
    severity = "medium";
  } else {
    severity = "high";
  }

  return {
    rate,
    severity,
    defaultedCount,
    totalCount,
  };
}

/**
 * Get severity color classes for UI display
 * 
 * @param severity - Severity level from calculateDefaultRate
 * @returns Object with text and background color classes
 */
export function getSeverityColors(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "low":
      return {
        text: "text-green-600",
        bg: "bg-green-100",
        icon: "text-green-500",
      };
    case "medium":
      return {
        text: "text-yellow-600",
        bg: "bg-yellow-100",
        icon: "text-yellow-500",
      };
    case "high":
      return {
        text: "text-red-600",
        bg: "bg-red-100",
        icon: "text-red-500",
      };
  }
}
