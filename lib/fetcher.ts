function traceApiRequest(path: string) {
  if (
    typeof window === "undefined" ||
    process.env.NEXT_PUBLIC_FETCH_TRACE !== "1" ||
    !path.includes("/api/")
  ) {
    return;
  }
  console.groupCollapsed("[fetch-trace]", path);
  console.log("[fetch-trace] pathname:", window.location.pathname);
  console.trace();
  console.groupEnd();
}

export async function fetcher<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  traceApiRequest(path);

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
  get: <T>(path: string) => fetcher<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    fetcher<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    fetcher<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    fetcher<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => fetcher<T>(path, { method: "DELETE" }),
};
