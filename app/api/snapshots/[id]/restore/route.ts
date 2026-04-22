/**
 * Restore a portfolio snapshot. This is a DESTRUCTIVE operation that wipes
 * all existing rows in the mutable tables and replaces them with whatever is
 * stored in the snapshot payload. Runs inside a single transaction.
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
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

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const [snap] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.id, id))
      .limit(1);
    if (!snap) {
      const e = new Error("Snapshot not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    const data = snap.snapshotData as any;

    await db.transaction(async (tx) => {
      // Order matters: FK-dependent tables first.
      await tx.delete(alerts);
      await tx.delete(dataQualityIssues);
      await tx.delete(cashTransactions);
      await tx.delete(cashflows);
      await tx.delete(investments);
      await tx.delete(visionTargets);
      await tx.delete(platforms);

      if (Array.isArray(data.platforms) && data.platforms.length)
        await tx.insert(platforms).values(data.platforms);
      if (Array.isArray(data.investments) && data.investments.length)
        await tx.insert(investments).values(data.investments);
      if (Array.isArray(data.cashflows) && data.cashflows.length)
        await tx.insert(cashflows).values(data.cashflows);
      if (Array.isArray(data.cashTransactions) && data.cashTransactions.length)
        await tx.insert(cashTransactions).values(data.cashTransactions);
      if (Array.isArray(data.visionTargets) && data.visionTargets.length)
        await tx.insert(visionTargets).values(data.visionTargets);
      if (Array.isArray(data.alerts) && data.alerts.length)
        await tx.insert(alerts).values(data.alerts);
      if (Array.isArray(data.dataQualityIssues) && data.dataQualityIssues.length)
        await tx.insert(dataQualityIssues).values(data.dataQualityIssues);

      if (data.userSettings) {
        const existing = await tx.select().from(userSettings).limit(1);
        if (existing.length) {
          await tx
            .update(userSettings)
            .set({
              viewMode: data.userSettings.viewMode,
              theme: data.userSettings.theme,
              language: data.userSettings.language,
              fontSize: data.userSettings.fontSize,
              colorPalette: data.userSettings.colorPalette,
              currency: data.userSettings.currency,
              targetCapital2040: data.userSettings.targetCapital2040,
              collapsedSections: data.userSettings.collapsedSections,
              alertsEnabled: data.userSettings.alertsEnabled,
              alertDaysBefore: data.userSettings.alertDaysBefore,
              updatedAt: new Date(),
            })
            .where(eq(userSettings.id, existing[0].id));
        }
      }
    });

    return { ok: true };
  });
}
