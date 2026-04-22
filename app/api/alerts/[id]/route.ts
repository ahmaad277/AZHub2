import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({ read: z.boolean() });

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const [row] = await db
      .update(alerts)
      .set({ read: body.read })
      .where(eq(alerts.id, id))
      .returning();
    return row;
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  return handleRoute(async () => {
    await requireOwner();
    const { id } = await params;
    await db.delete(alerts).where(eq(alerts.id, id));
    return { ok: true };
  });
}
