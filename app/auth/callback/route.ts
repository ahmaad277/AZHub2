import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { sanitizeNextPath } from "@/lib/auth/login-flow-shared";
import { getConfiguredOwnerEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  const redirectTo = new URL(next, request.url);
  const response = NextResponse.redirect(redirectTo);

  if (!code) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_missing_code");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createSupabaseRouteHandlerClient(request, response);
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_callback_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (user.email?.toLowerCase() !== getConfiguredOwnerEmail()) {
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "auth_unauthorized_email");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
