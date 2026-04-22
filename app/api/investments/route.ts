import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashflows, investments, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  createInvestmentWithSchedule,
  investmentInputSchema,
} from "@/lib/finance/investments-service";
import { resolveStatus } from "@/lib/finance/status-resolver";
import { asc, desc, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const needsReviewOnly = searchParams.get("needsReview") === "true";

    const rows = await db
      .select({
        investment: investments,
        platform: platforms,
      })
      .from(investments)
      .leftJoin(platforms, eq(platforms.id, investments.platformId))
      .where(
        platformId && platformId !== "all"
          ? eq(investments.platformId, platformId)
          : undefined,
      )
      .orderBy(desc(investments.createdAt));

    const ids = rows.map((r) => r.investment.id);
    const cfs = ids.length
      ? await db.select().from(cashflows).where(inArray(cashflows.investmentId, ids))
      : [];
    const cfByInvestment = new Map<string, typeof cfs>();
    for (const cf of cfs) {
      const list = cfByInvestment.get(cf.investmentId) ?? [];
      list.push(cf);
      cfByInvestment.set(cf.investmentId, list);
    }

    const enriched = rows.map(({ investment, platform }) => {
      const theseCfs = cfByInvestment.get(investment.id) ?? [];
      const { status, overdueDays } = resolveStatus({
        endDate: investment.endDate,
        cashflows: theseCfs.map((c) => ({
          status: c.status as "pending" | "received",
          dueDate: c.dueDate,
        })),
      });
      const received = theseCfs.filter(
        (c) => c.status === "received" && c.type === "profit",
      );
      const principalReturned = theseCfs.filter(
        (c) => c.status === "received" && c.type === "principal",
      );
      const realizedProfit = received.reduce((a, c) => a + Number(c.amount), 0);
      return {
        ...investment,
        platform,
        derivedStatus: status,
        overdueDays,
        cashflowsCount: theseCfs.length,
        realizedProfit,
        principalReturned: principalReturned.reduce(
          (a, c) => a + Number(c.amount),
          0,
        ),
      };
    });

    return needsReviewOnly
      ? enriched.filter((e) => e.needsReview)
      : enriched;
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const input = investmentInputSchema.parse(body);
    const inv = await createInvestmentWithSchedule(input);
    return inv;
  });
}
