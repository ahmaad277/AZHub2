import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function readDatabaseUrlFromEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL not found in .env.local");
  return line.split("=", 2)[1].trim();
}

const url = readDatabaseUrlFromEnvLocal();
const sql = postgres(url, { max: 1, prepare: false });

// This table name was created accidentally in Supabase and blocks `drizzle-kit push`
// because Drizzle thinks `alerts` might be a rename of it.
await sql.unsafe(`drop table if exists "A.Z Hub" cascade;`);

console.log('[drop] dropped table "A.Z Hub" (if it existed)');
await sql.end();
