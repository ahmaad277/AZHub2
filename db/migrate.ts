/**
 * Applies Drizzle-generated SQL migrations + the curated SQL view files
 * that live under `db/sql/`.
 *
 * Run with: `npm run db:migrate`
 */

import dotenv from "dotenv";

// Prefer local Next.js env file; fall back to `.env` for deployed environments.
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  const migrationsFolder = path.join(process.cwd(), "db", "migrations");
  console.log("[migrate] applying Drizzle migrations from", migrationsFolder);
  await migrate(db, { migrationsFolder });

  const sqlFolder = path.join(process.cwd(), "db", "sql");
  try {
    const files = (await readdir(sqlFolder)).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      const sqlText = await readFile(path.join(sqlFolder, f), "utf-8");
      console.log(`[migrate] applying SQL file: ${f}`);
      await client.unsafe(sqlText);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[migrate] no db/sql/ folder — skipping view application");
    } else {
      throw err;
    }
  }

  await client.end();
  console.log("[migrate] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
