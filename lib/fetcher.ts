function traceApiRequest(path: string, traceLabel?: string) {
  if (
    typeof window === "undefined" ||
    process.env.NEXT_PUBLIC_FETCH_TRACE !== "1" ||
    !path.includes("/api/")
  ) {
    return;
  }
  console.groupCollapsed("[fetch-trace]", traceLabel ?? "(unlabeled)", path);
  console.log("[fetch-trace] label:", traceLabel ?? "(none)");
  console.log("[fetch-trace] path:", path);
  console.log("[fetch-trace] pathname:", window.location.pathname);
  console.trace();
  console.groupEnd();
}

export async function fetcher<T = unknown>(
  path: string,
  init?: RequestInit,
  traceLabel?: string,
): Promise<T> {
  traceApiRequest(path, traceLabel);

  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  let data: any = null;
  if (text) {
    if (contentType.includes("application/json")) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    } else {
      data = { message: text };
    }
  }
  if (!res.ok) {
    const err = new Error(
      (data && (data.error || data.message)) || `Request failed (${res.status})`,
    ) as Error & { status?: number; details?: unknown };
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, traceLabel?: string) =>
    fetcher<T>(path, { method: "GET" }, traceLabel),
  post: <T>(path: string, body?: unknown, traceLabel?: string) =>
    fetcher<T>(
      path,
      { method: "POST", body: body ? JSON.stringify(body) : undefined },
      traceLabel,
    ),
  patch: <T>(path: string, body?: unknown, traceLabel?: string) =>
    fetcher<T>(
      path,
      { method: "PATCH", body: body ? JSON.stringify(body) : undefined },
      traceLabel,
    ),
  put: <T>(path: string, body?: unknown, traceLabel?: string) =>
    fetcher<T>(
      path,
      { method: "PUT", body: body ? JSON.stringify(body) : undefined },
      traceLabel,
    ),
  del: <T>(path: string, traceLabel?: string) =>
    fetcher<T>(path, { method: "DELETE" }, traceLabel),
};
