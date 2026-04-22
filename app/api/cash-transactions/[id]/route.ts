import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { handleRoute, jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(cashTransactions)
      .where(eq(cashTransactions.id, id))
      .limit(1);
    if (!existing) {
      const e = new Error("Not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    if (
      existing.type === "cashflow_receipt" ||
      existing.type === "investment_funding"
    ) {
      const e = new Error(
        "Cannot delete linked ledger entries directly. Use the corresponding cashflow action.",
      ) as Error & { status?: number };
      e.status = 409;
      throw e;
    }
    await db.delete(cashTransactions).where(eq(cashTransactions.id, id));
    return { ok: true };
  });
}
