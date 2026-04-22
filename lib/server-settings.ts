import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";

/**
 * Load owner settings on the server for SSR hydration. Returns safe defaults
 * when DB is not configured yet (e.g. first boot).
 */
export async function getInitialSettings() {
  const defaults = {
    viewMode: "pro" as const,
    theme: "dark" as const,
    language: "ar" as const,
    fontSize: "medium" as const,
    colorPalette: "azure",
    currency: "SAR",
    targetCapital2040: null as string | null,
    collapsedSections: [] as string[],
    alertsEnabled: true,
    alertDaysBefore: 7,
  };
  try {
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) return defaults;
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.ownerEmail, ownerEmail))
      .limit(1);
    if (!row) return defaults;
    return {
      viewMode: row.viewMode,
      theme: row.theme,
      language: row.language,
      fontSize: row.fontSize,
      colorPalette: row.colorPalette,
      currency: row.currency,
      targetCapital2040: row.targetCapital2040,
      collapsedSections: (row.collapsedSections as string[]) ?? [],
      alertsEnabled: row.alertsEnabled,
      alertDaysBefore: row.alertDaysBefore,
    };
  } catch (e) {
    console.warn("[settings] falling back to defaults:", (e as Error).message);
    return defaults;
  }
}
