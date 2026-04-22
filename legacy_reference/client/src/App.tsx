import { Switch, Route, useLocation } from "wouter";
import { queryClient, clearCache } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { PlatformFilterProvider } from "@/lib/platform-filter-context";
import { DataEntryProvider, useDataEntry } from "@/lib/data-entry-context";
import { RouteGuard } from "@/components/route-guard";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SaveCheckpointButton } from "@/components/save-checkpoint-button";
import { PlatformFilterButton } from "@/components/platform-filter-button";
import { ShareDataEntryButton } from "@/components/share-data-entry-button";
import { GlobalCommandPalette } from "@/components/global-command-palette";
import { lazy, Suspense, useEffect, useRef } from "react";
import { useSwipeGesture } from "@/hooks/use-swipe-gesture";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyAppFontSize, loadStoredFontSize } from "@/lib/font-size";
import { runBackgroundTasksOnce } from "@/lib/backgroundTaskManager";
import { notifyEntryAlerts } from "@/lib/entry-alert-notifier";
import { Loader2 } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { ErrorBoundary } from "@/components/error-boundary";
import { SettingsAppearanceSync } from "@/components/settings-appearance-sync";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Investments = lazy(() => import("@/pages/investments"));
const CashflowsUnified = lazy(() => import("@/pages/cashflows-unified"));
const Reports = lazy(() => import("@/pages/reports"));
const Operations = lazy(() => import("@/pages/operations"));
const Alerts = lazy(() => import("@/pages/alerts"));
const Help = lazy(() => import("@/pages/help"));
const Changelog = lazy(() => import("@/pages/changelog"));
const Settings = lazy(() => import("@/pages/settings"));
const PlatformDetails = lazy(() => import("@/pages/platform-details"));
const Vision2040 = lazy(() => import("@/pages/vision-2040"));
const DataEntry = lazy(() => import("@/pages/data-entry"));
const NotFound = lazy(() => import("@/pages/not-found"));
const idlePrefetchRoutes: Array<() => Promise<unknown>> = [
  () => import("@/pages/investments"),
  () => import("@/pages/cashflows-unified"),
  () => import("@/pages/dashboard"),
];

// App version - increment to force cache clear
const APP_VERSION = "6";
const VERSION_KEY = "azfinance-app-version";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function OwnerRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/investments" component={Investments} />
        <Route path="/cashflows" component={CashflowsUnified} />
        <Route path="/reports" component={Reports} />
        <Route path="/operations" component={Operations} />
        <Route path="/alerts" component={Alerts} />
        <Route path="/vision-2040" component={Vision2040} />
        <Route path="/help" component={Help} />
        <Route path="/changelog" component={Changelog} />
        <Route path="/settings" component={Settings} />
        <Route path="/platform/:id" component={PlatformDetails} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function DataEntryRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DataEntry />
    </Suspense>
  );
}

function MainContent() {
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Enable swipe gesture to open sidebar on mobile
  useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile) {
        setOpenMobile(true);
      }
    },
    enabled: isMobile,
    edgeThreshold: 50,
    minSwipeDistance: 50,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          <div className="hidden sm:block">
            <GlobalCommandPalette />
          </div>
          <ShareDataEntryButton />
          <PlatformFilterButton />
          {!isMobile && <SaveCheckpointButton />}
          <ThemeToggle />
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-4 sm:py-4 md:px-6 lg:px-8 lg:py-5">
        <OwnerRouter />
      </main>
    </div>
  );
}

function AppContent() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const { isDataEntryMode, isInitializing } = useDataEntry();
  const [location] = useLocation();
  const hasStoredToken = localStorage.getItem("azfinance-data-entry-token");
  const isOnDataEntryRoute = location.startsWith("/data-entry/");
  const hasEntryNotificationsRunRef = useRef(false);
  const hasEntryNotificationsInFlightRef = useRef(false);

  // Initialize auto-save functionality
  useAutoSave();
  useAutoBackup();

  useEffect(() => {
    if (isInitializing || isDataEntryMode || isOnDataEntryRoute || hasStoredToken) return;
    if (hasEntryNotificationsRunRef.current) return;
    if (hasEntryNotificationsInFlightRef.current) return;
    hasEntryNotificationsInFlightRef.current = true;

    const preferredLanguage = localStorage.getItem("language") || document.documentElement.lang || "ar";
    void runBackgroundTasksOnce()
      .then(async () => {
        await notifyEntryAlerts(preferredLanguage);
        hasEntryNotificationsRunRef.current = true;
        hasEntryNotificationsInFlightRef.current = false;
      })
      .catch(() => {
        hasEntryNotificationsRunRef.current = false;
        hasEntryNotificationsInFlightRef.current = false;
      });
  }, [isInitializing, isDataEntryMode, isOnDataEntryRoute, hasStoredToken]);
  
  if (isInitializing) {
    return <LoadingFallback />;
  }
  
  if (hasStoredToken && !isOnDataEntryRoute) {
    return <LoadingFallback />;
  }

  if (isDataEntryMode || isOnDataEntryRoute) {
    return (
      <div className="flex h-screen w-full">
        <RouteGuard>
          <DataEntryRouter />
        </RouteGuard>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={false}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <RouteGuard>
          <MainContent />
        </RouteGuard>
      </div>
    </SidebarProvider>
  );
}

function App() {
  useEffect(() => {
    applyAppFontSize(loadStoredFontSize());
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== APP_VERSION) {
      clearCache();
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const win = window as Window & {
      requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const runPrefetch = () => {
      if (cancelled) return;
      idlePrefetchRoutes.forEach((loadRoute) => {
        void loadRoute().catch(() => {
          // Ignore background prefetch failures.
        });
      });
    };

    if (typeof window === "undefined") return;

    if (typeof win.requestIdleCallback === "function" && typeof win.cancelIdleCallback === "function") {
      const idleId = win.requestIdleCallback(() => runPrefetch(), { timeout: 1800 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }

    timeoutId = globalThis.setTimeout(runPrefetch, 1200);
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <LanguageProvider defaultLanguage="en">
            <DataEntryProvider>
              <PlatformFilterProvider>
                <TooltipProvider>
                  <SettingsAppearanceSync />
                  <AppContent />
                  <Toaster />
                </TooltipProvider>
              </PlatformFilterProvider>
            </DataEntryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
