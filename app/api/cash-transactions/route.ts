import { NextRequest } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { cashTransactions, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";
import { roundToMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.coerce.number().positive(),
  date: z.coerce.date().optional(),
  notes: z.string().max(500).optional().nullable(),
  platformId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const type = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conds: any[] = [];
    if (platformId && platformId !== "all") conds.push(eq(cashTransactions.platformId, platformId));
    if (type && type !== "all") conds.push(eq(cashTransactions.type, type as any));
    if (from) conds.push(gte(cashTransactions.date, new Date(from)));
    if (to) conds.push(lte(cashTransactions.date, new Date(to)));

    const rows = await db
      .select({
        tx: cashTransactions,
        platform: platforms,
      })
      .from(cashTransactions)
      .leftJoin(platforms, eq(platforms.id, cashTransactions.platformId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(cashTransactions.date));

    return rows.map((r) => ({ ...r.tx, platform: r.platform }));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const signedAmount =
      parsed.type === "deposit"
        ? roundToMoney(parsed.amount)
        : -1 * roundToMoney(parsed.amount);

    const [row] = await db
      .insert(cashTransactions)
      .values({
        type: parsed.type,
        amount: signedAmount.toString(),
        date: parsed.date ?? new Date(),
        platformId: parsed.platformId ?? null,
        notes: parsed.notes ?? null,
      })
      .returning();
    return row;
  });
}
