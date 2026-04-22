import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    viewMode: z.enum(["pro", "lite"]).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
    language: z.enum(["en", "ar"]).optional(),
    fontSize: z.enum(["small", "medium", "large"]).optional(),
    colorPalette: z.string().optional(),
    currency: z.string().optional(),
    targetCapital2040: z.coerce.number().nonnegative().optional(),
    collapsedSections: z.array(z.string()).optional(),
    alertsEnabled: z.boolean().optional(),
    alertDaysBefore: z.coerce.number().int().min(0).max(365).optional(),
  })
  .partial();

async function getOrCreateSettings(email: string) {
  const [existing] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.ownerEmail, email))
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(userSettings)
    .values({ ownerEmail: email })
    .returning();
  return row;
}

export async function GET() {
  return handleRoute(async () => {
    const user = await requireOwner();
    return getOrCreateSettings(user.email ?? "owner@example.com");
  });
}

export async function PATCH(request: NextRequest) {
  return handleRoute(async () => {
    const user = await requireOwner();
    const body = await request.json();
    const parsed = patchSchema.parse(body);
    const current = await getOrCreateSettings(user.email ?? "owner@example.com");
    const [row] = await db
      .update(userSettings)
      .set({
        ...parsed,
        targetCapital2040: parsed.targetCapital2040?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.id, current.id))
      .returning();
    return row;
  });
}
