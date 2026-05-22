import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashTransactions, cashflows, dataQualityIssues, investments } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { generateSchedule, type DistributionFrequency } from "@/lib/finance/schedule-generator";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const { issueId } = body;

    if (!issueId) throw new Error("Issue ID is required");

    const [issue] = await db
      .select()
      .from(dataQualityIssues)
      .where(eq(dataQualityIssues.id, issueId));

    if (!issue) throw new Error("Issue not found");
    if (issue.status !== "open") throw new Error("Issue is already resolved or ignored");

    let action = "resolved";
    let redirectUrl = null;

    if (issue.issueType === "missing_ledger_entry") {
      // Find the cashflow
      const [cf] = await db.select().from(cashflows).where(eq(cashflows.id, issue.entityId));
      if (!cf) throw new Error("Cashflow not found");
      
      const [inv] = await db.select().from(investments).where(eq(investments.id, cf.investmentId));
      if (!inv) throw new Error("Investment not found");

      // Check if ledger entry already exists
      const [existingTx] = await db
        .select()
        .from(cashTransactions)
        .where(
          and(
            eq(cashTransactions.type, "cashflow_receipt"),
            eq(cashTransactions.referenceId, cf.id)
          )
        );

      if (!existingTx) {
        // Insert missing ledger entry
        await db.insert(cashTransactions).values({
          amount: cf.amount,
          type: "cashflow_receipt",
          referenceId: cf.id,
          platformId: inv.platformId,
          notes: `Auto-fixed missing ledger entry for cashflow ${cf.id}`,
          date: cf.receivedDate ?? new Date(),
        });
      }
    } else if (issue.issueType === "no_cashflows") {
      const [inv] = await db.select().from(investments).where(eq(investments.id, issue.entityId));
      if (!inv) throw new Error("Investment not found");

      if (inv.distributionFrequency === "custom") {
        redirectUrl = `/investments?id=${inv.id}`;
        action = "redirect";
      } else {
        const rows = generateSchedule({
          startDate: inv.startDate,
          endDate: inv.endDate,
          durationMonths: inv.durationMonths,
          principalAmount: Number(inv.principalAmount),
          expectedProfit: Number(inv.expectedProfit),
          frequency: inv.distributionFrequency as DistributionFrequency,
        });

        if (rows.length > 0) {
          await db.insert(cashflows).values(
            rows.map((r) => ({
              investmentId: inv.id,
              dueDate: r.dueDate,
              amount: r.amount.toString(),
              type: r.type,
              status: "pending" as const,
              isCustomSchedule: r.isCustomSchedule,
            }))
          );
        }
      }
    } else if (issue.issueType === "profit_mismatch" || issue.issueType === "principal_mismatch") {
      // Too complex to auto-fix safely if there are received cashflows. Redirect to edit.
      redirectUrl = `/investments?id=${issue.entityId}`;
      action = "redirect";
    }

    if (action === "resolved") {
      await db
        .update(dataQualityIssues)
        .set({ status: "resolved" })
        .where(eq(dataQualityIssues.id, issueId));
      
      revalidateTag("dashboard-metrics");
    }

    return { success: true, action, redirectUrl };
  });
}
