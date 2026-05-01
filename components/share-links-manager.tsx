"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "./providers";
import { api } from "@/lib/fetcher";
import type { ShareLink } from "@/db/schema";

export function ShareLinksManager() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [label, setLabel] = React.useState("Data Entry Link");
  const [days, setDays] = React.useState(30);

  const { data = [] } = useQuery<ShareLink[]>({
    queryKey: ["share-links"],
    queryFn: () =>
      api.get<ShareLink[]>("/api/share-links", "settings:share-links"),
  });

  const create = async () => {
    try {
      await api.post("/api/share-links", { label, expiresInDays: days });
      toast.success("Link created");
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("settings.shareLinkDescription")}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[12rem] space-y-2">
          <Label>Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="w-28 space-y-2">
          <Label>Days</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 0)}
          />
        </div>
        <Button onClick={create} className="gap-2">
          <Plus className="h-4 w-4" /> {t("settings.generateShareLink")}
        </Button>
      </div>

      <div className="space-y-2">
        {data.map((l) => {
          const revoked = !!l.revokedAt;
          const expired =
            l.expiresAt !== null &&
            new Date(l.expiresAt).getTime() < Date.now();
          const active = !revoked && !expired;
          return (
            <div
              key={l.id}
              className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                !active ? "opacity-60" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{l.label}</span>
                  {revoked ? (
                    <Badge variant="destructive">revoked</Badge>
                  ) : expired ? (
                    <Badge variant="warning">expired</Badge>
                  ) : (
                    <Badge variant="success">active</Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  token: {l.token} · used {l.usageCount}×
                  {l.expiresAt
                    ? ` · expires ${new Date(l.expiresAt).toLocaleDateString()}`
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => copy(l.token)}
                  disabled={!active}
                >
                  <Copy className="h-3.5 w-3.5" /> {t("common.copy")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  disabled={!active}
                >
                  <a href={`/share/${l.token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => revoke(l.id)}
                  disabled={revoked}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
        {data.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t("common.empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
