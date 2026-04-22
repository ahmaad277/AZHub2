/**
 * PUBLIC endpoint used by the shareable data-entry page (/share/:token).
 *
 * Security posture:
 *  - Requires a valid, non-revoked, non-expired share link token.
 *  - Can only CREATE investments — nothing else.
 *  - The created investment is forcibly flagged needsReview=true and carries
 *    the sourceShareLinkId so the owner can audit/review it later.
 *  - Optionally restricted to a whitelist of platformIds stored on the link.
 */

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks, platforms } from "@/db/schema";
import { handleRoute, jsonError } from "@/lib/api";
import {
  createInvestmentWithSchedule,
  investmentInputSchema,
} from "@/lib/finance/investments-service";

type Ctx = { params: Promise<{ token: string }> };

async function loadValidLink(token: string) {
  const [row] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.token, token))
    .limit(1);
  if (!row) throw error("Invalid share link", 404);
  if (row.revokedAt) throw error("Share link revoked", 410);
  if (row.expiresAt && row.expiresAt.getTime() < Date.now())
    throw error("Share link expired", 410);
  return row;
}

function error(msg: string, status: number) {
  const e = new Error(msg) as Error & { status?: number };
  e.status = status;
  return e;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    const { token } = await params;
    const link = await loadValidLink(token);
    const pls = await db.select().from(platforms);
    const allowed = link.allowedPlatformIds;
    const filtered = Array.isArray(allowed) && allowed.length
      ? pls.filter((p) => allowed.includes(p.id))
      : pls;
    return {
      valid: true,
      label: link.label,
      expiresAt: link.expiresAt,
      platforms: filtered.map((p) => ({ id: p.id, name: p.name, type: p.type })),
    };
  });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    const { token } = await params;
    const link = await loadValidLink(token);
    const body = await request.json();
    const input = investmentInputSchema.parse(body);

    const allowed = link.allowedPlatformIds;
    if (Array.isArray(allowed) && allowed.length && !allowed.includes(input.platformId)) {
      throw error("Platform not allowed for this link", 403);
    }

    const inv = await createInvestmentWithSchedule(input, {
      sourceShareLinkId: link.id,
      needsReview: true,
    });

    await db
      .update(shareLinks)
      .set({
        usageCount: (link.usageCount ?? 0) + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(shareLinks.id, link.id));

    return { id: inv.id, ok: true };
  });
}
