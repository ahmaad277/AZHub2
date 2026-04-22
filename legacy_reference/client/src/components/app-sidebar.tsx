import { LayoutDashboard, TrendingUp, Wallet, BarChart3, Bell, RefreshCw, BookOpen, Settings2, FileText, DollarSign, Target, History, Workflow } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useLanguage } from "@/lib/language-provider";

const routePreloaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/dashboard"),
  "/dashboard": () => import("@/pages/dashboard"),
  "/investments": () => import("@/pages/investments"),
  "/cashflows": () => import("@/pages/cashflows-unified"),
  "/reports": () => import("@/pages/reports"),
  "/operations": () => import("@/pages/operations"),
  "/alerts": () => import("@/pages/alerts"),
  "/vision-2040": () => import("@/pages/vision-2040"),
  "/help": () => import("@/pages/help"),
  "/changelog": () => import("@/pages/changelog"),
  "/settings": () => import("@/pages/settings"),
};

const prefetchedRoutes = new Set<string>();

const menuItems = [
  {
    key: "dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    key: "investments",
    url: "/investments",
    icon: Wallet,
  },
  {
    key: "cashflows",
    url: "/cashflows",
    icon: TrendingUp,
  },
  {
    key: "reports",
    url: "/reports",
    icon: FileText,
  },
  {
    key: "operations",
    url: "/operations",
    icon: Workflow,
  },
  {
    key: "alerts",
    url: "/alerts",
    icon: Bell,
  },
  {
    key: "vision2040",
    url: "/vision-2040",
    icon: Target,
  },
  {
    key: "help",
    url: "/help",
    icon: BookOpen,
  },
  {
    key: "changelog",
    url: "/changelog",
    icon: History,
  },
  {
    key: "settings",
    url: "/settings",
    icon: Settings2,
  },
];


export function AppSidebar() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const { setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const prefetchRoute = (url: string) => {
    if (prefetchedRoutes.has(url)) return;
    const preload = routePreloaders[url];
    if (!preload) return;

    prefetchedRoutes.add(url);
    void preload().catch(() => {
      // Allow re-attempt in case preload fails (e.g. transient network issue).
      prefetchedRoutes.delete(url);
    });
  };

  return (
    <Sidebar side="right">
      <SidebarHeader className="border-b border-sidebar-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">A.Z Finance Hub</span>
            <span className="text-xs text-muted-foreground">Vision 2040</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`link-${item.key}`}
                      className="hover-elevate active-elevate-2"
                    >
                      <Link
                        href={item.url}
                        onClick={handleNavClick}
                        onMouseEnter={() => prefetchRoute(item.url)}
                        onFocus={() => prefetchRoute(item.url)}
                        onTouchStart={() => prefetchRoute(item.url)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{t(`nav.${item.key}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground">
          <div>© 2025 A.Z Finance</div>
          <div>v1.0.1</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
