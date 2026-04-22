const FORM_DRAFT_VERSION = 1;

interface FormDraftEnvelope<T> {
  version: number;
  updatedAt: number;
  savedAt?: number;
  isSaved?: boolean;
  data: T;
}

export const DEFAULT_FORM_DRAFT_STALE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/**
 * Load a form draft from localStorage
 * @param key - Storage key
 * @param staleMs - Time in ms before draft is considered stale (default 14 days)
 * @returns Parsed draft data or null if not found/stale
 */
export function loadFormDraft<T>(key: string, staleMs: number = DEFAULT_FORM_DRAFT_STALE_MS): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as FormDraftEnvelope<T>;
    if (!parsed || parsed.version !== FORM_DRAFT_VERSION || !parsed.data || !parsed.updatedAt) {
      localStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.updatedAt > staleMs) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Get draft metadata (for showing last saved time, etc.)
 */
export function getFormDraftMetadata(key: string): { updatedAt: number | null; isSaved: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { updatedAt: null, isSaved: false };

    const parsed = JSON.parse(raw) as FormDraftEnvelope<any>;
    return {
      updatedAt: parsed.updatedAt || null,
      isSaved: parsed.isSaved || false,
    };
  } catch {
    return { updatedAt: null, isSaved: false };
  }
}

/**
 * Save a form draft to localStorage
 * @param key - Storage key
 * @param data - Form data to save
 * @param isSaved - Optional flag to mark as fully saved to server
 */
export function saveFormDraft<T>(key: string, data: T, isSaved = false): void {
  try {
    const envelope: FormDraftEnvelope<T> = {
      version: FORM_DRAFT_VERSION,
      updatedAt: Date.now(),
      savedAt: isSaved ? Date.now() : undefined,
      isSaved,
      data,
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore storage errors to avoid breaking form interaction.
  }
}

/**
 * Check if a draft exists and is not stale
 */
export function hasDraft(key: string, staleMs: number = DEFAULT_FORM_DRAFT_STALE_MS): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as FormDraftEnvelope<any>;
    if (!parsed || parsed.version !== FORM_DRAFT_VERSION || !parsed.updatedAt) {
      return false;
    }

    return Date.now() - parsed.updatedAt <= staleMs;
  } catch {
    return false;
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}
