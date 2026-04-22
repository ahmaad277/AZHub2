import { NextRequest } from "next/server";
import { db } from "@/db";
import { platforms, insertPlatformSchema } from "@/db/schema";
import { handleRoute, jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const [row] = await db
      .select()
      .from(platforms)
      .where(eq(platforms.id, id))
      .limit(1);
    if (!row) {
      const err = new Error("Not found") as Error & { status?: number };
      err.status = 404;
      throw err;
    }
    return row;
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const body = await request.json();
    const parsed = insertPlatformSchema.partial().parse(body);
    const [row] = await db
      .update(platforms)
      .set(parsed)
      .where(eq(platforms.id, id))
      .returning();
    return row;
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    await db.delete(platforms).where(eq(platforms.id, id));
    return { ok: true };
  });
}
