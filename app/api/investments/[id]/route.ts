import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashflows, investments, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { resolveStatus } from "@/lib/finance/status-resolver";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    notes: z.string().max(1000).nullable().optional(),
    needsReview: z.boolean().optional(),
    tags: z.array(z.string()).nullable().optional(),
    expectedIrr: z.coerce.number().min(0).max(100).optional(),
    expectedProfit: z.coerce.number().nonnegative().optional(),
  })
  .partial();

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const [row] = await db
      .select({ investment: investments, platform: platforms })
      .from(investments)
      .leftJoin(platforms, eq(platforms.id, investments.platformId))
      .where(eq(investments.id, id))
      .limit(1);
    if (!row) {
      const err = new Error("Not found") as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    const cfs = await db
      .select()
      .from(cashflows)
      .where(eq(cashflows.investmentId, id));
    const { status, overdueDays } = resolveStatus({
      endDate: row.investment.endDate,
      cashflows: cfs.map((c) => ({
        status: c.status as "pending" | "received",
        dueDate: c.dueDate,
      })),
    });
    return {
      ...row.investment,
      platform: row.platform,
      derivedStatus: status,
      overdueDays,
      cashflows: cfs,
    };
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.parse(body);
    const [row] = await db
      .update(investments)
      .set({
        ...parsed,
        expectedIrr: parsed.expectedIrr?.toString(),
        expectedProfit: parsed.expectedProfit?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(investments.id, id))
      .returning();
    return row;
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    await db.delete(investments).where(eq(investments.id, id));
    return { ok: true };
  });
}
