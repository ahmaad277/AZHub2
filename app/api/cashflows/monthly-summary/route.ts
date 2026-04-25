import { NextRequest } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { cashflows, investments, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { roundToMoney } from "@/lib/finance/money";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const rows = await db
      .select({
        amount: cashflows.amount,
        dueDate: cashflows.dueDate,
        platformId: platforms.id,
        platformName: platforms.name,
        platformColor: platforms.color,
      })
      .from(cashflows)
      .innerJoin(investments, eq(cashflows.investmentId, investments.id))
      .leftJoin(platforms, eq(platforms.id, investments.platformId))
      .where(
        and(
          eq(cashflows.status, "pending"),
          gte(cashflows.dueDate, startOfMonth),
          platformId && platformId !== "all"
            ? eq(investments.platformId, platformId)
            : undefined,
        ),
      )
      .orderBy(asc(cashflows.dueDate));

    const monthMap = new Map<
      string,
      {
        month: string;
        total: number;
        platforms: Map<
          string,
          { platformId: string; platformName: string; platformColor: string | null; total: number }
        >;
      }
    >();

    for (const row of rows) {
      const month = row.dueDate.toISOString().slice(0, 7);
      const platformKey = row.platformId ?? "unknown";
      const monthEntry =
        monthMap.get(month) ??
        {
          month,
          total: 0,
          platforms: new Map(),
        };
      const platformEntry =
        monthEntry.platforms.get(platformKey) ??
        {
          platformId: platformKey,
          platformName: row.platformName ?? "Unknown",
          platformColor: row.platformColor ?? null,
          total: 0,
        };
      const amount = Number(row.amount);
      platformEntry.total = roundToMoney(platformEntry.total + amount);
      monthEntry.total = roundToMoney(monthEntry.total + amount);
      monthEntry.platforms.set(platformKey, platformEntry);
      monthMap.set(month, monthEntry);
    }

    return {
      rows: Array.from(monthMap.values()).map((month) => ({
        month: month.month,
        total: month.total,
        platforms: Array.from(month.platforms.values()),
      })),
    };
  });
}
