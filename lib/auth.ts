import { createSupabaseServerClient } from "./supabase/server";

/**
 * Returns the authenticated owner session (or null). Since this is a personal
 * single-user app, we additionally verify the email matches OWNER_EMAIL.
 */
export async function getOwnerSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase();
  if (ownerEmail && user.email?.toLowerCase() !== ownerEmail) {
    return null;
  }
  return user;
}

export async function requireOwner() {
  const user = await getOwnerSession();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return user;
}
