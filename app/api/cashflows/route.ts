import { NextRequest } from "next/server";
import { and, asc, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cashflows, investments, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { sumMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const status = searchParams.get("status"); // pending | received | all
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseLimit(searchParams.get("limit"));

    const conds: any[] = [];
    if (status && status !== "all") conds.push(eq(cashflows.status, status as any));
    if (from) conds.push(gte(cashflows.dueDate, new Date(from)));
    if (to) conds.push(lte(cashflows.dueDate, new Date(to)));
    if (platformId && platformId !== "all") {
      conds.push(eq(investments.platformId, platformId));
    }

    let query = db
      .select({
        cashflow: cashflows,
        investment: investments,
        platform: platforms,
      })
      .from(cashflows)
      .innerJoin(investments, eq(cashflows.investmentId, investments.id))
      .leftJoin(platforms, eq(platforms.id, investments.platformId))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(cashflows.dueDate))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }

    const rows = await query;

    const normalizedRows = rows.map((r) => ({
      ...r.cashflow,
      investment: { ...r.investment, platform: r.platform },
    }));

    return {
      rows: normalizedRows,
      summary: {
        totalAmount: sumMoney(normalizedRows.map((row) => row.amount)),
      },
    };
  });
}
