"use client";

import * as React from "react";
import { toast } from "sonner";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";

interface PreviewResponse {
  jobId: string;
  validCount: number;
  errors: Array<{ row: number; message: string }>;
}

export default function ImportPage() {
  const { t } = useApp();
  const [preview, setPreview] = React.useState<PreviewResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const onFile = async (file: File) => {
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, {
        defval: null,
        raw: true,
      });
      const res = await api.post<PreviewResponse>("/api/import/preview", {
        sourceType: file.name.endsWith(".csv") ? "csv" : "xlsx",
        entityType: "investment",
        rows,
      });
      setPreview(res);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    if (!preview) return;
    try {
      const { committed } = await api.post<{ committed: number }>(
        "/api/import/commit",
        { jobId: preview.jobId },
      );
      toast.success(`Imported ${committed}`);
      setPreview(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-6 text-center">
        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
        <div className="mt-2 text-sm font-medium">CSV / XLSX import</div>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Required columns: <code>name</code>, <code>platform</code>,{" "}
          <code>principalAmount</code>, <code>expectedProfit</code>,{" "}
          <code>expectedIrr</code>, <code>startDate</code>,{" "}
          <code>durationMonths</code> or <code>endDate</code>,{" "}
          <code>distributionFrequency</code>
        </p>
        <Input
          type="file"
          accept=".csv,.xlsx"
          className="mx-auto mt-3 max-w-xs"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
          disabled={loading}
        />
      </div>

      {preview ? (
        <div className="rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {preview.validCount} valid · {preview.errors.length} errors
              </div>
              <div className="text-xs text-muted-foreground">Job: {preview.jobId}</div>
            </div>
            <Button onClick={commit} disabled={preview.validCount === 0} className="gap-2">
              <Check className="h-4 w-4" /> Commit
            </Button>
          </div>
          {preview.errors.length ? (
            <div className="max-h-64 overflow-auto rounded-lg border text-sm">
              <table className="w-full">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 text-start">Row</th>
                    <th className="p-2 text-start">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.map((e) => (
                    <tr key={e.row} className="border-t">
                      <td className="p-2 tabular-nums">{e.row}</td>
                      <td className="p-2 text-destructive">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
