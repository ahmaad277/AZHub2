import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  label: z.string().trim().min(1).max(120).default("Data Entry Link"),
  expiresInDays: z.coerce.number().int().positive().max(365).optional(),
  allowedPlatformIds: z.array(z.string()).optional().nullable(),
});

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db.select().from(shareLinks).orderBy(desc(shareLinks.createdAt));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = createSchema.parse(await request.json().catch(() => ({})));
    const token = randomBytes(24).toString("base64url");
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 86_400_000)
      : null;
    const [row] = await db
      .insert(shareLinks)
      .values({
        token,
        label: body.label,
        expiresAt,
        allowedPlatformIds: body.allowedPlatformIds ?? null,
      })
      .returning();
    return row;
  });
}
