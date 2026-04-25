"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { formatDate, formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { getPlatformColorOption } from "@/lib/platform-colors";

interface Row {
  id: string;
  dueDate: string;
  amount: string;
  type: "profit" | "principal";
  status: "pending" | "received";
  receivedDate: string | null;
  investment: {
    id: string;
    name: string;
    platform?: { name: string; color?: string | null } | null;
  };
}

interface CashflowsSummary {
  totalAmount: number;
}

interface CashflowsResponse {
  rows: Row[];
  summary: CashflowsSummary;
}

export default function CashflowsPage() {
  const { t, settings, platformFilter } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [status, setStatus] = React.useState<"all" | "pending" | "received">("pending");

  const { data } = useQuery<Row[] | CashflowsResponse>({
    queryKey: ["cashflows", platformFilter, status],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (platformFilter !== "all") params.set("platformId", platformFilter);
      return api.get<Row[] | CashflowsResponse>(`/api/cashflows?${params.toString()}`);
    },
  });

  const rows = Array.isArray(data) ? data : (data?.rows ?? []);
  const total = Array.isArray(data)
    ? rows.reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.totalAmount ?? 0);

  const markReceived = async (id: string) => {
    try {
      await api.patch(`/api/cashflows/${id}/receive`, {});
      toast.success(t("common.markReceived"));
      await Promise.all(
        ["cashflows", "cashflows-upcoming", "metrics", "investments", "cashTxs", "alerts"].map(
          (queryKey) => qc.invalidateQueries({ queryKey: [queryKey] }),
        ),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const undoReceived = async (id: string) => {
    try {
      await api.del(`/api/cashflows/${id}/receive`);
      await Promise.all(
        ["cashflows", "cashflows-upcoming", "metrics", "investments", "cashTxs", "alerts"].map(
          (queryKey) => qc.invalidateQueries({ queryKey: [queryKey] }),
        ),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1 text-xs">
          {(["pending", "received", "all"] as const).map((s) => (
            <button
              key={s}
              className={cn(
                "rounded px-3 py-1.5",
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? t("common.total") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {rows.length} · <span className="font-semibold text-foreground tabular-nums">{formatMoney(total, settings.currency)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("form.date")}</th>
              <th className="p-3 text-start">{t("nav.investments")}</th>
              <th className="p-3 text-start">{t("form.type")}</th>
              <th className="p-3 text-end">{t("form.amount")}</th>
              <th className="p-3 text-start">{t("common.status")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3">{formatDate(r.dueDate, dateLocale)}</td>
                <td className="p-3">
                  <div>{r.investment.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full border"
                      style={{
                        backgroundColor: getPlatformColorOption(r.investment.platform?.color)
                          .chartColor,
                      }}
                    />
                    {r.investment.platform?.name}
                  </div>
                </td>
                <td className="p-3">
                  <Badge variant={r.type === "profit" ? "default" : "secondary"}>
                    {r.type}
                  </Badge>
                </td>
                <td className="p-3 text-end font-semibold tabular-nums">
                  {formatMoney(r.amount, settings.currency)}
                </td>
                <td className="p-3">
                  <Badge variant={r.status === "received" ? "success" : "outline"}>
                    {t(`status.${r.status}`)}
                  </Badge>
                </td>
                <td className="p-3 text-end">
                  {r.status === "pending" ? (
                    <Button size="sm" variant="outline" onClick={() => markReceived(r.id)}>
                      <CheckCircle2 className="me-1 h-4 w-4" />
                      {t("common.markReceived")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => undoReceived(r.id)}>
                      <Undo2 className="me-1 h-4 w-4" />
                      {t("common.undo")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  {t("common.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
