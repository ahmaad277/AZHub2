/**
 * Background Task Manager
 * 
 * Ensures background tasks (status check + alert generation) run exactly once per browser session.
 * Uses in-memory singleton flag for intra-session navigation and optionally syncs with sessionStorage
 * for manual reloads.
 */

import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

// Module-level singleton flag
let hasBackgroundTasksRun = false;

// Session storage key for persistence across manual reloads
const STORAGE_KEY = 'azfinance_background_tasks_run';

/**
 * Check if background tasks have already run in this session
 */
function hasRun(): boolean {
  // Check in-memory flag first (fastest)
  if (hasBackgroundTasksRun) {
    return true;
  }
  
  // Check sessionStorage for manual reload persistence (SSR-safe)
  if (typeof sessionStorage !== 'undefined') {
    try {
      const storedValue = sessionStorage.getItem(STORAGE_KEY);
      if (storedValue === 'true') {
        hasBackgroundTasksRun = true; // Sync in-memory state
        return true;
      }
    } catch (error) {
      // Ignore storage errors (private browsing, quota exceeded, etc.)
      if (import.meta.env.DEV) {
        console.warn('[BackgroundTaskManager] SessionStorage access failed:', error);
      }
    }
  }
  
  return false;
}

/**
 * Mark background tasks as run (SSR-safe)
 */
function markAsRun(): void {
  hasBackgroundTasksRun = true;
  
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      // Ignore storage errors - in-memory flag is sufficient
      if (import.meta.env.DEV) {
        console.warn('[BackgroundTaskManager] Failed to save to sessionStorage:', error);
      }
    }
  }
}

/**
 * Run background tasks (status check + alert generation) exactly once per session
 * Returns a promise that resolves when all tasks complete
 */
export async function runBackgroundTasksOnce(): Promise<void> {
  // Guard: if already run, return immediately
  if (hasRun()) {
    return Promise.resolve();
  }
  
  try {
    // Run both tasks in parallel (silent - no toasts)
    const results = await Promise.allSettled([
      // Check investment statuses
      apiRequest("POST", "/api/investments/check-status", {})
        .then(async (response) => {
          const data = await response.json();
          if (data.updatesApplied > 0) {
            queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
          }
          return data;
        }),
      
      // Generate alerts
      apiRequest("POST", "/api/alerts/generate", {})
        .then(async (response) => {
          await response.json().catch(() => null);
          queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        })
    ]);
    
    const allSucceeded = results.every((result) => result.status === "fulfilled");
    
    if (allSucceeded) {
      // Mark as run only when both jobs are successful to avoid silently skipping failed alerts.
      markAsRun();
      
      // Log for debugging
      if (import.meta.env.DEV) {
        console.log('[BackgroundTaskManager] Tasks completed:', {
          statusCheck: results[0].status,
          alertGeneration: results[1].status,
        });
      }
    } else {
      // At least one task failed - don't mark as run to allow retry.
      if (import.meta.env.DEV) {
        console.error('[BackgroundTaskManager] Background tasks incomplete:', {
          statusCheck: results[0].status === 'rejected' ? (results[0] as PromiseRejectedResult).reason : 'ok',
          alertGeneration: results[1].status === 'rejected' ? (results[1] as PromiseRejectedResult).reason : 'ok',
        });
      }
    }
  } catch (error) {
    // Unexpected error - don't mark as run to allow retry
    if (import.meta.env.DEV) {
      console.error('[BackgroundTaskManager] Unexpected error running background tasks:', error);
    }
  }
}

/**
 * Reset the flag (useful for testing or manual refresh scenarios)
 * SSR-safe implementation
 */
export function resetBackgroundTasks(): void {
  hasBackgroundTasksRun = false;
  
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Ignore storage errors
      if (import.meta.env.DEV) {
        console.warn('[BackgroundTaskManager] Failed to clear sessionStorage:', error);
      }
    }
  }
}

/**
 * Check if tasks have been run (useful for testing)
 */
export function getBackgroundTasksStatus(): boolean {
  return hasRun();
}
