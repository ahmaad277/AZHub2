"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResolvedIssueBadge } from "@/components/resolved-issue-badge";
import { TablePagination } from "@/components/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { formatDate, formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";
import { getPlatformColorOption } from "@/lib/platform-colors";

const InvestmentWizard = dynamic(
  () => import("@/components/investment-wizard").then((mod) => mod.InvestmentWizard),
  {
    ssr: false,
    loading: () => null,
  },
);

interface Row {
  id: string;
  platformId: string;
  name: string;
  principalAmount: string;
  expectedProfit: string;
  expectedIrr: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  distributionFrequency:
    | "monthly"
    | "quarterly"
    | "semi_annually"
    | "annually"
    | "at_maturity"
    | "custom";
  derivedStatus: "active" | "late" | "defaulted" | "completed";
  needsReview: boolean;
  resolvedIssueStatus?: "late" | "defaulted" | null;
  resolvedIssueDays?: number | null;
  isReinvestment: boolean;
  fundedFromCash: boolean;
  notes: string | null;
  realizedProfit: number;
  platform?: { id: string; name: string; color?: string | null } | null;
  cashflows?: Array<{ dueDate: string; amount: string; type: "profit" | "principal" }>;
}

interface InvestmentsResponse {
  rows: Row[];
  totalCount: number;
}

const STATUS_VARIANTS: Record<string, "default" | "warning" | "destructive" | "secondary"> = {
  active: "default",
  late: "warning",
  defaulted: "destructive",
  completed: "secondary",
};
const PAGE_SIZE = 50;

export default function InvestmentsPage() {
  const { t, settings, platformFilter } = useApp();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [open, setOpen] = React.useState(false);
  const [editingInvestment, setEditingInvestment] = React.useState<Row | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const handledQueryId = React.useRef<string | null>(null);

  const { data } = useQuery<Row[] | InvestmentsResponse>({
    queryKey: ["investments", platformFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (platformFilter !== "all") params.set("platformId", platformFilter);
      params.set("page", page.toString());
      params.set("limit", PAGE_SIZE.toString());
      return api.get<Row[] | InvestmentsResponse>(`/api/investments?${params.toString()}`);
    },
    staleTime: 5 * 60 * 1000,
  });

  const allRows = React.useMemo(
    () => (Array.isArray(data) ? data : (data?.rows ?? [])),
    [data],
  );
  
  const totalCount = Array.isArray(data) ? allRows.length : (data?.totalCount ?? 0);
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const filtered = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allRows.filter((r) => {
      if (statusFilter !== "all" && r.derivedStatus !== statusFilter) return false;
      if (!normalizedSearch) return true;
      return r.name.toLowerCase().includes(normalizedSearch);
    });
  }, [allRows, search, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [platformFilter, search, statusFilter]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const startAdd = () => {
    setEditingInvestment(null);
    setOpen(true);
  };

  const startEdit = React.useCallback(async (id: string) => {
    try {
      const investment = await api.get<Row>(`/api/investments/${id}`);
      setEditingInvestment(investment);
      setOpen(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  React.useEffect(() => {
    const id = searchParams.get("id");
    if (!id || handledQueryId.current === id) return;
    handledQueryId.current = id;
    void startEdit(id);
  }, [searchParams, startEdit]);

  const removeInvestment = async (id: string) => {
    if (!confirm(t("investments.deleteConfirm"))) {
      return;
    }
    try {
      await api.del(`/api/investments/${id}`);
      toast.success(t("form.delete"));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["investments"] }),
        qc.invalidateQueries({ queryKey: ["cashflows"] }),
        qc.invalidateQueries({ queryKey: ["cashflows-upcoming"] }),
        qc.invalidateQueries({ queryKey: ["cashflows-monthly-summary"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-metrics"] }),
      ]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("nav.investments")}
            className="ps-9 rounded-full bg-muted/50 border-transparent hover:bg-muted/80 transition-colors focus-visible:bg-background focus-visible:border-border"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1 text-xs">
          {["all", "active", "late", "defaulted", "completed"].map((s) => (
            <button
              key={s}
              className={cn(
                "rounded-full px-3 py-1.5 transition-all font-medium",
                statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? t("common.total") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <Button onClick={startAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("nav.investments")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-transparent text-xs font-medium uppercase text-muted-foreground border-b border-border/40">
            <tr>
              <th className="p-4 sm:px-6 sm:py-5 text-start">{t("form.name")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-start">{t("form.platform")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-end">{t("form.principalAmount")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-end">{t("form.expectedProfit")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-end">{t("metric.realizedGains")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-start">{t("form.endDate")}</th>
              <th className="p-4 sm:px-6 sm:py-5 text-start">{t("common.status")}</th>
              <th className="p-4 sm:px-6 sm:py-5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                <td className="p-4 sm:px-6 sm:py-5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.needsReview ? (
                      <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                        {t("common.needsReview")}
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="p-4 sm:px-6 sm:py-5 text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2 w-2 rounded-full border"
                      style={{ backgroundColor: getPlatformColorOption(r.platform?.color).chartColor }}
                    />
                    {r.platform?.name}
                  </span>
                </td>
                <td className="p-4 sm:px-6 sm:py-5 text-end font-semibold tabular-nums">
                  {formatMoney(r.principalAmount, settings.currency)}
                </td>
                <td className="p-4 sm:px-6 sm:py-5 text-end tabular-nums">
                  {formatMoney(r.expectedProfit, settings.currency)}
                </td>
                <td className="p-4 sm:px-6 sm:py-5 text-end tabular-nums text-[hsl(var(--success))]">
                  {formatMoney(r.realizedProfit, settings.currency)}
                </td>
                <td className="p-4 sm:px-6 sm:py-5">{formatDate(r.endDate, dateLocale)}</td>
                <td className="p-4 sm:px-6 sm:py-5">
                  <div className="inline-flex items-center gap-2">
                    <Badge variant={STATUS_VARIANTS[r.derivedStatus]}>
                      {t(`status.${r.derivedStatus}`)}
                    </Badge>
                    <ResolvedIssueBadge
                      status={r.resolvedIssueStatus}
                      days={r.resolvedIssueDays}
                    />
                  </div>
                </td>
                <td className="p-4 sm:px-6 sm:py-5 text-end">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(r.id)}
                      aria-label={t("form.edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInvestment(r.id)}
                      className="text-destructive"
                      aria-label={t("form.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-muted-foreground">
                  {t("common.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditingInvestment(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingInvestment ? t("form.edit") : t("nav.investments")}</DialogTitle>
          </DialogHeader>
          <InvestmentWizard
            initialInvestment={editingInvestment}
            onCreated={() => {
              setOpen(false);
              setEditingInvestment(null);
              void Promise.all(
                [
                  "investments",
                  "cashflows",
                  "cashflows-upcoming",
                  "cashflows-monthly-summary",
                  "dashboard-metrics",
                  "cashTxs",
                  "alerts",
                ].map((queryKey) => qc.invalidateQueries({ queryKey: [queryKey] })),
              );
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
