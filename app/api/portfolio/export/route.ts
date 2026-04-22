/**
 * Structured JSON export of the user's anonymized portfolio.
 * Designed for future AI Advisor Agents to consume.
 */

import { db } from "@/db";
import {
  cashTransactions,
  cashflows,
  investments,
  platforms,
  visionTargets,
} from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { getDashboardMetrics, getPlatformBreakdown } from "@/lib/finance/metrics";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    const [pls, invs, cfs, txs, targets, metrics, breakdown] = await Promise.all([
      db.select().from(platforms),
      db.select().from(investments).orderBy(desc(investments.createdAt)),
      db.select().from(cashflows),
      db.select().from(cashTransactions).orderBy(desc(cashTransactions.date)),
      db.select().from(visionTargets),
      getDashboardMetrics(),
      getPlatformBreakdown(),
    ]);

    return {
      schemaVersion: 2,
      generatedAt: new Date().toISOString(),
      currency: "SAR",
      metrics,
      breakdown,
      platforms: pls,
      investments: invs,
      cashflows: cfs,
      cashTransactions: txs,
      visionTargets: targets,
    };
  });
}
