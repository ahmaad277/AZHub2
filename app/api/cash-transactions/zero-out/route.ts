import { NextRequest } from "next/server";
import { db } from "@/db";
import { cashTransactions } from "@/db/schema";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { sumMoney } from "@/lib/finance/money";
import { revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");

    // جلب جميع حركات الكاش
    const rows = await db
      .select({ amount: cashTransactions.amount, platformId: cashTransactions.platformId })
      .from(cashTransactions);

    const transactionsToInsert = [];

    if (platformId && platformId !== "all") {
      // تصفير منصة محددة
      const platformRows = rows.filter(r => r.platformId === platformId);
      const balance = sumMoney(platformRows.map(r => r.amount));
      if (balance > 0) {
        transactionsToInsert.push({
          type: "withdrawal" as const,
          amount: (-1 * balance).toString(),
          platformId: platformId,
          notes: "تصفير الرصيد النقدي",
        });
      }
    } else {
      // تصفير جميع المنصات
      const balancesByPlatform = new Map<string | null, number>();
      for (const row of rows) {
        const current = balancesByPlatform.get(row.platformId) || 0;
        balancesByPlatform.set(row.platformId, current + parseFloat(row.amount));
      }

      for (const [pid, balance] of balancesByPlatform.entries()) {
        const roundedBalance = sumMoney([balance]);
        if (roundedBalance > 0) {
          transactionsToInsert.push({
            type: "withdrawal" as const,
            amount: (-1 * roundedBalance).toString(),
            platformId: pid,
            notes: "تصفير الرصيد النقدي",
          });
        }
      }
    }

    if (transactionsToInsert.length > 0) {
      await db.insert(cashTransactions).values(transactionsToInsert);
      revalidateTag("dashboard-metrics");
    }

    return { success: true, zeroedCount: transactionsToInsert.length };
  });
}
