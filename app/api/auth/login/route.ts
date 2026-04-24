import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getConfiguredOwnerEmail } from "@/lib/auth";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const loginSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The PIN must be exactly 6 digits." },
      { status: 422 },
    );
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createSupabaseRouteHandlerClient(request, response);

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email: getConfiguredOwnerEmail(),
    password: parsed.data.pin,
  });

  if (error || !user) {
    return NextResponse.json(
      { error: "The PIN is incorrect. Please try again." },
      { status: 401 },
    );
  }

  if (user.email?.toLowerCase() !== getConfiguredOwnerEmail()) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Signed in with an email that is not authorized." },
      { status: 403 },
    );
  }

  return response;
}
