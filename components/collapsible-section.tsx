"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "./providers";

interface Props {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  id,
  title,
  description,
  actions,
  defaultOpen = true,
  children,
  className,
}: Props) {
  const { settings, toggleCollapsed } = useApp();
  const serverCollapsed = (settings.collapsedSections ?? []).includes(id);
  const [open, setOpen] = React.useState(defaultOpen && !serverCollapsed);

  React.useEffect(() => {
    setOpen(!serverCollapsed);
  }, [serverCollapsed]);

  const onToggle = () => {
    setOpen((o) => !o);
    void toggleCollapsed(id);
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/40 bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <header className="flex items-center gap-3 p-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-start"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
              !open && "rtl:rotate-180",
            )}
          />
          <div>
            <h3 className="text-base font-semibold leading-none">{title}</h3>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </button>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </section>
  );
}
