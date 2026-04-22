import { NextRequest } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts, cashflows, investments, userSettings } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { daysBetween } from "@/lib/finance/date-smart";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  });
}

/**
 * Regenerate alerts by scanning cashflows. Idempotent: uses dedupe_key so
 * it's safe to call repeatedly (e.g. once per page load or via a cron job).
 */
export async function POST() {
  return handleRoute(async () => {
    await requireOwner();

    const [settingsRow] = await db.select().from(userSettings).limit(1);
    const daysBefore = settingsRow?.alertDaysBefore ?? 7;
    const alertsEnabled = settingsRow?.alertsEnabled ?? true;
    if (!alertsEnabled) return { generated: 0 };

    const now = new Date();
    const upcoming = await db
      .select({ cashflow: cashflows, investment: investments })
      .from(cashflows)
      .innerJoin(investments, eq(investments.id, cashflows.investmentId))
      .where(eq(cashflows.status, "pending"));

    let generated = 0;
    for (const row of upcoming) {
      const due = row.cashflow.dueDate;
      const diff = daysBetween(now, due);

      let type: "distribution" | "maturity" | "overdue" | null = null;
      let severity: "info" | "warning" | "error" = "info";
      let title = "";
      let message = "";

      if (diff < 0 && Math.abs(diff) > 90) {
        type = "overdue";
        severity = "error";
        title = `Defaulted cashflow`;
        message = `${row.investment.name} has a cashflow overdue by ${Math.abs(diff)} days`;
      } else if (diff < 0) {
        type = "overdue";
        severity = "warning";
        title = `Overdue cashflow`;
        message = `${row.investment.name} has a ${row.cashflow.type} cashflow overdue by ${Math.abs(diff)} days`;
      } else if (diff <= daysBefore) {
        type = row.cashflow.type === "principal" ? "maturity" : "distribution";
        severity = "info";
        title = `Upcoming ${row.cashflow.type} — ${row.investment.name}`;
        message = `Due in ${diff} day${diff === 1 ? "" : "s"}`;
      }

      if (!type) continue;

      const dedupeKey = `${type}:${row.cashflow.id}:${diff < 0 ? "overdue" : "upcoming"}`;
      try {
        await db
          .insert(alerts)
          .values({
            type,
            severity,
            title,
            message,
            investmentId: row.investment.id,
            cashflowId: row.cashflow.id,
            dedupeKey,
          })
          .onConflictDoNothing({ target: alerts.dedupeKey });
        generated++;
      } catch {
        // ignore dedupe collisions
      }
    }
    return { generated };
  });
}
