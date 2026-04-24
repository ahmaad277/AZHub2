import { NextRequest, NextResponse } from "next/server";
import { getOwnerSessionState } from "@/lib/auth";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getOwnerSessionState();

  if (session.status === "authenticated") {
    return NextResponse.json({ status: "authenticated" as const });
  }

  if (session.status === "owner_mismatch") {
    const response = NextResponse.json(
      { status: "owner_mismatch" as const, error: "auth_unauthorized_email" },
      { status: 403 },
    );
    const supabase = createSupabaseRouteHandlerClient(request, response);
    await supabase.auth.signOut();
    return response;
  }

  return NextResponse.json({ status: "no_session" as const });
}
