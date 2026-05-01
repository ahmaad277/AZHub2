"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import { getPlatformColorOption, PLATFORM_COLOR_OPTIONS } from "@/lib/platform-colors";
import type { Platform } from "@/db/schema";

const emptyForm = {
  name: "",
  type: "sukuk" as Platform["type"],
  feePercentage: "0",
  deductFees: false,
  color: "blue",
  notes: "",
};

export default function PlatformsPage() {
  const pathname = usePathname();
  const { t } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editingPlatform, setEditingPlatform] = React.useState<Platform | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  const { data = [] } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => api.get<Platform[]>("/api/platforms"),
    staleTime: 5 * 60 * 1000,
    enabled: pathname === "/platforms",
  });

  const resetForm = () => {
    setEditingPlatform(null);
    setForm(emptyForm);
  };

  const startAdd = () => {
    resetForm();
    setOpen(true);
  };

  const startEdit = (platform: Platform) => {
    setEditingPlatform(platform);
    setForm({
      name: platform.name,
      type: platform.type,
      feePercentage: platform.feePercentage?.toString() ?? "0",
      deductFees: platform.deductFees,
      color: platform.color ?? "blue",
      notes: platform.notes ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    try {
      if (editingPlatform) {
        await api.patch(`/api/platforms/${editingPlatform.id}`, form);
      } else {
        await api.post("/api/platforms", form);
      }
      toast.success(t("form.save"));
      setOpen(false);
      resetForm();
      await qc.invalidateQueries({ queryKey: ["platforms"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/api/platforms/${id}`);
      toast.success(t("form.delete"));
      await qc.invalidateQueries({ queryKey: ["platforms"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={startAdd} className="gap-2">
          <Plus className="h-4 w-4" /> {t("form.add")}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((p) => (
          <div key={p.id} className="rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full border ${getPlatformColorOption(p.color).className}`}
                    aria-hidden="true"
                  />
                  <span className="text-lg font-semibold">{p.name}</span>
                </div>
                <div className="text-xs uppercase text-muted-foreground">{p.type}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => startEdit(p)}
                  aria-label={t("form.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(p.id)}
                  className="text-destructive"
                  aria-label={t("form.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">{t("platform.fee")}</div>
                <div className="font-semibold">{p.feePercentage}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("platform.deductFees")}</div>
                <div className="font-semibold">{p.deductFees ? t("common.yes") : t("common.no")}</div>
              </div>
            </div>
            {p.notes ? <p className="mt-3 text-xs text-muted-foreground">{p.notes}</p> : null}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlatform ? t("form.edit") : t("form.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("form.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("form.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sukuk">Sukuk</SelectItem>
                    <SelectItem value="manfaa">Manfaa</SelectItem>
                    <SelectItem value="lendo">Lendo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("platform.feePercent")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.feePercentage}
                  onChange={(e) => setForm({ ...form, feePercentage: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.deductFees}
                onCheckedChange={(v) => setForm({ ...form, deductFees: v })}
              />
              <span className="text-sm">{t("platform.deductFeesFromProfit")}</span>
            </div>
            <div className="space-y-2">
              <Label>{t("platform.color")}</Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {PLATFORM_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`rounded-lg border p-2 text-xs transition ${
                      form.color === color.value ? "border-primary ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setForm({ ...form, color: color.value })}
                  >
                    <span
                      className={`mx-auto mb-1 block h-5 w-5 rounded-full border ${color.className}`}
                    />
                    {t(color.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("form.notes")}</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
                {t("form.cancel")}
              </Button>
              <Button onClick={submit} disabled={!form.name}>
                {t("form.save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
