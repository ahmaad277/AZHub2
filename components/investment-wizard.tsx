"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SmartDateInput } from "./smart-date-input";
import { useApp } from "./providers";
import { api } from "@/lib/fetcher";
import type { Platform } from "@/db/schema";
import { formatDate, formatMoney } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

interface PreviewRow {
  dueDate: string;
  amount: number;
  type: "profit" | "principal";
  isCustomSchedule: boolean;
}

interface PreviewResponse {
  startDate: string;
  endDate: string;
  durationMonths: number;
  rows: PreviewRow[];
}

interface EditableInvestment {
  id: string;
  platformId: string;
  name: string;
  principalAmount: string;
  expectedProfit: string;
  expectedIrr: string;
  startDate: string;
  durationMonths: number;
  endDate: string;
  distributionFrequency:
    | "monthly"
    | "quarterly"
    | "semi_annually"
    | "annually"
    | "at_maturity"
    | "custom";
  isReinvestment: boolean;
  fundedFromCash: boolean;
  notes: string | null;
  cashflows?: Array<{ dueDate: string; amount: string; type: "profit" | "principal" }>;
}

interface InvestmentWizardProps {
  onCreated?: () => void;
  onCancel?: () => void;
  /** Public / share-link mode — hides funding question and accepts a submit handler. */
  publicSubmit?: (payload: any) => Promise<void>;
  availablePlatforms?: Array<{ id: string; name: string }>;
  initialInvestment?: EditableInvestment | null;
}

export function InvestmentWizard({
  onCreated,
  onCancel,
  publicSubmit,
  availablePlatforms,
  initialInvestment,
}: InvestmentWizardProps) {
  const { t, settings } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";

  const platformsQuery = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => api.get<Platform[]>("/api/platforms"),
    enabled: !availablePlatforms,
    staleTime: 5 * 60_000,
  });
  const platforms = availablePlatforms ?? platformsQuery.data ?? [];

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = React.useState({
    platformId: "",
    name: "",
    principalAmount: "",
    expectedProfit: "",
    expectedIrr: "",
    startDate: today,
    durationMonths: 12 as number | "",
    endDate: "",
    distributionFrequency: "monthly" as
      | "monthly"
      | "quarterly"
      | "semi_annually"
      | "annually"
      | "at_maturity"
      | "custom",
    isReinvestment: false,
    fundedFromCash: false,
    notes: "",
  });
  const [dateMode, setDateMode] = React.useState<"duration" | "endDate">("duration");
  const [customRows, setCustomRows] = React.useState<
    Array<{ dueDate: string; amount: string; type: "profit" | "principal" }>
  >([]);
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!initialInvestment) return;
    setForm({
      platformId: initialInvestment.platformId,
      name: initialInvestment.name,
      principalAmount: initialInvestment.principalAmount,
      expectedProfit: initialInvestment.expectedProfit,
      expectedIrr: initialInvestment.expectedIrr,
      startDate: initialInvestment.startDate.slice(0, 10),
      durationMonths: initialInvestment.durationMonths,
      endDate: initialInvestment.endDate.slice(0, 10),
      distributionFrequency: initialInvestment.distributionFrequency,
      isReinvestment: initialInvestment.isReinvestment,
      fundedFromCash: initialInvestment.fundedFromCash,
      notes: initialInvestment.notes ?? "",
    });
    setDateMode("duration");
    setCustomRows(
      (initialInvestment.cashflows ?? []).map((row) => ({
        dueDate: row.dueDate.slice(0, 10),
        amount: row.amount,
        type: row.type,
      })),
    );
    setPreview(null);
  }, [initialInvestment]);

  React.useEffect(() => {
    if (!form.endDate && form.startDate && typeof form.durationMonths === "number") {
      const d = new Date(`${form.startDate}T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + form.durationMonths);
      setForm((f) => ({ ...f, endDate: d.toISOString().slice(0, 10) }));
    }
  }, [form.startDate, form.durationMonths, form.endDate]);

  const buildPayload = () => ({
    platformId: form.platformId,
    name: form.name,
    principalAmount: Number(form.principalAmount),
    expectedProfit: Number(form.expectedProfit || 0),
    expectedIrr: Number(form.expectedIrr || 0),
    startDate: form.startDate,
    durationMonths: dateMode === "duration" ? form.durationMonths : undefined,
    endDate: dateMode === "endDate" ? form.endDate : undefined,
    distributionFrequency: form.distributionFrequency,
    isReinvestment: form.isReinvestment,
    fundedFromCash: publicSubmit ? false : form.fundedFromCash,
    notes: form.notes || null,
    customSchedule:
      form.distributionFrequency === "custom"
        ? customRows.map((r) => ({
            dueDate: r.dueDate,
            amount: Number(r.amount),
            type: r.type,
          }))
        : undefined,
  });

  const doPreview = async () => {
    try {
      const res = await api.post<PreviewResponse>(
        "/api/investments/preview-schedule",
        buildPayload(),
      );
      setPreview(res);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (publicSubmit) {
        await publicSubmit(payload);
      } else if (initialInvestment) {
        await api.patch(`/api/investments/${initialInvestment.id}`, payload);
        await Promise.all(
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
        toast.success(t("form.save"));
      } else {
        await api.post("/api/investments", payload);
        await Promise.all(
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
        toast.success(t("form.save"));
      }
      onCreated?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const valid =
    form.platformId &&
    form.name.trim().length > 0 &&
    Number(form.principalAmount) > 0 &&
    form.startDate &&
    (dateMode === "duration"
      ? typeof form.durationMonths === "number" && form.durationMonths > 0
      : !!form.endDate);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("form.name")}</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Lendo #1023"
          />
        </div>
        <div className="space-y-2">
          <Label>{t("form.platform")}</Label>
          <Select
            value={form.platformId}
            onValueChange={(v) => setForm({ ...form, platformId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => {
                const value = (p.id ?? "").trim();
                if (!value) return null;
                return (
                  <SelectItem key={value} value={value}>
                    {p.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{t("form.principalAmount")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.principalAmount}
            onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("form.expectedProfit")}</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.expectedProfit}
            onChange={(e) => setForm({ ...form, expectedProfit: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("form.expectedIrr")}</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.expectedIrr}
            onChange={(e) => setForm({ ...form, expectedIrr: e.target.value })}
          />
        </div>
      </div>

      <SmartDateInput
        mode={dateMode}
        onModeChange={setDateMode}
        startDate={form.startDate}
        durationMonths={form.durationMonths}
        endDate={form.endDate}
        onChange={(v) => setForm({ ...form, ...v })}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("form.distributionFrequency")}</Label>
          <Select
            value={form.distributionFrequency}
            onValueChange={(v) => setForm({ ...form, distributionFrequency: v as any })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["monthly", "quarterly", "semi_annually", "annually", "at_maturity", "custom"].map(
                (f) => (
                  <SelectItem key={f} value={f}>
                    {t(`frequency.${f}`)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        {!publicSubmit && !initialInvestment ? (
          <div className="space-y-2">
            <Label>{t("common.fundingSource")}</Label>
            <RadioGroup
              value={form.fundedFromCash ? "internal" : "external"}
              onValueChange={(v) =>
                setForm({ ...form, fundedFromCash: v === "internal" })
              }
              className="flex gap-4"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="external" /> {t("common.external")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="internal" /> {t("common.internal")}
              </label>
            </RadioGroup>
          </div>
        ) : null}
      </div>

      {form.distributionFrequency === "custom" ? (
        <div className="space-y-2 rounded-2xl border border-border/40 p-4">
          <div className="flex items-center justify-between">
            <Label>{t("investment.customSchedule")}</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setCustomRows((rows) => [
                  ...rows,
                  { dueDate: today, amount: "", type: "profit" },
                ])
              }
            >
              <Plus className="me-1 h-3.5 w-3.5" /> {t("form.add")}
            </Button>
          </div>
          <div className="space-y-2">
            {customRows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
                <Input
                  type="date"
                  value={r.dueDate}
                  onChange={(e) =>
                    setCustomRows((rows) =>
                      rows.map((x, j) => (j === i ? { ...x, dueDate: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  value={r.amount}
                  placeholder={t("form.amount")}
                  onChange={(e) =>
                    setCustomRows((rows) =>
                      rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                    )
                  }
                />
                <Select
                  value={r.type}
                  onValueChange={(v) =>
                    setCustomRows((rows) =>
                      rows.map((x, j) => (j === i ? { ...x, type: v as any } : x)),
                    )
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">profit</SelectItem>
                    <SelectItem value="principal">principal</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCustomRows((rows) => rows.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {customRows.length === 0 ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                {t("common.empty")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>{t("form.notes")}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder=""
        />
      </div>

      {!publicSubmit ? (
        <div className="flex items-center gap-3">
          <Switch
            checked={form.isReinvestment}
            onCheckedChange={(v) => setForm({ ...form, isReinvestment: v })}
          />
          <span className="text-sm">{t("investment.isReinvestment")}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={doPreview} disabled={!valid}>
          {t("form.preview")}
        </Button>
        <Button type="button" onClick={doSubmit} disabled={!valid || submitting}>
          {submitting ? "…" : t("form.save")}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("form.cancel")}
          </Button>
        ) : null}
      </div>

      {preview ? (
        <div className="rounded-2xl border border-border/40 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">{t("investment.schedulePreview")}</div>
            <div className="text-xs text-muted-foreground">
              {preview.durationMonths} {t("vision.months")} · {preview.rows.length}{" "}
              {t("common.rows")}
            </div>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-start">{t("form.date")}</th>
                  <th className="p-2 text-start">{t("form.type")}</th>
                  <th className="p-2 text-end">{t("form.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className={cn("border-t", r.type === "principal" && "bg-muted/40")}>
                    <td className="p-2">{formatDate(r.dueDate, dateLocale)}</td>
                    <td className="p-2">
                      <Badge variant={r.type === "profit" ? "default" : "secondary"}>
                        {r.type}
                      </Badge>
                    </td>
                    <td className="p-2 text-end font-semibold tabular-nums">
                      {formatMoney(r.amount, settings.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
