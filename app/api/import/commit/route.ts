import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { importJobs } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  createInvestmentWithSchedule,
  investmentInputSchema,
} from "@/lib/finance/investments-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ jobId: z.string().min(1) });

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { jobId } = bodySchema.parse(await request.json());
    const [job] = await db
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, jobId))
      .limit(1);
    if (!job || job.status !== "previewed") {
      const e = new Error("Job not in preview state") as Error & {
        status?: number;
      };
      e.status = 409;
      throw e;
    }

    const rows = investmentInputSchema.array().parse(job.payload);
    let committed = 0;
    for (const r of rows) {
      try {
        await createInvestmentWithSchedule(r, { needsReview: false });
        committed++;
      } catch (e) {
        console.error("[import commit] row failed", e);
      }
    }

    await db
      .update(importJobs)
      .set({ status: "committed", committedCount: committed, updatedAt: new Date() })
      .where(eq(importJobs.id, jobId));

    return { committed };
  });
}
