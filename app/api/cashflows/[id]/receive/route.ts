/**
 * Atomic "mark cashflow as received" endpoint.
 *
 * THE SINGLE atomic operation: UPDATE cashflow.status='received' AND
 * INSERT cash_transactions row of type='cashflow_receipt'. Both happen in one
 * DB transaction so the ledger can never drift from the cashflow state.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashTransactions, cashflows, investments } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { daysBetween } from "@/lib/finance/date-smart";
import { classifyResolvedIssueDays } from "@/lib/finance/status-resolver";
import { eq } from "drizzle-orm";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  receivedDate: z.coerce.date().optional(),
  /** Optional override — defaults to the cashflow.amount. */
  receivedAmount: z.coerce.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const body = bodySchema.parse(
      (await request.json().catch(() => ({}))) ?? {},
    );

    return db.transaction(async (tx) => {
      const [cf] = await tx
        .select()
        .from(cashflows)
        .where(eq(cashflows.id, id))
        .limit(1);
      if (!cf) {
        const e = new Error("Cashflow not found") as Error & {
          status?: number;
        };
        e.status = 404;
        throw e;
      }
      if (cf.status === "received") {
        return { ok: true, alreadyReceived: true };
      }

      const receivedDate = body.receivedDate ?? new Date();
      const amount = body.receivedAmount ?? Number(cf.amount);

      const [inv] = await tx
        .select({ platformId: investments.platformId, name: investments.name })
        .from(investments)
        .where(eq(investments.id, cf.investmentId))
        .limit(1);

      await tx
        .update(cashflows)
        .set({
          status: "received",
          receivedDate,
        })
        .where(eq(cashflows.id, id));

      await tx.insert(cashTransactions).values({
        amount: amount.toString(),
        type: "cashflow_receipt",
        referenceId: cf.id,
        platformId: inv?.platformId,
        notes: body.notes ?? `Received ${cf.type} for ${inv?.name ?? ""}`.trim(),
        date: receivedDate,
      });

      const investmentCashflows = await tx
        .select({
          dueDate: cashflows.dueDate,
          type: cashflows.type,
          status: cashflows.status,
          receivedDate: cashflows.receivedDate,
        })
        .from(cashflows)
        .where(eq(cashflows.investmentId, cf.investmentId));

      const isCompleted = investmentCashflows.every((row) => row.status === "received");
      if (isCompleted) {
        const resolvedPrincipalIssue = investmentCashflows
          .filter((row) => row.type === "principal" && row.receivedDate)
          .map((row) => ({
            days: daysBetween(row.dueDate, row.receivedDate as Date),
            resolvedAt: row.receivedDate as Date,
          }))
          .filter((row) => row.days > 0)
          .sort((a, b) => b.days - a.days)[0];

        const resolvedIssueStatus = resolvedPrincipalIssue
          ? classifyResolvedIssueDays(resolvedPrincipalIssue.days)
          : null;

        await tx
          .update(investments)
          .set({
            resolvedIssueStatus,
            resolvedIssueDays: resolvedIssueStatus ? resolvedPrincipalIssue.days : null,
            resolvedIssueResolvedAt: resolvedIssueStatus
              ? resolvedPrincipalIssue.resolvedAt
              : null,
            updatedAt: new Date(),
          })
          .where(eq(investments.id, cf.investmentId));
      }

      return { ok: true };
    });
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  /** Undo receipt (reverse the ledger entry). */
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    return db.transaction(async (tx) => {
      const [cf] = await tx
        .select()
        .from(cashflows)
        .where(eq(cashflows.id, id))
        .limit(1);
      if (!cf || cf.status !== "received") {
        return { ok: true, noop: true };
      }
      await tx
        .delete(cashTransactions)
        .where(eq(cashTransactions.referenceId, cf.id));
      await tx
        .update(cashflows)
        .set({ status: "pending", receivedDate: null })
        .where(eq(cashflows.id, id));
      if (cf.type === "principal") {
        await tx
          .update(investments)
          .set({
            resolvedIssueStatus: null,
            resolvedIssueDays: null,
            resolvedIssueResolvedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(investments.id, cf.investmentId));
      }
      return { ok: true };
    });
  });
}
