const INGEST_URL =
  "http://127.0.0.1:7631/ingest/ec8f5606-c65a-4add-a328-354a06a73522";

type DebugPayload = {
  runId?: string;
  hypothesisId: string;
  location: string;
  message: string;
  data?: unknown;
};

/** Browser: ingest + dev-only relay so NDJSON lands in workspace `debug-c320ae.log`. */
export function debugSessionLog(payload: DebugPayload): void {
  const body = { sessionId: "c320ae", timestamp: Date.now(), ...payload };
  const str = JSON.stringify(body);
  void fetch(INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "c320ae",
    },
    body: str,
  }).catch(() => {});
  if (import.meta.env.DEV) {
    void fetch("/api/_debug/session-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: str,
    }).catch(() => {});
  }
}
