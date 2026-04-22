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

// WARNING: destructive. Intended for early-stage projects where we want migrations
// to be the authoritative bootstrap path (not a mix of `db:push` + `db:migrate`).
await sql.unsafe(`drop schema if exists public cascade;`);
await sql.unsafe(`create schema public;`);
// Restore baseline grants Supabase expects on `public` (mirrors default project init).
await sql.unsafe(`grant usage on schema public to postgres, anon, authenticated, service_role;`);
await sql.unsafe(
  `grant all on schema public to postgres, service_role; grant all on schema public to authenticated; grant all on schema public to anon;`,
);

console.log("[reset-public] recreated schema public (cascade dropped previous objects)");
await sql.end();
