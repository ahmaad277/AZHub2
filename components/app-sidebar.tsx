"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Wallet,
  CalendarClock,
  Target,
  Settings,
  BarChart3,
  FileText,
  BellRing,
  ShieldCheck,
  Archive,
  Upload,
  Sparkles,
  TrendingUp,
  Coins,
  Building,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "./providers";

const NAV_ITEMS = [
  { href: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/investments", key: "nav.investments", icon: Briefcase },
  { href: "/cashflows", key: "nav.cashflows", icon: CalendarClock },
  { href: "/wallet", key: "nav.wallet", icon: Wallet },
  { href: "/platforms", key: "nav.platforms", icon: BarChart3 },
  { href: "/vision", key: "nav.vision", icon: Target },
  { href: "/alerts", key: "nav.alerts", icon: BellRing },
  { href: "/reports", key: "nav.reports", icon: FileText },
  { href: "/data-quality", key: "nav.dataQuality", icon: ShieldCheck },
  { href: "/import", key: "nav.import", icon: Upload },
  { href: "/settings", key: "nav.settings", icon: Settings },
];

const SECONDARY_NAV_ITEMS = [
  { href: "/stocks", key: "nav.stocks", icon: TrendingUp },
  { href: "/gold", key: "nav.gold", icon: Coins },
  { href: "/real-estate", key: "nav.realEstate", icon: Building },
  { href: "/liabilities", key: "nav.liabilities", icon: CreditCard },
];

interface AppSidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ mobile = false, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useApp();

  return (
    <aside
      className={cn(
        mobile
          ? "flex h-full w-60 shrink-0 flex-col border-e bg-card shadow-xl"
          : "sticky top-0 hidden h-screen w-60 shrink-0 border-e bg-card/50 backdrop-blur md:flex md:flex-col",
      )}
    >
      <div className="flex items-center gap-2 p-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">{t("app.name")}</div>
          <div className="text-xs text-muted-foreground">v3.1</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 mb-2 px-3">
          <div className="h-px w-full bg-border" />
        </div>
        
        <ul className="space-y-1">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(item.key)}</span>
                  </div>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {t("common.comingSoon")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4 text-xs text-muted-foreground">
        {t("app.tagline")}
      </div>
    </aside>
  );
}
