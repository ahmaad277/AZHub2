"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import React from "react";

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
  const router = useRouter();
  const { t } = useApp();
  const qc = useQueryClient();
  const [fixingId, setFixingId] = React.useState<string | null>(null);

  const { data = [] } = useQuery<Issue[]>({
    queryKey: ["dq"],
    queryFn: () =>
      api.get<Issue[]>("/api/data-quality/scan"),
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

  const applyFix = async (issueId: string) => {
    try {
      setFixingId(issueId);
      const res = await api.post<{ success: boolean; action: string; redirectUrl: string | null }>(
        "/api/data-quality/fix",
        { issueId }
      );
      
      if (res.action === "redirect" && res.redirectUrl) {
        toast.info(t("dataQuality.redirecting"));
        router.push(res.redirectUrl);
      } else {
        toast.success(t("dataQuality.fixSuccess"));
        await qc.invalidateQueries({ queryKey: ["dq"] });
        await qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      }
    } catch (e) {
      toast.error(t("dataQuality.fixError") + ": " + (e as Error).message);
    } finally {
      setFixingId(null);
    }
  };

  const renderMessage = (msg: string) => {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.key) {
        let translated = t(parsed.key);
        if (parsed.name) translated = translated.replace("{name}", parsed.name);
        if (parsed.expected) translated = translated.replace("{expected}", String(parsed.expected));
        if (parsed.actual) translated = translated.replace("{actual}", String(parsed.actual));
        return translated;
      }
    } catch {
      // Not JSON, return as is
    }
    return msg;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> {data.length} {t("dataQuality.openIssues")}
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
                {t(`severity.${i.severity}`)}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {t(`dq.entity.${i.entityType}`)} · {t(`dq.type.${i.issueType}`)}
              </span>
            </div>
            <div className="mt-1 text-sm">{renderMessage(i.message)}</div>
            {i.suggestedFix ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div className="text-xs">
                  <span className="font-semibold text-foreground">{t("dataQuality.suggestedFix")}:</span>{" "}
                  <span className="text-muted-foreground">{t(i.suggestedFix)}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => applyFix(i.id)}
                  disabled={fixingId === i.id}
                  className="gap-1.5 h-8"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {t("dataQuality.applyFix")}
                </Button>
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
