import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  createInvestmentWithSchedule,
  investmentInputSchema,
} from "@/lib/finance/investments-service";
import {
  fetchInvestmentsGet,
  parseLimitParam,
  parsePageParam,
} from "@/lib/server/dashboard-summary-data";

import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const needsReviewOnly = searchParams.get("needsReview") === "true";
    const limit = parseLimitParam(searchParams.get("limit"));
    const page = parsePageParam(searchParams.get("page"));

    return fetchInvestmentsGet({
      platformId,
      needsReviewOnly,
      limit,
      page,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const body = await request.json();
    const input = investmentInputSchema.parse(body);
    const inv = await createInvestmentWithSchedule(input);
    revalidateTag("dashboard-metrics");
    return inv;
  });
}
