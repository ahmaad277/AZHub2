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
import { revalidateTag } from "next/cache";

type Ctx = { params: Promise<{ id: string }> };
const RESET_SNAPSHOT_ID = "__reset__";

const toISO = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v as any);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const toDate = (v: unknown): Date | null => {
  const iso = toISO(v);
  return iso ? new Date(iso) : null;
};

const normalizeSnapshotRows = (rows: any[], label: string): any[] =>
  rows.map((row, idx) => {
    const out: Record<string, any> = { ...row };
    for (const [key, value] of Object.entries(out)) {
      if (!/(At|Date)$/.test(key) || value === null || value === undefined) continue;
      const parsed = toDate(value);
      if (!parsed) {
        throw new Error(`Invalid snapshot ${label} date at row ${idx + 1}: ${key}`);
      }
      out[key] = parsed;
    }
    return out;
  });

const clearPortfolioData = async (tx: any) => {
  // Order matters: FK-dependent tables first.
  await tx.delete(alerts);
  await tx.delete(dataQualityIssues);
  await tx.delete(cashTransactions);
  await tx.delete(cashflows);
  await tx.delete(investments);
  await tx.delete(visionTargets);
  await tx.delete(platforms);
};

export async function POST(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    if (id === RESET_SNAPSHOT_ID) {
      await db.transaction(async (tx) => {
        await clearPortfolioData(tx);
      });
      revalidateTag("dashboard-metrics");
      revalidateTag("platforms-list");
      return { ok: true, reset: true };
    }
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
    if (!data || typeof data !== "object") {
      throw new Error("Invalid snapshot");
    }

    await db.transaction(async (tx) => {
      await clearPortfolioData(tx);

      if (Array.isArray(data.platforms) && data.platforms.length)
        await tx.insert(platforms).values(normalizeSnapshotRows(data.platforms, "platforms"));
      if (Array.isArray(data.investments) && data.investments.length)
        await tx
          .insert(investments)
          .values(normalizeSnapshotRows(data.investments, "investments"));
      if (Array.isArray(data.cashflows) && data.cashflows.length)
        await tx.insert(cashflows).values(normalizeSnapshotRows(data.cashflows, "cashflows"));
      if (Array.isArray(data.cashTransactions) && data.cashTransactions.length)
        await tx
          .insert(cashTransactions)
          .values(normalizeSnapshotRows(data.cashTransactions, "cashTransactions"));
      if (Array.isArray(data.visionTargets) && data.visionTargets.length)
        await tx
          .insert(visionTargets)
          .values(normalizeSnapshotRows(data.visionTargets, "visionTargets"));
      if (Array.isArray(data.alerts) && data.alerts.length)
        await tx.insert(alerts).values(normalizeSnapshotRows(data.alerts, "alerts"));
      if (Array.isArray(data.dataQualityIssues) && data.dataQualityIssues.length)
        await tx
          .insert(dataQualityIssues)
          .values(normalizeSnapshotRows(data.dataQualityIssues, "dataQualityIssues"));

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

    revalidateTag("dashboard-metrics");
    revalidateTag("platforms-list");

    return { ok: true };
  });
}
