"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createTranslator, type Locale } from "@/lib/i18n/dictionary";

interface SettingsShape {
  viewMode: "pro" | "lite";
  theme: "dark" | "light" | "system";
  language: Locale;
  fontSize: "small" | "medium" | "large";
  colorPalette: string;
  currency: string;
  targetCapital2040: string | null;
  collapsedSections: string[];
  alertsEnabled: boolean;
  alertDaysBefore: number;
}

const DEFAULT_SETTINGS: SettingsShape = {
  viewMode: "pro",
  theme: "dark",
  language: "ar",
  fontSize: "medium",
  colorPalette: "azure",
  currency: "SAR",
  targetCapital2040: null,
  collapsedSections: [],
  alertsEnabled: true,
  alertDaysBefore: 7,
};

interface AppContextValue {
  settings: SettingsShape;
  setSettings: (partial: Partial<SettingsShape>) => Promise<void>;
  platformFilter: string; // "all" | platformId
  setPlatformFilter: (id: string) => void;
  t: (key: string, fallback?: string) => string;
  locale: Locale;
  isRtl: boolean;
  toggleCollapsed: (key: string) => Promise<void>;
}

const AppContext = React.createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <Providers>");
  return ctx;
}

export function Providers({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<SettingsShape>;
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );

  const [settings, setLocalSettings] = React.useState<SettingsShape>({
    ...DEFAULT_SETTINGS,
    ...(initialSettings ?? {}),
  });
  const [platformFilter, setPlatformFilter] = React.useState<string>("all");

  const setSettings = React.useCallback(
    async (partial: Partial<SettingsShape>) => {
      setLocalSettings((prev) => ({ ...prev, ...partial }));
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
      } catch (err) {
        console.error("Failed to persist settings", err);
      }
    },
    [],
  );

  const toggleCollapsed = React.useCallback(
    async (key: string) => {
      const current = settings.collapsedSections ?? [];
      const next = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      await setSettings({ collapsedSections: next });
    },
    [settings.collapsedSections, setSettings],
  );

  React.useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", settings.language);
    html.setAttribute("dir", settings.language === "ar" ? "rtl" : "ltr");
    html.setAttribute("data-font-size", settings.fontSize);
  }, [settings.language, settings.fontSize]);

  const t = React.useMemo(() => createTranslator(settings.language), [settings.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme={settings.theme}
        enableSystem
        forcedTheme={undefined}
      >
        <AppContext.Provider
          value={{
            settings,
            setSettings,
            platformFilter,
            setPlatformFilter,
            t,
            locale: settings.language,
            isRtl: settings.language === "ar",
            toggleCollapsed,
          }}
        >
          {children}
          <Toaster richColors position="top-center" />
        </AppContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
