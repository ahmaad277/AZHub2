"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MetricTile } from "@/components/metric-tile";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { formatDate, formatMoney } from "@/lib/finance/money";
import type { Platform } from "@/db/schema";

interface TxRow {
  id: string;
  date: string;
  amount: string;
  type: "deposit" | "withdrawal" | "investment_funding" | "cashflow_receipt";
  notes: string | null;
  platform?: { name: string } | null;
}

interface CashTransactionsSummary {
  balance: number;
  deposits: number;
  withdrawals: number;
  receipts: number;
}

interface CashTransactionsResponse {
  rows: TxRow[];
  summary: CashTransactionsSummary;
}

const NO_PLATFORM = "__none__";

export default function WalletPage() {
  const { t, settings, platformFilter } = useApp();
  const qc = useQueryClient();
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";
  const [open, setOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = React.useState("");
  const [platformId, setPlatformId] = React.useState(NO_PLATFORM);
  const [date, setDate] = React.useState(String(new Date().toISOString()).slice(0, 10));
  const [notes, setNotes] = React.useState("");

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => api.get<Platform[]>("/api/platforms"),
  });

  const { data } = useQuery<TxRow[] | CashTransactionsResponse>({
    queryKey: ["cashTxs", platformFilter],
    queryFn: () =>
      api.get<TxRow[] | CashTransactionsResponse>(
        `/api/cash-transactions${
          platformFilter !== "all" ? `?platformId=${platformFilter}` : ""
        }`,
      ),
  });

  const txs = Array.isArray(data) ? data : (data?.rows ?? []);
  const balance = Array.isArray(data)
    ? txs.reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.balance ?? 0);
  const deposits = Array.isArray(data)
    ? txs
        .filter((row) => row.type === "deposit")
        .reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.deposits ?? 0);
  const withdrawals = Array.isArray(data)
    ? txs
        .filter((row) => row.type === "withdrawal")
        .reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.withdrawals ?? 0);
  const receipts = Array.isArray(data)
    ? txs
        .filter((row) => row.type === "cashflow_receipt")
        .reduce((sum, row) => sum + parseFloat(row.amount || "0"), 0)
    : (data?.summary.receipts ?? 0);

  const submit = async () => {
    try {
      await api.post("/api/cash-transactions", {
        type: txType,
        amount: Number(amount),
        date,
        notes: notes || null,
        platformId: platformId === NO_PLATFORM ? null : platformId,
      });
      toast.success(t("form.save"));
      setOpen(false);
      setAmount("");
      setNotes("");
      await Promise.all(
        ["cashTxs", "metrics", "investments", "cashflows", "cashflows-upcoming", "alerts"].map(
          (queryKey) => qc.invalidateQueries({ queryKey: [queryKey] }),
        ),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label={t("cash.currentBalance")} value={balance} accent="primary" />
        <MetricTile label={t("cash.deposit")} value={deposits} accent="success" />
        <MetricTile label={t("cash.withdrawal")} value={Math.abs(withdrawals)} accent="warning" />
        <MetricTile label={t("metric.realizedGains")} value={receipts} accent="success" />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{txs.length} records</div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("cash.deposit")} / {t("cash.withdrawal")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 text-start">{t("form.date")}</th>
              <th className="p-3 text-start">{t("form.type")}</th>
              <th className="p-3 text-start">{t("form.platform")}</th>
              <th className="p-3 text-start">{t("form.notes")}</th>
              <th className="p-3 text-end">{t("form.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {txs.map((tx) => (
              <tr key={tx.id} className="border-t">
                <td className="p-3">{formatDate(tx.date, dateLocale)}</td>
                <td className="p-3">
                  <Badge
                    variant={
                      tx.type === "deposit" || tx.type === "cashflow_receipt"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {tx.type}
                  </Badge>
                </td>
                <td className="p-3 text-muted-foreground">{tx.platform?.name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{tx.notes ?? "—"}</td>
                <td
                  className={`p-3 text-end font-semibold tabular-nums ${
                    Number(tx.amount) >= 0
                      ? "text-[hsl(var(--success))]"
                      : "text-destructive"
                  }`}
                >
                  {formatMoney(Number(tx.amount), settings.currency)}
                </td>
              </tr>
            ))}
            {txs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                  {t("common.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {txType === "deposit" ? t("cash.deposit") : t("cash.withdrawal")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={txType === "deposit" ? "success" : "outline"}
                onClick={() => setTxType("deposit")}
                className="flex-1 gap-2"
              >
                <ArrowDownToLine className="h-4 w-4" /> {t("cash.deposit")}
              </Button>
              <Button
                type="button"
                variant={txType === "withdrawal" ? "destructive" : "outline"}
                onClick={() => setTxType("withdrawal")}
                className="flex-1 gap-2"
              >
                <ArrowUpFromLine className="h-4 w-4" /> {t("cash.withdrawal")}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>{t("form.amount")}</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("form.date")}</Label>
              <Input lang="en" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("form.platform")}</Label>
              <Select value={platformId} onValueChange={setPlatformId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PLATFORM}>—</SelectItem>
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
            <div className="space-y-2">
              <Label>{t("form.notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("form.cancel")}
              </Button>
              <Button onClick={submit} disabled={!amount || Number(amount) <= 0}>
                {t("form.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
