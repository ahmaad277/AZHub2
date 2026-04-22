import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Bell, BarChart3, CircleHelp, Home, Settings, Sparkles, Wallet } from "lucide-react";

import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

type CommandAction = {
  id: string;
  label: string;
  shortcut: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

function shouldIgnoreKeyboardShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  const editable = target.getAttribute("contenteditable");
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || editable === "true";
}

export function GlobalCommandPalette() {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const commands = useMemo<CommandAction[]>(
    () => [
      {
        id: "dashboard",
        label: t("nav.dashboard"),
        shortcut: "Ctrl/⌘ 1",
        path: "/dashboard",
        icon: Home,
      },
      {
        id: "investments",
        label: t("nav.investments"),
        shortcut: "Ctrl/⌘ 2",
        path: "/investments",
        icon: Wallet,
      },
      {
        id: "cashflows",
        label: t("nav.cashflows"),
        shortcut: "Ctrl/⌘ 3",
        path: "/cashflows",
        icon: BarChart3,
      },
      {
        id: "alerts",
        label: t("nav.alerts"),
        shortcut: "Ctrl/⌘ 4",
        path: "/alerts",
        icon: Bell,
      },
      {
        id: "settings",
        label: t("nav.settings"),
        shortcut: "Ctrl/⌘ 5",
        path: "/settings",
        icon: Settings,
      },
      {
        id: "operations",
        label: t("nav.operations"),
        shortcut: "Ctrl/⌘ 6",
        path: "/operations",
        icon: Sparkles,
      },
      {
        id: "help",
        label: t("nav.help"),
        shortcut: "Ctrl/⌘ 7",
        path: "/help",
        icon: CircleHelp,
      },
    ],
    [t],
  );

  useEffect(() => {
    const quickRouteMap: Record<string, string> = {
      "1": "/dashboard",
      "2": "/investments",
      "3": "/cashflows",
      "4": "/alerts",
      "5": "/settings",
      "6": "/operations",
      "7": "/help",
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreKeyboardShortcut(event.target)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((previous) => !previous);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && !event.shiftKey) {
        const path = quickRouteMap[event.key];
        if (path) {
          event.preventDefault();
          setOpen(false);
          if (path !== location) {
            setLocation(path);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location, setLocation]);

  const goTo = (path: string) => {
    setOpen(false);
    if (path !== location) {
      setLocation(path);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 px-2.5 text-xs"
        data-testid="button-open-command-palette"
        aria-label={t("commandPalette.openAria")}
      >
        {t("commandPalette.triggerLabel")}
        <span className="ms-2 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
          Ctrl/⌘ K
        </span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("commandPalette.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
          <CommandGroup heading={t("commandPalette.groupQuickNav")}>
            {commands.map((command) => (
              <CommandItem key={command.id} value={`${command.label} ${command.path}`} onSelect={() => goTo(command.path)}>
                <command.icon className="h-4 w-4" />
                <span>{command.label}</span>
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground leading-snug">{t("commandPalette.footerHint")}</div>
      </CommandDialog>
    </>
  );
}
