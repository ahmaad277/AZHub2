import { jsonOk } from "@/lib/api";

export async function GET() {
  return jsonOk({
    ok: true,
    service: "az-finance-hub",
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV ?? "development",
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      ownerConfigured: Boolean(process.env.OWNER_EMAIL),
    },
  });
}
