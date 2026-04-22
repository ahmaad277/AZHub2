/**
 * Investments service — server-side logic that:
 *   - resolves the smart date input (durationMonths XOR endDate),
 *   - persists the investment,
 *   - generates cashflow rows from the schedule,
 *   - optionally debits the cash wallet when funded_from_cash = true.
 *
 * All of this runs inside a single transaction to preserve SSOT invariants.
 */

import { z } from "zod";
import { db } from "@/db";
import {
  cashTransactions,
  cashflows,
  investments,
} from "@/db/schema";
import {
  durationFromEndDate,
  endDateFromDuration,
} from "./date-smart";
import { generateSchedule, type DistributionFrequency } from "./schedule-generator";
import { roundToMoney } from "./money";

const customRowSchema = z.object({
  dueDate: z.coerce.date(),
  amount: z.coerce.number().positive(),
  type: z.enum(["profit", "principal"]).default("profit"),
  notes: z.string().optional().nullable(),
});

export const investmentInputSchema = z
  .object({
    platformId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    principalAmount: z.coerce.number().positive(),
    expectedProfit: z.coerce.number().nonnegative(),
    expectedIrr: z.coerce.number().min(0).max(100),
    startDate: z.coerce.date(),
    /** Either durationMonths OR endDate must be provided. */
    durationMonths: z.coerce.number().int().positive().optional(),
    endDate: z.coerce.date().optional(),
    distributionFrequency: z.enum([
      "monthly",
      "quarterly",
      "semi_annually",
      "annually",
      "at_maturity",
      "custom",
    ]),
    isReinvestment: z.boolean().optional().default(false),
    fundedFromCash: z.boolean().optional().default(false),
    excludePlatformFees: z.boolean().optional().default(false),
    notes: z.string().max(1000).optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    customSchedule: z.array(customRowSchema).optional(),
  })
  .refine(
    (v) => v.durationMonths !== undefined || v.endDate !== undefined,
    { message: "Either durationMonths or endDate is required" },
  );

export type InvestmentInput = z.infer<typeof investmentInputSchema>;

export interface ResolvedDates {
  startDate: Date;
  endDate: Date;
  durationMonths: number;
}

export function resolveDates(input: InvestmentInput): ResolvedDates {
  const startDate = input.startDate;
  let endDate = input.endDate;
  let durationMonths = input.durationMonths;

  if (endDate && !durationMonths) {
    durationMonths = durationFromEndDate(startDate, endDate);
  } else if (durationMonths && !endDate) {
    endDate = endDateFromDuration(startDate, durationMonths);
  } else if (durationMonths && endDate) {
    // Both provided — trust endDate, recompute duration for consistency.
    durationMonths = durationFromEndDate(startDate, endDate);
  }

  if (!endDate || !durationMonths) {
    throw new Error("Could not resolve startDate/endDate/durationMonths");
  }
  return { startDate, endDate, durationMonths };
}

export function previewSchedule(input: InvestmentInput) {
  const { startDate, endDate, durationMonths } = resolveDates(input);
  if (input.distributionFrequency === "custom") {
    const rows = (input.customSchedule ?? []).map((r) => ({
      dueDate: r.dueDate,
      amount: roundToMoney(r.amount),
      type: r.type ?? "profit",
      isCustomSchedule: true,
    }));
    return { startDate, endDate, durationMonths, rows };
  }
  const rows = generateSchedule({
    startDate,
    endDate,
    durationMonths,
    principalAmount: input.principalAmount,
    expectedProfit: input.expectedProfit,
    frequency: input.distributionFrequency as DistributionFrequency,
  });
  return { startDate, endDate, durationMonths, rows };
}

export async function createInvestmentWithSchedule(
  input: InvestmentInput,
  options: { sourceShareLinkId?: string | null; needsReview?: boolean } = {},
) {
  const { startDate, endDate, durationMonths, rows } = previewSchedule(input);

  if (input.distributionFrequency === "custom" && rows.length === 0) {
    throw new Error("Custom schedule requires at least one row");
  }

  return db.transaction(async (tx) => {
    const [investment] = await tx
      .insert(investments)
      .values({
        platformId: input.platformId,
        name: input.name,
        principalAmount: input.principalAmount.toString(),
        expectedProfit: input.expectedProfit.toString(),
        expectedIrr: input.expectedIrr.toString(),
        startDate,
        durationMonths,
        endDate,
        distributionFrequency: input.distributionFrequency,
        isReinvestment: input.isReinvestment ?? false,
        fundedFromCash: input.fundedFromCash ?? false,
        excludePlatformFees: input.excludePlatformFees ?? false,
        notes: input.notes ?? null,
        tags: input.tags ?? null,
        needsReview: options.needsReview ?? false,
        sourceShareLinkId: options.sourceShareLinkId ?? null,
      })
      .returning();

    if (rows.length > 0) {
      await tx.insert(cashflows).values(
        rows.map((r) => ({
          investmentId: investment.id,
          dueDate: r.dueDate,
          amount: r.amount.toString(),
          type: r.type,
          status: "pending" as const,
          isCustomSchedule: r.isCustomSchedule,
        })),
      );
    }

    if (input.fundedFromCash) {
      await tx.insert(cashTransactions).values({
        amount: (-1 * roundToMoney(input.principalAmount)).toString(),
        type: "investment_funding",
        referenceId: investment.id,
        platformId: input.platformId,
        notes: `Funded investment: ${input.name}`,
        date: new Date(),
      });
    }

    return investment;
  });
}
