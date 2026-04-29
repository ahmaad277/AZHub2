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
 * Single shared postgres client. max=1 limits each serverless instance to one
 * DB connection so many concurrent Lambdas do not exhaust Supabase session slots.
 * Use the transaction pooler (port 6543) in DATABASE_URL in production.
 * prepare=false stays compatible with PgBouncer transaction mode.
 */
const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(DATABASE_URL ?? "postgres://invalid", {
    max: 1,
    prepare: false,
    idle_timeout: 30,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
