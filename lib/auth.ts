import { createSupabaseServerClient } from "./supabase/server";
import type { User } from "@supabase/supabase-js";

export type OwnerSessionState =
  | { status: "authenticated"; user: User }
  | { status: "no_session" }
  | { status: "owner_mismatch"; userEmail: string | null };

function createAuthError(message: string, status: number) {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}

export function getConfiguredOwnerEmail() {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) {
    throw createAuthError("OWNER_EMAIL is required", 500);
  }
  return ownerEmail;
}

/**
 * Returns the authenticated owner session (or null). Since this is a personal
 * single-user app, we additionally verify the email matches OWNER_EMAIL.
 */
export async function getOwnerSessionState(): Promise<OwnerSessionState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "no_session" };

  const ownerEmail = getConfiguredOwnerEmail();
  if (user.email?.toLowerCase() !== ownerEmail) {
    return { status: "owner_mismatch", userEmail: user.email ?? null };
  }
  return { status: "authenticated", user };
}

export async function getOwnerSession() {
  const session = await getOwnerSessionState();
  return session.status === "authenticated" ? session.user : null;
}

export async function requireOwner() {
  const session = await getOwnerSessionState();
  if (session.status === "authenticated") {
    return session.user;
  }
  if (session.status === "owner_mismatch") {
    throw createAuthError("Signed in with an email that is not authorized", 403);
  }
  throw createAuthError("Unauthorized", 401);
}
