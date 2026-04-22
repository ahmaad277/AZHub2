"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import type { Platform } from "@/db/schema";

export default function PlatformsPage() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    type: "sukuk" as Platform["type"],
    feePercentage: "0",
    deductFees: false,
    notes: "",
  });

  const { data = [] } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => api.get<Platform[]>("/api/platforms"),
  });

  const submit = async () => {
    try {
      await api.post("/api/platforms", form);
      toast.success(t("form.save"));
      setOpen(false);
      setForm({ name: "", type: "sukuk", feePercentage: "0", deductFees: false, notes: "" });
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/api/platforms/${id}`);
      toast.success(t("form.delete"));
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t("form.add")}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.map((p) => (
          <div key={p.id} className="rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-xs uppercase text-muted-foreground">{p.type}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(p.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">Fee</div>
                <div className="font-semibold">{p.feePercentage}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Deduct fees</div>
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
            <DialogTitle>{t("form.add")}</DialogTitle>
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
                <Label>Fee %</Label>
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
              <span className="text-sm">Deduct fees from profit</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
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
