import { NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import {
  alerts,
  cashTransactions,
  cashflows,
  dataQualityIssues,
  investments,
  platforms,
  portfolioSnapshots,
  userSettings,
  visionTargets,
} from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db
      .select({
        id: portfolioSnapshots.id,
        name: portfolioSnapshots.name,
        entityCounts: portfolioSnapshots.entityCounts,
        byteSize: portfolioSnapshots.byteSize,
        createdAt: portfolioSnapshots.createdAt,
      })
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.createdAt));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = createSchema.parse(await request.json());

    const [pls, invs, cfs, txs, tgts, alerRows, dqs, settingsRow] = await Promise.all(
      [
        db.select().from(platforms),
        db.select().from(investments),
        db.select().from(cashflows),
        db.select().from(cashTransactions),
        db.select().from(visionTargets),
        db.select().from(alerts),
        db.select().from(dataQualityIssues),
        db.select().from(userSettings).limit(1),
      ],
    );

    const snapshotData = {
      version: 2,
      takenAt: new Date().toISOString(),
      platforms: pls,
      investments: invs,
      cashflows: cfs,
      cashTransactions: txs,
      visionTargets: tgts,
      alerts: alerRows,
      dataQualityIssues: dqs,
      userSettings: settingsRow[0] ?? null,
    };
    const asString = JSON.stringify(snapshotData);
    const byteSize = Buffer.byteLength(asString, "utf-8");
    const entityCounts = {
      platforms: pls.length,
      investments: invs.length,
      cashflows: cfs.length,
      cashTransactions: txs.length,
      visionTargets: tgts.length,
      alerts: alerRows.length,
    };

    const [row] = await db
      .insert(portfolioSnapshots)
      .values({
        name: body.name,
        snapshotData,
        entityCounts,
        byteSize,
      })
      .returning();
    return row;
  });
}
