const SHARE_BASE_URL_KEY = "azfinance-share-base-url";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function tryCreateUrl(raw: string): URL | null {
  const normalized = normalizeBaseUrl(raw);
  if (!normalized) return null;
  const withProtocol =
    /^https?:\/\//i.test(normalized) ? normalized : `http://${normalized}`;
  try {
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function isLocalHostName(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizeShareBaseUrlInput(value: string): string {
  const parsed = tryCreateUrl(value);
  if (!parsed) return normalizeBaseUrl(value);
  return normalizeBaseUrl(parsed.toString());
}

export function isValidShareBaseUrl(value: string): boolean {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return true;
  const parsed = tryCreateUrl(value);
  if (!parsed) return false;
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

export function getStoredShareBaseUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return normalizeBaseUrl(localStorage.getItem(SHARE_BASE_URL_KEY) || "");
  } catch {
    return "";
  }
}

export function setStoredShareBaseUrl(value: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeShareBaseUrlInput(value);
  try {
    if (!normalized) {
      localStorage.removeItem(SHARE_BASE_URL_KEY);
      return;
    }
    localStorage.setItem(SHARE_BASE_URL_KEY, normalized);
  } catch {
    // Ignore storage errors
  }
}

export function getShareBaseUrl(): string {
  const fromEnv = normalizeShareBaseUrlInput(
    ((import.meta as any).env?.VITE_PUBLIC_BASE_URL as string) || "",
  );
  if (fromEnv) return fromEnv;

  const fromStorage = getStoredShareBaseUrl();
  if (fromStorage) {
    const parsedStored = tryCreateUrl(fromStorage);
    if (parsedStored && typeof window !== "undefined") {
      const current = tryCreateUrl(window.location.origin);
      if (current && isLocalHostName(parsedStored.hostname) && !isLocalHostName(current.hostname)) {
        return normalizeBaseUrl(current.toString());
      }
    }
    return fromStorage;
  }

  if (typeof window !== "undefined") {
    return normalizeBaseUrl(window.location.origin);
  }
  return "";
}

export function buildDataEntryShareUrl(token?: string | null): string {
  if (!token) return "";
  const base = getShareBaseUrl();
  if (!base) return "";
  return `${base}/data-entry/${encodeURIComponent(token)}`;
}

export { SHARE_BASE_URL_KEY };
