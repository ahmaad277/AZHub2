import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getConfiguredOwnerEmail } from "@/lib/auth";
import { getRequestOrigin } from "@/lib/auth/login-flow";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = getRequestOrigin(request);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  const { error } = await supabase.auth.resetPasswordForEmail(getConfiguredOwnerEmail(), {
    redirectTo: `${origin}/auth/callback?next=/reset-pin`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Could not send the recovery email right now. Please try again shortly." },
      { status: 429 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Recovery instructions were sent to the owner email inbox.",
  });
}
