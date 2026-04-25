"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvestmentWizard } from "@/components/investment-wizard";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { formatDate, formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  principalAmount: string;
  expectedProfit: string;
  expectedIrr: string;
  startDate: string;
  endDate: string;
  durationMonths: number;
  distributionFrequency: string;
  derivedStatus: "active" | "late" | "defaulted" | "completed";
  needsReview: boolean;
  realizedProfit: number;
  platform?: { id: string; name: string } | null;
}

const STATUS_VARIANTS: Record<string, "default" | "warning" | "destructive" | "secondary"> = {
  active: "default",
  late: "warning",
  defaulted: "destructive",
  completed: "secondary",
};

export default function InvestmentsPage() {
  const { t, settings, platformFilter } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const { data = [] } = useQuery<Row[]>({
    queryKey: ["investments", platformFilter],
    queryFn: () =>
      api.get<Row[]>(
        `/api/investments${platformFilter !== "all" ? `?platformId=${platformFilter}` : ""}`,
      ),
  });

  const filtered = data.filter((r) => {
    if (statusFilter !== "all" && r.derivedStatus !== statusFilter) return false;
    if (!search) return true;
    return r.name.toLowerCase().includes(search.toLowerCase());
  });

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
        qc.invalidateQueries({ queryKey: ["metrics"] }),
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
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1 text-xs">
          {["all", "active", "late", "defaulted", "completed"].map((s) => (
            <button
              key={s}
              className={cn(
                "rounded px-2 py-1 transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? t("common.total") : t(`status.${s}`)}
            </button>
          ))}
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("nav.investments")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("form.name")}</th>
              <th className="p-3 text-start">{t("form.platform")}</th>
              <th className="p-3 text-end">{t("form.principalAmount")}</th>
              <th className="p-3 text-end">{t("form.expectedProfit")}</th>
              <th className="p-3 text-end">{t("metric.realizedGains")}</th>
              <th className="p-3 text-start">{t("form.endDate")}</th>
              <th className="p-3 text-start">{t("common.status")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.needsReview ? (
                      <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                        {t("common.needsReview")}
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{r.platform?.name}</td>
                <td className="p-3 text-end font-semibold tabular-nums">
                  {formatMoney(r.principalAmount, settings.currency)}
                </td>
                <td className="p-3 text-end tabular-nums">
                  {formatMoney(r.expectedProfit, settings.currency)}
                </td>
                <td className="p-3 text-end tabular-nums text-[hsl(var(--success))]">
                  {formatMoney(r.realizedProfit, settings.currency)}
                </td>
                <td className="p-3">{formatDate(r.endDate, dateLocale)}</td>
                <td className="p-3">
                  <Badge variant={STATUS_VARIANTS[r.derivedStatus]}>
                    {t(`status.${r.derivedStatus}`)}
                  </Badge>
                </td>
                <td className="p-3 text-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvestment(r.id)}
                    className="text-destructive"
                    aria-label={t("form.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t("nav.investments")}</DialogTitle>
          </DialogHeader>
          <InvestmentWizard
            onCreated={() => {
              setOpen(false);
              qc.invalidateQueries();
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
