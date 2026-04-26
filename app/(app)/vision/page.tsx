"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/table-pagination";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { formatDate, formatMoney, formatPercent } from "@/lib/finance/money";
import type { DashboardMetrics } from "@/lib/finance/metrics";

interface VisionTargetRow {
  id: string;
  month: string;
  targetValue: string;
}

const PAGE_SIZE = 50;

export default function VisionPage() {
  const { t, settings, setSettings } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [targetCapital, setTargetCapital] = React.useState(
    settings.targetCapital2040 ?? "",
  );
  const [startAmount, setStartAmount] = React.useState("100000");
  const [months, setMonths] = React.useState(180); // 15 years
  const [page, setPage] = React.useState(1);

  const { data: targets = [] } = useQuery<VisionTargetRow[]>({
    queryKey: ["visionTargets"],
    queryFn: () => api.get<VisionTargetRow[]>("/api/vision/targets"),
  });

  const { data: metricsResp } = useQuery<{ metrics: DashboardMetrics }>({
    queryKey: ["dashboard-metrics", "all", "summary"],
    queryFn: () => api.get<{ metrics: DashboardMetrics }>("/api/dashboard/metrics"),
  });

  const pageCount = Math.max(1, Math.ceil(targets.length / PAGE_SIZE));
  const paginatedTargets = React.useMemo(
    () => targets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, targets],
  );
  const nav = metricsResp?.metrics.nav ?? 0;
  const target = Number(targetCapital || 0);
  const pct = target > 0 ? Math.min(100, (nav / target) * 100) : 0;

  React.useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const saveTarget = async () => {
    try {
      await setSettings({
        targetCapital2040: targetCapital ? String(targetCapital) : null,
      });
      toast.success(t("form.save"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generateMonthlyTargets = async () => {
    const start = Number(startAmount || 0);
    const end = Number(targetCapital || 0);
    const validInputs =
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      Number.isFinite(months) &&
      start > 0 &&
      end > start &&
      months > 0;
    if (!validInputs) {
      toast.error(t("vision.invalidInputs"));
      return;
    }
    const step = (end - start) / months;
    const now = new Date();
    const payload = [] as Array<{ month: string; targetValue: number }>;
    for (let i = 1; i <= months; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      payload.push({
        month: d.toISOString(),
        targetValue: Math.round((start + step * i) * 100) / 100,
      });
    }
    try {
      await api.put("/api/vision/targets", { targets: payload, replaceAll: true });
      toast.success(t("common.generate"));
      await qc.invalidateQueries({ queryKey: ["visionTargets"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" /> {t("dash.vision2040")}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <div className="text-3xl font-semibold tabular-nums">
            {formatMoney(nav, settings.currency)}
          </div>
          {target > 0 ? (
            <div className="text-sm text-muted-foreground">
              / {formatMoney(target, settings.currency)} · {formatPercent(pct, 1)}
            </div>
          ) : null}
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="mb-4 text-sm font-semibold">{t("settings.target2040")}</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[14rem] space-y-2">
            <Label>{t("settings.target2040")}</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={targetCapital as any}
              onChange={(e) => setTargetCapital(e.target.value)}
            />
          </div>
          <Button onClick={saveTarget}>{t("form.save")}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold">{t("vision.monthlyPlanGenerator")}</div>
          <Button variant="outline" size="sm" onClick={generateMonthlyTargets} className="gap-2">
            <Wand2 className="h-4 w-4" /> {t("common.generate")}
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label>{t("vision.startingAmount")}</Label>
            <Input
              type="number"
              value={startAmount}
              onChange={(e) => setStartAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.target2040")}</Label>
            <Input
              type="number"
              value={targetCapital as any}
              onChange={(e) => setTargetCapital(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("vision.months")}</Label>
            <Input
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
        <table className="w-full text-sm">
          <thead className="bg-transparent text-xs font-medium uppercase text-muted-foreground border-b border-border/50">
            <tr>
              <th className="p-3 sm:px-4 sm:py-3 sm:px-4 sm:py-3 text-start">{t("vision.month")}</th>
              <th className="p-3 sm:px-4 sm:py-3 sm:px-4 sm:py-3 text-end">{t("vision.target")}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTargets.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors last:border-0">
                <td className="p-3 sm:px-4 sm:py-3">{formatDate(r.month, dateLocale, { year: "numeric", month: "short" })}</td>
                <td className="p-3 sm:px-4 sm:py-3 sm:px-4 sm:py-3 text-end tabular-nums">
                  {formatMoney(r.targetValue, settings.currency)}
                </td>
              </tr>
            ))}
            {targets.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-8 text-center text-sm text-muted-foreground">
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
