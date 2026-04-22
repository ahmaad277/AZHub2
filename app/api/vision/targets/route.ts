import { NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { visionTargets } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { firstOfMonth } from "@/lib/finance/date-smart";
import { z } from "zod";

export const dynamic = "force-dynamic";

const upsertSchema = z.object({
  month: z.coerce.date(),
  targetValue: z.coerce.number().nonnegative(),
  generated: z.boolean().optional().default(false),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    return db.select().from(visionTargets).orderBy(asc(visionTargets.month));
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const parsed = upsertSchema.parse(body);
    const month = firstOfMonth(parsed.month);

    const [existing] = await db
      .select()
      .from(visionTargets)
      .where(eq(visionTargets.month, month))
      .limit(1);

    if (existing) {
      const [row] = await db
        .update(visionTargets)
        .set({
          targetValue: parsed.targetValue.toString(),
          generated: parsed.generated ?? false,
          notes: parsed.notes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(visionTargets.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(visionTargets)
      .values({
        month,
        targetValue: parsed.targetValue.toString(),
        generated: parsed.generated ?? false,
        notes: parsed.notes ?? null,
      })
      .returning();
    return row;
  });
}

const bulkSchema = z.object({
  targets: z.array(
    z.object({
      month: z.coerce.date(),
      targetValue: z.coerce.number().nonnegative(),
    }),
  ),
  replaceAll: z.boolean().optional().default(false),
});

export async function PUT(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const parsed = bulkSchema.parse(body);

    return db.transaction(async (tx) => {
      if (parsed.replaceAll) {
        await tx.delete(visionTargets);
      }
      for (const t of parsed.targets) {
        const month = firstOfMonth(t.month);
        const [existing] = await tx
          .select()
          .from(visionTargets)
          .where(eq(visionTargets.month, month))
          .limit(1);
        if (existing) {
          await tx
            .update(visionTargets)
            .set({ targetValue: t.targetValue.toString(), updatedAt: new Date() })
            .where(eq(visionTargets.id, existing.id));
        } else {
          await tx.insert(visionTargets).values({
            month,
            targetValue: t.targetValue.toString(),
            generated: true,
          });
        }
      }
      return { count: parsed.targets.length };
    });
  });
}
