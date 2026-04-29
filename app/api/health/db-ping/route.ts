import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { pgDriver } from "@/db";

export const dynamic = "force-dynamic";

/** Owner-only: raw SELECT 1 to verify Postgres connectivity (pool / TLS / credentials). */
export async function GET() {
  return handleRoute(async () => {
    await requireOwner();
    const t0 = Date.now();
    const rows = await pgDriver`select 1 as ok`;
    const ms = Date.now() - t0;
    return { ok: true, ms, result: rows[0] ?? null };
  });
}
