import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");

    const conditions = [
      inArray(cashTransactions.type, ["deposit", "withdrawal"])
    ];

    if (platformId && platformId !== "all") {
      conditions.push(eq(cashTransactions.platformId, platformId));
    }

    const result = await db
      .delete(cashTransactions)
      .where(and(...conditions))
      .returning({ id: cashTransactions.id });

    if (result.length > 0) {
      revalidateTag("dashboard-metrics");
    }

    return { success: true, deletedCount: result.length };
  });
}
