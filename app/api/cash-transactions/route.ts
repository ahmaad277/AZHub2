import { NextRequest } from "next/server";
import { and, desc, eq, gte, lte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cashTransactions, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";
import { roundToMoney, sumMoney } from "@/lib/finance/money";

import { revalidateTag } from "next/cache";

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

    const normalizedRows = rows.map((r) => ({ ...r.tx, platform: r.platform }));

    return {
      rows: normalizedRows,
      summary: {
        balance: sumMoney(normalizedRows.map((row) => row.amount)),
        deposits: sumMoney(
          normalizedRows
            .filter((row) => row.type === "deposit")
            .map((row) => row.amount),
        ),
        withdrawals: sumMoney(
          normalizedRows
            .filter((row) => row.type === "withdrawal")
            .map((row) => row.amount),
        ),
        receipts: sumMoney(
          normalizedRows
            .filter((row) => row.type === "cashflow_receipt")
            .map((row) => row.amount),
        ),
      },
    };
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const parsed = createSchema.parse(body);

    let finalAmount = roundToMoney(parsed.amount);

    if (parsed.type === "withdrawal") {
      const conds = [];
      if (parsed.platformId) {
        conds.push(eq(cashTransactions.platformId, parsed.platformId));
      } else {
        conds.push(isNull(cashTransactions.platformId));
      }

      const rows = await db
        .select({ amount: cashTransactions.amount })
        .from(cashTransactions)
        .where(conds.length ? and(...conds) : undefined);

      const currentBalance = sumMoney(rows.map((r) => r.amount));

      if (currentBalance <= 0) {
        throw new Error("لا يوجد رصيد كافي للسحب");
      }

      if (finalAmount > currentBalance) {
        finalAmount = currentBalance;
      }
    }

    const signedAmount =
      parsed.type === "deposit"
        ? finalAmount
        : -1 * finalAmount;

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
    revalidateTag("dashboard-metrics");
    return row;
  });
}
