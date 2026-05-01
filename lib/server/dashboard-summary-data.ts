import { db } from "@/db";
import { cashflows, investments, platforms } from "@/db/schema";
import { resolveStatus } from "@/lib/finance/status-resolver";
import { roundToMoney } from "@/lib/finance/money";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

export function parseLimitParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
}

export function parsePageParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function fetchPlatformsList() {
  const rows = await db
    .select()
    .from(platforms)
    .orderBy(asc(platforms.name));
  return rows;
}

export async function fetchInvestmentsGet(options: {
  platformId: string | null | undefined;
  needsReviewOnly: boolean;
  limit: number | undefined;
  page: number;
}) {
  const { platformId, needsReviewOnly, limit, page } = options;

  const baseWhere =
    platformId && platformId !== "all"
      ? eq(investments.platformId, platformId)
      : undefined;

  let listQuery = db
    .select({
      investment: investments,
      platform: platforms,
    })
    .from(investments)
    .leftJoin(platforms, eq(platforms.id, investments.platformId))
    .where(baseWhere)
    .orderBy(desc(investments.createdAt))
    .$dynamic();

  let rows: Awaited<ReturnType<typeof listQuery.execute>>;
  let count = 0;

  if (limit) {
    listQuery = listQuery.limit(limit).offset((page - 1) * limit);
    const countQuery = db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(investments)
      .where(baseWhere);
    const [countRow, pageRows] = await Promise.all([countQuery, listQuery]);
    count = countRow[0]?.count ?? 0;
    rows = pageRows;
  } else {
    rows = await listQuery;
  }

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
        type: c.type as "profit" | "principal",
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

  const finalRows = needsReviewOnly
    ? enriched.filter((e) => e.needsReview)
    : enriched;

  if (limit) {
    return {
      rows: finalRows,
      totalCount: count,
    };
  }

  return finalRows;
}

export async function fetchCashflowsGet(options: {
  platformId: string | null | undefined;
  status: string | null | undefined;
  from: string | null | undefined;
  to: string | null | undefined;
  limit: number | undefined;
  page: number;
}) {
  const { platformId, status, from, to, limit, page } = options;

  const conds: any[] = [];
  if (status && status !== "all") conds.push(eq(cashflows.status, status as any));
  if (from) conds.push(gte(cashflows.dueDate, new Date(from)));
  if (to) conds.push(lte(cashflows.dueDate, new Date(to)));
  if (platformId && platformId !== "all") {
    conds.push(eq(investments.platformId, platformId));
  }
  const baseWhere = conds.length ? and(...conds) : undefined;

  const aggregateQuery = db
    .select({
      count: sql<number>`cast(count(*) as integer)`,
      totalAmount: sql<string>`sum(${cashflows.amount})`,
    })
    .from(cashflows)
    .innerJoin(investments, eq(cashflows.investmentId, investments.id))
    .where(baseWhere);

  let listQuery = db
    .select({
      cashflow: cashflows,
      investment: investments,
      platform: platforms,
    })
    .from(cashflows)
    .innerJoin(investments, eq(cashflows.investmentId, investments.id))
    .leftJoin(platforms, eq(platforms.id, investments.platformId))
    .where(baseWhere)
    .orderBy(asc(cashflows.dueDate))
    .$dynamic();

  if (limit) {
    listQuery = listQuery.limit(limit).offset((page - 1) * limit);
  }

  const [[{ count, totalAmount }], rows] = await Promise.all([
    aggregateQuery,
    listQuery,
  ]);

  const normalizedRows = rows.map((r) => ({
    ...r.cashflow,
    investment: { ...r.investment, platform: r.platform },
  }));

  return {
    rows: normalizedRows,
    summary: {
      totalAmount: Number(totalAmount ?? 0),
    },
    totalCount: count,
  };
}

export async function fetchMonthlyCashflowSummary(
  platformId: string | null | undefined,
) {
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
        {
          platformId: string;
          platformName: string;
          platformColor: string | null;
          total: number;
        }
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
}
