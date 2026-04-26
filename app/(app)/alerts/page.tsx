"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellRing, Check, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "success" | "error";
  read: boolean;
  createdAt: string;
}

const VARIANT: Record<string, "default" | "warning" | "destructive" | "success"> = {
  info: "default",
  warning: "warning",
  error: "destructive",
  success: "success",
};

export default function AlertsPage() {
  const { t } = useApp();
  const qc = useQueryClient();

  const { data = [] } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: () => api.get<Alert[]>("/api/alerts"),
  });

  const regenerate = async () => {
    try {
      const { generated } = await api.post<{ generated: number }>("/api/alerts");
      toast.success(`Regenerated ${generated} alerts`);
      await qc.invalidateQueries({ queryKey: ["alerts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const markRead = async (id: string, read: boolean) => {
    await api.patch(`/api/alerts/${id}`, { read });
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  const remove = async (id: string) => {
    await api.del(`/api/alerts/${id}`);
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BellRing className="h-4 w-4" /> {data.filter((a) => !a.read).length} unread
        </div>
        <Button onClick={regenerate} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> {t("common.scan")}
        </Button>
      </div>

      <div className="space-y-2">
        {data.map((a) => (
          <div
            key={a.id}
            className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${
              a.read ? "opacity-70" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant={VARIANT[a.severity] ?? "default"}>{a.severity}</Badge>
                <span className="text-sm font-semibold">{a.title}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{a.message}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!a.read ? (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => markRead(a.id, true)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove(a.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("common.empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
