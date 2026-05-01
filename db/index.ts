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
 * Single shared postgres client for Drizzle. Limited pool per serverless instance.
 * Use Supabase transaction pooler (6543) in production DATABASE_URL; prepare=false
 * matches PgBouncer transaction mode. connect_timeout bounds TCP/TLS handshake.
 */
const globalForPg = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForPg.pgClient ??
  postgres(DATABASE_URL ?? "postgres://invalid", {
    // Transaction pooler (6543): modest parallelism; too low caused long queues on /api/dashboard/summary.
    max: 4,
    prepare: false,
    idle_timeout: 30,
    connect_timeout: 10,
    ssl: "require",
    debug: process.env.DB_DEBUG === "1",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgClient = client;
}

/** Underlying postgres.js driver (tagged template) for ping/diagnostics only. */
export const pgDriver = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
