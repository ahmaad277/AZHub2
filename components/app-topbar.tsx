"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Moon, Sun, Languages, Gauge, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "./providers";
import { api } from "@/lib/fetcher";
import type { Platform } from "@/db/schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AppTopbar() {
  const { t, settings, setSettings, platformFilter, setPlatformFilter } = useApp();
  const { setTheme, theme } = useTheme();

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => api.get<Platform[]>("/api/platforms"),
  });

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="hidden min-w-[10rem] max-w-[14rem] md:block">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder={t("dash.allPlatforms")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dash.allPlatforms")}</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() =>
            setSettings({
              viewMode: settings.viewMode === "pro" ? "lite" : "pro",
            })
          }
          title={
            settings.viewMode === "pro" ? t("common.liteMode") : t("common.proMode")
          }
        >
          <Gauge className="h-4 w-4" />
          <span className="hidden sm:inline">
            {settings.viewMode === "pro"
              ? t("common.proMode")
              : t("common.liteMode")}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettings({ language: settings.language === "ar" ? "en" : "ar" })}
          title={t("settings.language")}
        >
          <Languages className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            setTheme(next);
            setSettings({ theme: next as any });
          }}
          title={t("settings.theme")}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                AZ
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("app.name")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
