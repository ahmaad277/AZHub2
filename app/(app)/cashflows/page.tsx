"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
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
  totalCount: number;
}

const PAGE_SIZE = 50;

export default function CashflowsPage() {
  const pathname = usePathname();
  const { t, settings, platformFilter } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [status, setStatus] = React.useState<"all" | "pending" | "received">("pending");
  const [page, setPage] = React.useState(1);

  const { data } = useQuery<Row[] | CashflowsResponse>({
    queryKey: ["cashflows", platformFilter, status, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (platformFilter !== "all") params.set("platformId", platformFilter);
      params.set("page", page.toString());
      params.set("limit", PAGE_SIZE.toString());
      return api.get<Row[] | CashflowsResponse>(
        `/api/cashflows?${params.toString()}`,
        "cashflows-page:list",
      );
    },
    staleTime: 5 * 60 * 1000,
    enabled: pathname === "/cashflows",
  });

  const allRows = React.useMemo(
    () => (Array.isArray(data) ? data : (data?.rows ?? [])),
    [data],
  );
  
  const totalCount = Array.isArray(data) ? allRows.length : (data?.totalCount ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  
  const total = Array.isArray(data)
    ? allRows.reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.totalAmount ?? 0);

  React.useEffect(() => {
    setPage(1);
  }, [platformFilter, status]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const markReceived = async (id: string) => {
    try {
      await api.patch(`/api/cashflows/${id}/receive`, {});
      toast.success(t("common.markReceived"));
      await Promise.all(
        [
          "cashflows",
          "cashflows-upcoming",
          "cashflows-monthly-summary",
          "dashboard-metrics",
          "dashboard-summary",
          "investments",
          "cashTxs",
          "alerts",
        ].map((queryKey) => qc.invalidateQueries({ queryKey: [queryKey] })),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const undoReceived = async (id: string) => {
    try {
      await api.del(`/api/cashflows/${id}/receive`);
      await Promise.all(
        [
          "cashflows",
          "cashflows-upcoming",
          "cashflows-monthly-summary",
          "dashboard-metrics",
          "dashboard-summary",
          "investments",
          "cashTxs",
          "alerts",
        ].map((queryKey) => qc.invalidateQueries({ queryKey: [queryKey] })),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1 text-xs">
          {(["pending", "received", "all"] as const).map((s) => (
            <button
              key={s}
              className={cn(
                "rounded-full px-4 py-1.5 transition-all font-medium",
                status === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? t("common.total") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {totalCount} · <span className="font-semibold text-foreground tabular-nums">{formatMoney(total, settings.currency)}</span>
        </div>
      </div>

      <div className="bg-transparent max-md:overflow-x-auto max-md:overscroll-x-contain md:overflow-hidden">
        <table className="w-full max-md:min-w-[44rem] text-sm md:min-w-0">
          <thead className="bg-transparent text-xs font-medium uppercase text-muted-foreground border-b border-border/40">
            <tr>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-start">{t("form.date")}</th>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-start">{t("nav.investments")}</th>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-start">{t("form.type")}</th>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-end">{t("form.amount")}</th>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-start">{t("common.status")}</th>
              <th className="px-1.5 py-1.5 sm:px-3 sm:py-2"></th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors last:border-0">
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2">{formatDate(r.dueDate, dateLocale)}</td>
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2">
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
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2">
                  <Badge variant={r.type === "profit" ? "default" : "secondary"}>
                    {t(`cashflowType.${r.type}`)}
                  </Badge>
                </td>
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-end font-semibold tabular-nums text-[hsl(var(--success))]">
                  +{formatMoney(r.amount, settings.currency)}
                </td>
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2">
                  <Badge variant={r.status === "received" ? "success" : "outline"}>
                    {t(`status.${r.status}`)}
                  </Badge>
                </td>
                <td className="px-1.5 py-1.5 sm:px-3 sm:py-2 text-end">
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
            {allRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  {t("common.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
