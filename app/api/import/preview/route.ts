/**
 * Accepts an array of investment-like rows (parsed client-side from CSV/XLSX)
 * and validates them against the canonical schema. Returns a preview payload
 * that the UI can display and the user can then commit.
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { importJobs, platforms } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { investmentInputSchema } from "@/lib/finance/investments-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  sourceType: z.enum(["csv", "xlsx", "json"]).default("csv"),
  entityType: z.enum(["investment"]).default("investment"),
  rows: z.array(z.record(z.any())),
});

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = payloadSchema.parse(await request.json());
    const pls = await db.select().from(platforms);
    const platformByName = new Map(pls.map((p) => [p.name.toLowerCase(), p.id]));

    const valid: Array<z.infer<typeof investmentInputSchema>> = [];
    const errors: Array<{ row: number; message: string; data: unknown }> = [];

    body.rows.forEach((raw, idx) => {
      const normalized: any = { ...raw };
      if (normalized.platform && !normalized.platformId) {
        normalized.platformId =
          platformByName.get(String(normalized.platform).toLowerCase()) ?? "";
      }
      const parsed = investmentInputSchema.safeParse(normalized);
      if (parsed.success) {
        valid.push(parsed.data);
      } else {
        errors.push({
          row: idx + 1,
          message: parsed.error.issues.map((i) => i.message).join("; "),
          data: raw,
        });
      }
    });

    const [job] = await db
      .insert(importJobs)
      .values({
        sourceType: body.sourceType,
        entityType: body.entityType,
        status: "previewed",
        payload: valid,
        summary: { validCount: valid.length, errorCount: errors.length },
        errors,
      })
      .returning();

    return { jobId: job.id, validCount: valid.length, errors };
  });
}
