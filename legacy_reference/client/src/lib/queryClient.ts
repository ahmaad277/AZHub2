import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Cache persistence helpers
const CACHE_KEY = "azfinance-query-cache";
const CACHE_VERSION = "v3"; // Updated to clear old cache (faceValue refactoring complete)
const CACHE_TIME = 1000 * 60 * 60 * 24; // 24 hours
const FETCH_TIMEOUT_MS = 20000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timeout after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: Record<string, string> },
): Promise<Response> {
  const customHeaders = options?.headers ?? {};
  const res = await fetchWithTimeout(url, {
    method,
    headers: data ? { "Content-Type": "application/json", ...customHeaders } : customHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export function createIdempotencyKey(scope: string): string {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${scope}-${randomPart}`;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetchWithTimeout(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Save cache to localStorage
export function saveCache() {
  try {
    const cache = queryClient.getQueryCache().getAll();
    const serializedCache = cache
      .filter((query) => {
        const firstKey = String(query.queryKey?.[0] ?? "");
        return firstKey !== "data-entry";
      })
      .map(query => ({
        queryKey: query.queryKey,
        state: query.state,
      }));
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      timestamp: Date.now(),
      queries: serializedCache,
    }));
  } catch (error) {
    console.warn('[Cache] Failed to save cache:', error);
  }
}

// Load cache from localStorage
export function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return;
    
    const { version, timestamp, queries } = JSON.parse(cached);
    
    // Check version and age
    if (version !== CACHE_VERSION || Date.now() - timestamp > CACHE_TIME) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    
    // Restore queries
    queries.forEach(({ queryKey, state }: any) => {
      if (String(queryKey?.[0] ?? "") === "data-entry") {
        return;
      }
      queryClient.setQueryData(queryKey, state.data);
    });
    
    console.log('[Cache] Loaded cache with', queries.length, 'queries');
  } catch (error) {
    console.warn('[Cache] Failed to load cache:', error);
    localStorage.removeItem(CACHE_KEY);
  }
}

// Clear cache
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  queryClient.clear();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Allow refetchOnMount to work (changed from Infinity)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Auto-save cache on page unload only (removed periodic save to prevent UI freezing)
if (typeof window !== 'undefined') {
  // Save cache before page unload
  window.addEventListener('beforeunload', saveCache);
  
  // Save cache when visibility changes (tab switch/minimize)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      saveCache();
    }
  });
  
  // Load cache on startup
  loadCache();
}
