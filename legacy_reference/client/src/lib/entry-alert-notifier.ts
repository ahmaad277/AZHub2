import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";

const SEEN_ALERT_IDS_KEY = "azfinance-entry-alert-seen-ids";
const BROWSER_PERMISSION_REQUESTED_KEY = "azfinance-browser-notification-requested";

function loadSeenAlertIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_ALERT_IDS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function saveSeenAlertIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(SEEN_ALERT_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore session storage failures (private mode, quota limits, etc.).
  }
}

async function ensureNotificationPermission(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    const alreadyRequested = localStorage.getItem(BROWSER_PERMISSION_REQUESTED_KEY) === "true";
    if (alreadyRequested) return;
    await Notification.requestPermission();
    localStorage.setItem(BROWSER_PERMISSION_REQUESTED_KEY, "true");
  } catch {
    // Ignore permission request failures.
  }
}

function shouldUseArabic(language: string): boolean {
  return language.toLowerCase().startsWith("ar");
}

function classifyAlertTiming(alert: Alert): "overdue" | "today" | "other" {
  const title = String(alert.title || "").toLowerCase();
  const message = String(alert.message || "").toLowerCase();
  if (alert.severity === "error" || title.includes("late") || message.includes("overdue") || message.includes("متأخر")) {
    return "overdue";
  }
  if (
    message.includes("due in 0 days") ||
    message.includes("due today") ||
    message.includes(" today") ||
    message.includes("اليوم")
  ) {
    return "today";
  }
  return "other";
}

export async function notifyEntryAlerts(language: string): Promise<void> {
  const alertsResponse = await apiRequest("GET", "/api/alerts", undefined);
  const alerts = (await alertsResponse.json()) as Alert[];
  const unreadAlerts = (alerts || []).filter((alert) => !alert.read);
  if (unreadAlerts.length === 0) return;

  const seenIds = loadSeenAlertIds();
  const unseenAlerts = unreadAlerts.filter((alert) => !seenIds.has(alert.id));
  if (unseenAlerts.length === 0) return;

  const isArabic = shouldUseArabic(language);
  const todayCount = unseenAlerts.filter((alert) => classifyAlertTiming(alert) === "today").length;
  const overdueCount = unseenAlerts.filter((alert) => classifyAlertTiming(alert) === "overdue").length;

  toast({
    title: isArabic ? "ملخص التنبيهات عند الدخول" : "Entry Alerts Summary",
    description: isArabic
      ? `${unseenAlerts.length} تنبيه جديد (${todayCount} مستحق اليوم، ${overdueCount} متأخر).`
      : `${unseenAlerts.length} new alerts (${todayCount} due today, ${overdueCount} overdue).`,
  });

  await ensureNotificationPermission();
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    unseenAlerts.slice(0, 3).forEach((alert) => {
      try {
        new Notification(alert.title, {
          body: alert.message,
          tag: `azfinance-alert-${alert.id}`,
        });
      } catch {
        // Ignore browser notification runtime errors.
      }
    });
  }

  unseenAlerts.forEach((alert) => seenIds.add(alert.id));
  saveSeenAlertIds(seenIds);
}
