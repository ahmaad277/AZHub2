import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  fetchCashflowsGet,
  parseLimitParam,
  parsePageParam,
} from "@/lib/server/dashboard-summary-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseLimitParam(searchParams.get("limit"));
    const page = parsePageParam(searchParams.get("page"));

    return fetchCashflowsGet({
      platformId,
      status,
      from,
      to,
      limit,
      page,
    });
  });
}
