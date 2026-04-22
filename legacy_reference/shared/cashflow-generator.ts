import { addMonths, addDays } from "date-fns";
import { roundToMoney, splitMoneyEvenly } from "./money";

export type DistributionFrequency = 
  | "monthly" 
  | "quarterly" 
  | "semi_annually" 
  | "annually" 
  | "at_maturity";

export type ProfitPaymentStructure = "periodic" | "at_maturity";

export interface GenerateCashflowsParams {
  startDate: Date;
  endDate: Date;
  faceValue: number;
  totalExpectedProfit: number;
  distributionFrequency: DistributionFrequency;
  profitPaymentStructure: ProfitPaymentStructure;
}

export interface GeneratedCashflow {
  dueDate: Date;
  amount: number;
  type: "profit" | "principal";
}

export function generateCashflows(params: GenerateCashflowsParams): GeneratedCashflow[] {
  const {
    startDate,
    endDate,
    faceValue,
    totalExpectedProfit,
    distributionFrequency,
    profitPaymentStructure,
  } = params;

  const cashflows: GeneratedCashflow[] = [];

  if (distributionFrequency === "at_maturity") {
    // Create separate cashflows for profit and principal for better tracking
    // This allows automatic cash transaction creation when profit is received
    if (totalExpectedProfit > 0) {
      cashflows.push({
        dueDate: endDate,
        amount: roundToMoney(totalExpectedProfit),
        type: "profit",
      });
    }
    
    // Keep principal on same endDate for maturity consistency
    cashflows.push({
      dueDate: endDate,
      amount: roundToMoney(faceValue),
      type: "principal",
    });
    
    return cashflows;
  }

  const monthsInterval = getMonthsInterval(distributionFrequency);
  const profitPayments: Date[] = [];
  let currentDate = addMonths(startDate, monthsInterval);

  while (currentDate <= endDate) {
    profitPayments.push(new Date(currentDate));
    currentDate = addMonths(currentDate, monthsInterval);
  }

  if (profitPayments.length === 0) {
    profitPayments.push(endDate);
  }

  const profitByPayment = splitMoneyEvenly(totalExpectedProfit, profitPayments.length);

  if (profitPaymentStructure === "periodic") {
    profitPayments.forEach((date, index) => {
      const isLastPayment = index === profitPayments.length - 1;
      const paymentAmount = profitByPayment[index] ?? 0;
      
      if (isLastPayment) {
        cashflows.push({
          dueDate: date,
          amount: paymentAmount,
          type: "profit",
        });
        cashflows.push({
          dueDate: addDays(date, 1),
          amount: roundToMoney(faceValue),
          type: "principal",
        });
      } else {
        cashflows.push({
          dueDate: date,
          amount: paymentAmount,
          type: "profit",
        });
      }
    });
  } else {
    cashflows.push({
      dueDate: endDate,
      amount: roundToMoney(totalExpectedProfit),
      type: "profit",
    });
    cashflows.push({
      dueDate: endDate,
      amount: roundToMoney(faceValue),
      type: "principal",
    });
  }

  return cashflows.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

function getMonthsInterval(frequency: DistributionFrequency): number {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "semi_annually":
      return 6;
    case "annually":
      return 12;
    default:
      return 12;
  }
}

export function calculateNumberOfPayments(
  startDate: Date,
  endDate: Date,
  frequency: DistributionFrequency
): number {
  if (frequency === "at_maturity") {
    return 1;
  }

  const monthsInterval = getMonthsInterval(frequency);
  let count = 0;
  let currentDate = addMonths(startDate, monthsInterval);

  while (currentDate < endDate) {
    count++;
    currentDate = addMonths(currentDate, monthsInterval);
  }

  return count > 0 ? count + 1 : 1;
}
