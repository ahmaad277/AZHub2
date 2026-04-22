import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cashTransactions,
  cashflows,
  dataQualityIssues,
  investments,
} from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { roundToMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

export async function POST() {
  return handleRoute(async () => {
    await requireOwner();

    // Wipe previous open issues — we re-derive them every scan.
    await db
      .delete(dataQualityIssues)
      .where(eq(dataQualityIssues.status, "open"));

    const issues: Array<{
      entityType: string;
      entityId: string;
      issueType: string;
      severity: "info" | "warning" | "error";
      message: string;
      suggestedFix?: string;
    }> = [];

    // 1) Investments with no cashflows
    const invs = await db.select().from(investments);
    const invIds = invs.map((i) => i.id);
    const cfs = invIds.length
      ? await db.select().from(cashflows).where(inArray(cashflows.investmentId, invIds))
      : [];
    const cfByInv = new Map<string, typeof cfs>();
    for (const cf of cfs) {
      const list = cfByInv.get(cf.investmentId) ?? [];
      list.push(cf);
      cfByInv.set(cf.investmentId, list);
    }

    for (const inv of invs) {
      const list = cfByInv.get(inv.id) ?? [];
      if (list.length === 0) {
        issues.push({
          entityType: "investment",
          entityId: inv.id,
          issueType: "no_cashflows",
          severity: "warning",
          message: `Investment "${inv.name}" has no cashflow schedule`,
          suggestedFix: "Open the investment and regenerate the schedule",
        });
      } else {
        const profitSum = list
          .filter((c) => c.type === "profit")
          .reduce((a, c) => a + Number(c.amount), 0);
        if (roundToMoney(profitSum) !== roundToMoney(Number(inv.expectedProfit))) {
          issues.push({
            entityType: "investment",
            entityId: inv.id,
            issueType: "profit_mismatch",
            severity: "warning",
            message: `Expected profit (${inv.expectedProfit}) ≠ sum of profit cashflows (${roundToMoney(profitSum)})`,
            suggestedFix: "Regenerate schedule or adjust expected profit",
          });
        }
        const principalSum = list
          .filter((c) => c.type === "principal")
          .reduce((a, c) => a + Number(c.amount), 0);
        if (roundToMoney(principalSum) !== roundToMoney(Number(inv.principalAmount))) {
          issues.push({
            entityType: "investment",
            entityId: inv.id,
            issueType: "principal_mismatch",
            severity: "error",
            message: `Principal amount (${inv.principalAmount}) ≠ sum of principal cashflows (${roundToMoney(principalSum)})`,
          });
        }
      }
    }

    // 2) Received cashflows without matching ledger entries
    const receivedCfs = cfs.filter((c) => c.status === "received");
    if (receivedCfs.length) {
      const receiptRefs = await db
        .select({ referenceId: cashTransactions.referenceId })
        .from(cashTransactions)
        .where(eq(cashTransactions.type, "cashflow_receipt"));
      const refSet = new Set(
        receiptRefs.map((r) => r.referenceId).filter(Boolean) as string[],
      );
      for (const cf of receivedCfs) {
        if (!refSet.has(cf.id)) {
          issues.push({
            entityType: "cashflow",
            entityId: cf.id,
            issueType: "missing_ledger_entry",
            severity: "error",
            message: `Cashflow marked as received but no ledger entry found`,
            suggestedFix: "Undo the receipt and re-apply it",
          });
        }
      }
    }

    if (issues.length) {
      await db.insert(dataQualityIssues).values(issues);
    }
    return { count: issues.length };
  });
}

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db
      .select()
      .from(dataQualityIssues)
      .orderBy(desc(dataQualityIssues.createdAt));
  });
}
