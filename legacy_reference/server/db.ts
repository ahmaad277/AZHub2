import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";

const dbPath = path.join(process.cwd(), "local.db");
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
sqlite.exec(`
CREATE TABLE IF NOT EXISTS data_quality_issues (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  suggested_fix TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  resolved_at INTEGER
);

CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source_type TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'investment',
  status TEXT NOT NULL DEFAULT 'previewed',
  payload TEXT NOT NULL,
  summary TEXT,
  errors TEXT,
  committed_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
`);

// Backfill newer columns for existing databases (safe if already exists).
try { sqlite.exec(`ALTER TABLE import_jobs ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'investment'`); } catch {}
try { sqlite.exec(`ALTER TABLE import_jobs ADD COLUMN errors TEXT`); } catch {}
try { sqlite.exec(`ALTER TABLE import_jobs ADD COLUMN committed_count INTEGER NOT NULL DEFAULT 0`); } catch {}
try { sqlite.exec(`ALTER TABLE investments ADD COLUMN exclude_platform_fees INTEGER NOT NULL DEFAULT 0`); } catch {}

export const db = drizzle(sqlite, { schema });
