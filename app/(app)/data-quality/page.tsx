"use client";

import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";

interface Issue {
  id: string;
  entityType: string;
  entityId: string;
  issueType: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggestedFix: string | null;
  status: "open" | "resolved" | "ignored";
  createdAt: string;
}

export default function DataQualityPage() {
  const pathname = usePathname();
  const { t } = useApp();
  const qc = useQueryClient();

  const { data = [] } = useQuery<Issue[]>({
    queryKey: ["dq"],
    queryFn: () =>
      api.get<Issue[]>("/api/data-quality/scan", "data-quality-page:scan"),
    staleTime: 5 * 60 * 1000,
    enabled: pathname === "/data-quality",
  });

  const scan = async () => {
    try {
      const { count } = await api.post<{ count: number }>("/api/data-quality/scan");
      toast.success(`${count} issues`);
      await qc.invalidateQueries({ queryKey: ["dq"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> {data.length} open issues
        </div>
        <Button onClick={scan} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> {t("common.scan")}
        </Button>
      </div>

      <div className="space-y-2">
        {data.map((i) => (
          <div key={i.id} className="rounded-xl border p-4">
            <div className="flex items-center gap-2">
              <Badge variant={i.severity === "error" ? "destructive" : "warning"}>
                {i.severity}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {i.entityType} · {i.issueType}
              </span>
            </div>
            <div className="mt-1 text-sm">{i.message}</div>
            {i.suggestedFix ? (
              <div className="mt-1 text-xs text-muted-foreground">
                → {i.suggestedFix}
              </div>
            ) : null}
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
