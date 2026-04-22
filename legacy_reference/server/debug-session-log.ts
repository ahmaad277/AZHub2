import { appendFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Repo root (avoid relying on process.cwd(); dev tasks may start Node elsewhere).
const DEBUG_LOG_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "debug-c320ae.log");
const INGEST_URL =
  "http://127.0.0.1:7631/ingest/ec8f5606-c65a-4add-a328-354a06a73522";

export type DebugSessionPayload = {
  runId?: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: unknown;
};

/** Server-side: append NDJSON to workspace log + forward to Cursor ingest. */
export function appendDebugSessionLog(payload: DebugSessionPayload): void {
  const body = { sessionId: "c320ae", timestamp: Date.now(), ...payload };
  const line = `${JSON.stringify(body)}\n`;
  try {
    appendFileSync(DEBUG_LOG_PATH, line, "utf8");
  } catch (e) {
    console.error("[debug-session-log] append failed:", DEBUG_LOG_PATH, e);
  }
  void fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "c320ae",
    },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** Dev relay from browser: persist only (client already POSTs to ingest). */
export function appendDebugSessionFileOnly(record: Record<string, unknown>): void {
  const body = {
    ...record,
    sessionId: "c320ae",
    timestamp: Date.now(),
  };
  try {
    appendFileSync(DEBUG_LOG_PATH, `${JSON.stringify(body)}\n`, "utf8");
  } catch (e) {
    console.error("[debug-session-log] append failed:", DEBUG_LOG_PATH, e);
  }
}
