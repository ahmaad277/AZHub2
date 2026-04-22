import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  investmentInputSchema,
  previewSchedule,
} from "@/lib/finance/investments-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const input = investmentInputSchema.parse(body);
    const preview = previewSchedule(input);
    return {
      startDate: preview.startDate.toISOString(),
      endDate: preview.endDate.toISOString(),
      durationMonths: preview.durationMonths,
      rows: preview.rows.map((r) => ({
        dueDate: r.dueDate.toISOString(),
        amount: r.amount,
        type: r.type,
        isCustomSchedule: r.isCustomSchedule,
      })),
    };
  });
}
