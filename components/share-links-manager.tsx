"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "./providers";
import { api } from "@/lib/fetcher";
import { formatDate } from "@/lib/finance/money";
import type { ShareLink } from "@/db/schema";

export function ShareLinksManager() {
  const pathname = usePathname();
  const { t, settings } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [label, setLabel] = React.useState("Data Entry Link");
  const [days, setDays] = React.useState(30);

  const { data = [] } = useQuery<ShareLink[]>({
    queryKey: ["share-links"],
    queryFn: () => api.get<ShareLink[]>("/api/share-links"),
    enabled: pathname === "/settings",
  });

  const create = async () => {
    try {
      await api.post("/api/share-links", { label, expiresInDays: days });
      toast.success(t("shareLinks.linkCreated"));
      await qc.invalidateQueries({ queryKey: ["share-links"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const revoke = async (id: string) => {
    try {
      await api.del(`/api/share-links/${id}`);
      await qc.invalidateQueries({ queryKey: ["share-links"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copy = (token: string) => {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${base}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(t("common.copied"));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("shareLinks.label")}
          className="h-9 min-w-[8rem] flex-1"
          aria-label={t("shareLinks.label")}
        />
        <Input
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(Number(e.target.value) || 0)}
          className="h-9 w-16"
          aria-label={t("shareLinks.days")}
        />
        <Button
          onClick={create}
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-3"
          aria-label={t("settings.generateShareLink")}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t("settings.generateShareLink")}</span>
        </Button>
      </div>

      <div className="divide-y divide-border/60 rounded-lg border border-border/60">
        {data.map((l) => {
          const revoked = !!l.revokedAt;
          const expired =
            l.expiresAt !== null && new Date(l.expiresAt).getTime() < Date.now();
          const active = !revoked && !expired;
          const metaParts = [
            t("shareLinks.usedCount").replace("{count}", String(l.usageCount)),
            l.expiresAt
              ? t("shareLinks.expiresOn").replace(
                  "{date}",
                  formatDate(l.expiresAt, dateLocale),
                )
              : null,
          ].filter(Boolean);

          return (
            <div
              key={l.id}
              className={`flex items-center gap-2 px-3 py-2 ${!active ? "opacity-60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{l.label}</span>
                  {revoked ? (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {t("shareLinks.revoked")}
                    </Badge>
                  ) : expired ? (
                    <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                      {t("shareLinks.expired")}
                    </Badge>
                  ) : (
                    <Badge variant="success" className="h-5 px-1.5 text-[10px]">
                      {t("shareLinks.active")}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copy(l.token)}
                  disabled={!active}
                  aria-label={t("common.copy")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild disabled={!active}>
                  <a href={`/share/${l.token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => revoke(l.id)}
                  disabled={revoked}
                  aria-label={t("form.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {data.length === 0 ? (
          <div className="py-4 text-center text-xs text-muted-foreground">{t("common.empty")}</div>
        ) : null}
      </div>
    </div>
  );
}
