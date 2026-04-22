import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { portfolioSnapshots } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const [row] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.id, id))
      .limit(1);
    if (!row) {
      const e = new Error("Not found") as Error & { status?: number };
      e.status = 404;
      throw e;
    }
    return row;
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    await db.delete(portfolioSnapshots).where(eq(portfolioSnapshots.id, id));
    return { ok: true };
  });
}
