"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";

interface Snapshot {
  id: string;
  name: string;
  entityCounts: Record<string, number> | null;
  byteSize: number | null;
  createdAt: string;
}

const RESET_SNAPSHOT_ID = "__reset__";

export default function SnapshotsPage() {
  const { t } = useApp();
  const qc = useQueryClient();
  const [name, setName] = React.useState("");

  const { data = [] } = useQuery<Snapshot[]>({
    queryKey: ["snapshots"],
    queryFn: () => api.get<Snapshot[]>("/api/snapshots"),
  });

  const create = async () => {
    try {
      await api.post("/api/snapshots", { name: name || `Snapshot ${new Date().toISOString().slice(0, 16)}` });
      setName("");
      toast.success("Snapshot created");
      await qc.invalidateQueries({ queryKey: ["snapshots"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const restore = async (snapshot?: Snapshot) => {
    if (!snapshot) throw new Error("Invalid snapshot");
    const id = snapshot.id;
    const isReset = id === RESET_SNAPSHOT_ID;
    const confirmed = isReset
      ? confirm("Reset portfolio to a clean empty state? This will delete ALL current data.")
      : confirm("This will replace ALL current data with the snapshot. Continue?");
    if (!confirmed) return;
    if (isReset) {
      const ack = prompt("Type RESET to confirm permanent portfolio reset.");
      if (ack !== "RESET") return;
    }
    try {
      await api.post(`/api/snapshots/${id}/restore`);
      toast.success(isReset ? "Portfolio reset" : "Restored");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.del(`/api/snapshots/${id}`);
      await qc.invalidateQueries({ queryKey: ["snapshots"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Archive className="h-4 w-4" /> Create backup
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="My snapshot"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button onClick={create}>{t("form.save")}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {[
          {
            id: RESET_SNAPSHOT_ID,
            name: "محفظة جديدة / Clean Portfolio",
            entityCounts: null,
            byteSize: null,
            createdAt: "",
          } as Snapshot,
          ...data,
        ].map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <div className="text-sm font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                {s.id === RESET_SNAPSHOT_ID
                  ? "Restore to an empty portfolio state."
                  : `${new Date(s.createdAt).toLocaleString()} · ${
                      s.entityCounts
                        ? Object.entries(s.entityCounts).map(([k, v]) => `${k}:${v}`).join(" · ")
                        : ""
                    }`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => restore(s)} className="gap-2">
                <RotateCcw className="h-3.5 w-3.5" /> {s.id === RESET_SNAPSHOT_ID ? "Reset" : "Restore"}
              </Button>
              {s.id !== RESET_SNAPSHOT_ID ? (
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
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
