import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set. Database calls will fail until it is configured.",
  );
}

/**
 * Single shared postgres client. We use a small connection pool (max=5) that
 * is friendly to Supabase's session pooler as well as to Vercel's serverless
 * runtime. Prepare = false keeps it compatible with the transaction pooler.
 */
const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(DATABASE_URL ?? "postgres://invalid", {
    max: 5,
    prepare: false,
    idle_timeout: 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
