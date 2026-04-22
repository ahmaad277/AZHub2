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

const rows = await sql`
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema = 'public'
  order by table_name;
`;

console.table(rows);
await sql.end();
