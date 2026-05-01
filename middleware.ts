import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every request so Server Components
 * and Route Handlers always see the latest state.
 *
 * Public routes (/share/:token, /login, /reset-pin, /auth/callback, /api/auth/*)
 * are not gated here —
 * individual route handlers enforce the owner-only rule via `requireOwner()`.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files, Next.js internals,
     * and the public share endpoint (which intentionally runs without auth).
     */
    "/((?!_next/static|_next/image|favicon.ico|share/|api/share/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
