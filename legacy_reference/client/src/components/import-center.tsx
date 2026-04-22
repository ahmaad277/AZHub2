import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, ScanText, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractTextFromPdf } from "@/lib/pdf-import";
import type { Platform } from "@shared/schema";

interface ImportPreviewResponse {
  jobId: string;
  summary: {
    totalRows: number;
    sourceRows?: number;
    sample: unknown[];
    sourceType: string;
    entityType?: string;
    sectionFilter?: "all" | "active" | "closed";
    mappingHints?: string[];
    warnings?: string[];
    duplicateCandidates?: string[];
    skippedLines?: number;
  };
}

interface ImportCommitResponse {
  committed: boolean;
  jobId: string;
  committedCount: number;
  byType: {
    investments: number;
    cashflows: number;
    cashTransactions: number;
  };
}

export function ImportCenter() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [entityType, setEntityType] = useState<"investment" | "cashflow" | "cash_transaction">("investment");
  const [lastPreview, setLastPreview] = useState<ImportPreviewResponse | null>(null);
  const [lastCommit, setLastCommit] = useState<ImportCommitResponse | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string>("");
  const [selectedPdfName, setSelectedPdfName] = useState<string>("");
  const [isDirectPdfImporting, setIsDirectPdfImporting] = useState(false);
  const [pdfSectionFilter, setPdfSectionFilter] = useState<"all" | "active" | "closed">("all");
  const [confirmDirectImportOpen, setConfirmDirectImportOpen] = useState(false);
  const [pendingDirectImportPreview, setPendingDirectImportPreview] = useState<ImportPreviewResponse | null>(null);
  const [previewSignatures, setPreviewSignatures] = useState<Record<string, string>>({});
  const [queuedAutoFilterPreview, setQueuedAutoFilterPreview] = useState<"all" | "active" | "closed" | null>(null);
  const [isAutoRefreshingPdfPreview, setIsAutoRefreshingPdfPreview] = useState(false);

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const normalizedManafaName = (name: string) =>
    name.toLowerCase().replace(/['’`]/g, "").replace(/[^a-z0-9\u0600-\u06ff]/g, "");

  const manafaPlatform = useMemo(() => {
    return platforms.find((platform) => {
      const value = normalizedManafaName(platform.name);
      return value.includes("manafa") || value.includes("manfaa") || value.includes("manfa");
    });
  }, [platforms]);

  const parsedRows = useMemo(() => {
    const lines = csvText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length <= 1) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      return headers.reduce<Record<string, string>>((acc, header, idx) => {
        acc[header] = (values[idx] || "").trim();
        return acc;
      }, {});
    });
  }, [csvText]);

  const normalizedOcrLines = useMemo(
    () =>
      ocrText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [ocrText]
  );

  const csvSignature = useMemo(() => {
    return JSON.stringify({
      sourceType: "csv",
      entityType,
      rows: parsedRows,
    });
  }, [entityType, parsedRows]);

  const ocrSignature = useMemo(() => {
    return JSON.stringify({
      sourceType: "ocr",
      entityType,
      lines: normalizedOcrLines,
    });
  }, [entityType, normalizedOcrLines]);

  const buildPdfSignature = (sectionFilter: "all" | "active" | "closed") =>
    JSON.stringify({
      sourceType: "pdf",
      entityType,
      sectionFilter,
      lines: normalizedOcrLines,
      platformId: manafaPlatform?.id || "",
      platformName: manafaPlatform?.name || "manfa’a",
    });

  const pdfSignature = useMemo(
    () => buildPdfSignature(pdfSectionFilter),
    [entityType, pdfSectionFilter, normalizedOcrLines, manafaPlatform?.id, manafaPlatform?.name]
  );

  const getCurrentSignatureBySource = (sourceType: string): string => {
    if (sourceType === "csv" || sourceType === "xlsx") return csvSignature;
    if (sourceType === "ocr") return ocrSignature;
    if (sourceType === "pdf") return pdfSignature;
    return "";
  };

  const isPreviewStale = (preview: ImportPreviewResponse | null): boolean => {
    if (!preview) return false;
    const expectedSignature = previewSignatures[preview.jobId];
    if (!expectedSignature) return false;
    const currentSignature = getCurrentSignatureBySource(preview.summary.sourceType || "");
    return Boolean(currentSignature) && expectedSignature !== currentSignature;
  };

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/import/preview", {
        sourceType: "csv",
        entityType,
        rows: parsedRows,
      });
      return (await response.json()) as ImportPreviewResponse;
    },
    onSuccess: (response: ImportPreviewResponse) => {
      setLastPreview(response);
      setCurrentJobId(response.jobId);
      setPreviewSignatures((previous) => ({
        ...previous,
        [response.jobId]: csvSignature,
      }));
      toast({
        title: t("import.toast.previewReadyTitle"),
        description: t("import.toast.previewReadyDesc", { count: response.summary.totalRows }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("import.toast.previewFailedTitle"),
        description: error?.message || t("import.toast.previewFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const ocrPreviewMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/import/ocr/preview", {
        sourceType: "ocr",
        entityType,
        lines: ocrText.split("\n"),
      });
      return (await response.json()) as ImportPreviewResponse;
    },
    onSuccess: (response: ImportPreviewResponse) => {
      setLastPreview(response);
      setCurrentJobId(response.jobId);
      setPreviewSignatures((previous) => ({
        ...previous,
        [response.jobId]: ocrSignature,
      }));
      toast({
        title: t("import.toast.ocrPreviewReadyTitle"),
        description: t("import.toast.ocrPreviewReadyDesc", { count: response.summary.totalRows }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("import.toast.ocrFailedTitle"),
        description: error?.message || t("import.toast.ocrFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (jobId?: string) => {
      const targetJobId = (jobId || currentJobId || "").trim();
      if (!targetJobId) {
        throw new Error(t("import.error.noValidJobId"));
      }
      const response = await apiRequest("POST", "/api/import/commit", {
        jobId: targetJobId,
      });
      return (await response.json()) as ImportCommitResponse;
    },
    onSuccess: (response) => {
      setLastCommit(response);
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      toast({
        title: t("import.toast.commitSuccessTitle"),
        description: t("import.toast.commitSuccessDesc", { count: response.committedCount }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("import.toast.commitFailedTitle"),
        description: error?.message || t("import.toast.commitFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const pdfExtractMutation = useMutation({
    mutationFn: async (file: File) => {
      return extractTextFromPdf(file);
    },
    onSuccess: ({ text, pageCount, lineCount }) => {
      setOcrText(text);
      toast({
        title: t("import.toast.pdfExtractedTitle"),
        description: t("import.toast.pdfExtractedDesc", { pages: pageCount, lines: lineCount }),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("import.toast.pdfReadFailedTitle"),
        description: error?.message || t("import.toast.pdfReadFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const pdfPreviewMutation = useMutation({
    mutationFn: async (options?: { sectionFilter?: "all" | "active" | "closed"; silent?: boolean }) => {
      const targetSectionFilter = options?.sectionFilter || pdfSectionFilter;
      if (!normalizedOcrLines.length) {
        throw new Error(t("import.error.noPdfText"));
      }
      const response = await apiRequest("POST", "/api/import/pdf/preview", {
        sourceType: "pdf",
        entityType,
        lines: normalizedOcrLines,
        platformId: manafaPlatform?.id,
        platformName: manafaPlatform?.name || "manfa’a",
        sectionFilter: targetSectionFilter,
      });
      return (await response.json()) as ImportPreviewResponse;
    },
    onSuccess: (response, variables) => {
      setLastPreview(response);
      setCurrentJobId(response.jobId);
      const targetSectionFilter = variables?.sectionFilter || pdfSectionFilter;
      setPreviewSignatures((previous) => ({
        ...previous,
        [response.jobId]: buildPdfSignature(targetSectionFilter),
      }));
      if (!variables?.silent) {
        toast({
          title: t("import.toast.pdfPreviewReadyTitle"),
          description: t("import.toast.pdfPreviewReadyDesc", { count: response.summary.totalRows }),
        });
      }
    },
    onError: (error: any, variables) => {
      if (!variables?.silent) {
        toast({
          title: t("import.toast.pdfPreviewFailedTitle"),
          description: error?.message || t("import.toast.pdfPreviewFailedDesc"),
          variant: "destructive",
        });
      }
    },
  });

  const handlePdfSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedPdfName(file.name);
    pdfExtractMutation.mutate(file);
  };

  const handleDirectPdfImport = async () => {
    if (isAutoRefreshingPdfPreview || queuedAutoFilterPreview !== null || pdfPreviewMutation.isPending) {
      toast({
        title: t("import.toast.waitPreviewTitle"),
        description: t("import.toast.waitPreviewDesc"),
      });
      return;
    }

    if (!manafaPlatform) {
      toast({
        title: t("import.toast.manafaNotFoundTitle"),
        description: t("import.toast.manafaNotFoundDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDirectPdfImporting(true);
      const preview = await pdfPreviewMutation.mutateAsync({});
      setPendingDirectImportPreview(preview);
      setConfirmDirectImportOpen(true);
    } finally {
      setIsDirectPdfImporting(false);
    }
  };

  const isCurrentJobPreviewStale = useMemo(() => {
    if (!lastPreview || !currentJobId || currentJobId !== lastPreview.jobId) return false;
    return isPreviewStale(lastPreview);
  }, [lastPreview, currentJobId, previewSignatures, csvSignature, ocrSignature, pdfSignature]);

  const isPendingDirectPreviewStale = useMemo(() => {
    if (!pendingDirectImportPreview) return false;
    const jobId = pendingDirectImportPreview.jobId;
    const expectedSignature = previewSignatures[jobId];
    if (!expectedSignature) return false;
    return expectedSignature !== pdfSignature;
  }, [pendingDirectImportPreview, previewSignatures, pdfSignature]);

  const isPdfAutoRefreshBusy = useMemo(
    () =>
      isAutoRefreshingPdfPreview ||
      queuedAutoFilterPreview !== null ||
      (pdfPreviewMutation.isPending && lastPreview?.summary.sourceType === "pdf"),
    [isAutoRefreshingPdfPreview, queuedAutoFilterPreview, pdfPreviewMutation.isPending, lastPreview?.summary.sourceType]
  );

  const handleConfirmDirectImport = async () => {
    const preview = pendingDirectImportPreview;
    if (!preview) return;
    if (isPendingDirectPreviewStale) {
      toast({
        title: t("import.toast.previewOutdatedTitle"),
        description: t("import.toast.previewOutdatedDesc"),
        variant: "destructive",
      });
      return;
    }
    try {
      await commitMutation.mutateAsync(preview.jobId);
      setConfirmDirectImportOpen(false);
      setPendingDirectImportPreview(null);
    } catch {
      // Keep dialog open so user can retry after reviewing the error toast.
    }
  };

  const handleManualCommit = () => {
    if (
      isPdfAutoRefreshBusy &&
      lastPreview?.summary.sourceType === "pdf" &&
      currentJobId === lastPreview.jobId
    ) {
      toast({
        title: t("import.toast.commitBlockedTitle"),
        description: t("import.toast.commitBlockedDesc"),
      });
      return;
    }

    commitMutation.mutate(currentJobId);
  };

  useEffect(() => {
    if (!queuedAutoFilterPreview) return;
    if (pdfPreviewMutation.isPending) return;
    if (!normalizedOcrLines.length) {
      setQueuedAutoFilterPreview(null);
      setIsAutoRefreshingPdfPreview(false);
      return;
    }

    setIsAutoRefreshingPdfPreview(true);
    const timeoutId = window.setTimeout(() => {
      pdfPreviewMutation.mutate({ sectionFilter: queuedAutoFilterPreview, silent: true });
      setQueuedAutoFilterPreview(null);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      setIsAutoRefreshingPdfPreview(false);
    };
  }, [queuedAutoFilterPreview, normalizedOcrLines.length, pdfPreviewMutation.isPending]);

  useEffect(() => {
    if (!pdfPreviewMutation.isPending && !queuedAutoFilterPreview) {
      setIsAutoRefreshingPdfPreview(false);
    }
  }, [pdfPreviewMutation.isPending, queuedAutoFilterPreview]);

  const pdfFilterLabel = (filter: "all" | "active" | "closed" | undefined) => {
    if (filter === "active") return t("import.pdfFilterActive");
    if (filter === "closed") return t("import.pdfFilterClosed");
    return t("import.filterAllShort");
  };

  return (
    <Card className="shadcn-card" data-testid="card-import-center">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl leading-snug break-words">
          {t("import.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-md border p-3 sm:p-4">
          <p className="text-sm font-semibold break-words">{t("import.entityType")}</p>
          <Select value={entityType} onValueChange={(value: "investment" | "cashflow" | "cash_transaction") => setEntityType(value)}>
            <SelectTrigger data-testid="select-import-entity-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investment">{t("import.entity.investments")}</SelectItem>
              <SelectItem value="cashflow">{t("import.entity.cashflows")}</SelectItem>
              <SelectItem value="cash_transaction">{t("import.entity.cashTransactions")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-md border p-3 sm:p-4">
            <p className="text-sm font-semibold break-words leading-snug">{t("import.csvSection")}</p>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={t("import.csvPlaceholder")}
              className="min-h-28"
              data-testid="textarea-import-csv"
            />
            <Button
              onClick={() => previewMutation.mutate()}
              disabled={parsedRows.length === 0 || previewMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-import-preview"
            >
              <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t("import.previewImport")}
            </Button>
          </div>

          <div className="space-y-2 rounded-md border p-3 sm:p-4">
            <p className="text-sm font-semibold break-words leading-snug">{t("import.pdfSection")}</p>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {t("import.pdfFilterHint")}
              </p>
              {(isAutoRefreshingPdfPreview || (pdfPreviewMutation.isPending && queuedAutoFilterPreview !== null)) && (
                <p className="text-xs text-muted-foreground">
                  {t("import.pdfAutoRefresh")}
                </p>
              )}
              <Select
                value={pdfSectionFilter}
                onValueChange={(value: "all" | "active" | "closed") => {
                  setPdfSectionFilter(value);
                  setConfirmDirectImportOpen(false);
                  setPendingDirectImportPreview(null);
                  if (
                    lastPreview?.summary.sourceType === "pdf" &&
                    normalizedOcrLines.length > 0 &&
                    value !== lastPreview.summary.sectionFilter
                  ) {
                    setQueuedAutoFilterPreview(value);
                  }
                }}
              >
                <SelectTrigger data-testid="select-pdf-section-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("import.pdfFilterAll")}</SelectItem>
                  <SelectItem value="active">{t("import.pdfFilterActive")}</SelectItem>
                  <SelectItem value="closed">{t("import.pdfFilterClosed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfSelection}
              data-testid="input-import-pdf"
            />
            <p className="text-xs text-muted-foreground break-words leading-relaxed">
              {selectedPdfName
                ? `${t("import.pdfSelectedPrefix")}: ${selectedPdfName}`
                : t("import.pdfChooseHint")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={pdfExtractMutation.isPending || !ocrText.trim()}
                onClick={() => pdfPreviewMutation.mutate({})}
                className="w-full sm:w-auto"
                data-testid="button-pdf-to-preview"
              >
                <FileText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t("import.previewPdfData")}
              </Button>
              <Button
                type="button"
                disabled={
                  isDirectPdfImporting ||
                  pdfExtractMutation.isPending ||
                  !ocrText.trim() ||
                  isAutoRefreshingPdfPreview ||
                  queuedAutoFilterPreview !== null ||
                  pdfPreviewMutation.isPending
                }
                onClick={handleDirectPdfImport}
                className="w-full sm:w-auto"
                data-testid="button-pdf-direct-import"
              >
                <UploadCloud className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {t("import.previewThenImport")}
              </Button>
            </div>
            {!manafaPlatform && (
              <p className="text-xs text-destructive">
                {t("import.manafaNotice")}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3 sm:p-4">
          <p className="text-sm font-semibold break-words leading-snug">{t("import.ocrSection")}</p>
          <Textarea
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
            placeholder={t("import.ocrPlaceholder")}
            className="min-h-28"
            data-testid="textarea-import-ocr"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => ocrPreviewMutation.mutate()}
              disabled={!ocrText.trim() || ocrPreviewMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-ocr-preview"
            >
              <ScanText className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t("import.previewOcr")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOcrText("");
                setSelectedPdfName("");
              }}
              className="w-full sm:w-auto"
              data-testid="button-clear-ocr"
            >
              {t("import.clearText")}
            </Button>
          </div>
        </div>

        <div className="space-y-2 rounded-md border p-3 sm:p-4">
          <p className="text-sm font-semibold break-words leading-snug">{t("import.commitSection")}</p>
          <Input
            value={currentJobId}
            onChange={(e) => setCurrentJobId(e.target.value)}
            placeholder={t("import.jobIdPlaceholder")}
            data-testid="input-import-job-id"
          />
          {currentJobId && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={
                  !lastPreview || currentJobId !== lastPreview.jobId
                    ? "border-muted-foreground/40 text-muted-foreground"
                    : isCurrentJobPreviewStale
                      ? "border-destructive/50 text-destructive"
                      : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                }
              >
                {!lastPreview || currentJobId !== lastPreview.jobId
                  ? t("import.previewStatusUnknown")
                  : isCurrentJobPreviewStale
                    ? t("import.previewStatusOutdated")
                    : t("import.previewStatusFresh")}
              </Badge>
            </div>
          )}
          <Button
            onClick={handleManualCommit}
            disabled={
              !currentJobId ||
              commitMutation.isPending ||
              isCurrentJobPreviewStale ||
              (isPdfAutoRefreshBusy &&
                lastPreview?.summary.sourceType === "pdf" &&
                currentJobId === lastPreview.jobId)
            }
            className="w-full sm:w-auto"
            data-testid="button-import-commit"
          >
            {t("import.commitButton")}
          </Button>
          {isCurrentJobPreviewStale && (
            <p className="text-xs text-destructive">
              {t("import.stalePreviewWarning")}
            </p>
          )}
        </div>

        {lastPreview && (
          <div className="rounded-md border p-3 text-sm" data-testid="import-preview-summary">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {t("import.summaryRows")}: {lastPreview.summary.totalRows}
              </Badge>
              {typeof lastPreview.summary.sourceRows === "number" && (
                <Badge variant="outline">
                  {t("import.summaryBeforeFilter")}: {lastPreview.summary.sourceRows}
                </Badge>
              )}
              <Badge variant="outline">
                {t("import.summaryWarnings")}: {(lastPreview.summary.warnings || []).length}
              </Badge>
              <Badge variant="outline">
                {t("import.summaryDuplicates")}: {(lastPreview.summary.duplicateCandidates || []).length}
              </Badge>
            </div>
            <p>
              {t("import.summarySource")}: <strong>{lastPreview.summary.sourceType}</strong>
            </p>
            <p>
              {t("import.summaryEntity")}: <strong>{lastPreview.summary.entityType || entityType}</strong>
            </p>
            {lastPreview.summary.sourceType === "pdf" && (
              <p>
                {t("import.summaryStatusFilter")}:{" "}
                <strong>{pdfFilterLabel(lastPreview.summary.sectionFilter)}</strong>
              </p>
            )}
            <p>
              {t("import.summaryRowCount")}: <strong>{lastPreview.summary.totalRows}</strong>
            </p>
            <p>
              {t("import.jobIdLabel")}: <strong>{lastPreview.jobId}</strong>
            </p>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={
                  isPreviewStale(lastPreview)
                    ? "border-destructive/50 text-destructive"
                    : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                }
              >
                {isPreviewStale(lastPreview) ? t("import.badgePreviewOutdated") : t("import.badgePreviewReady")}
              </Badge>
            </div>
            {(lastPreview.summary.mappingHints || []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("import.detectedColumns")}: {(lastPreview.summary.mappingHints || []).join(", ")}
              </p>
            )}
            {(lastPreview.summary.warnings || []).length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-amber-600 dark:text-amber-400">
                {(lastPreview.summary.warnings || []).map((warning, index) => (
                  <p key={`${warning}-${index}`}>- {warning}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {lastCommit && (
          <div className="rounded-md border p-3 text-sm" data-testid="import-commit-summary">
            <p>
              {t("import.committedLabel")}: <strong>{lastCommit.committedCount}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              {t("import.byTypeLine", {
                inv: lastCommit.byType.investments,
                cf: lastCommit.byType.cashflows,
                tx: lastCommit.byType.cashTransactions,
              })}
            </p>
          </div>
        )}

        {commitMutation.isError && (
          <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {(commitMutation.error as Error)?.message || t("import.commitErrorGeneric")}
          </div>
        )}

        <AlertDialog
          open={confirmDirectImportOpen}
          onOpenChange={(open) => {
            setConfirmDirectImportOpen(open);
            if (!open) {
              setPendingDirectImportPreview(null);
            }
          }}
        >
          <AlertDialogContent data-testid="dialog-confirm-direct-pdf-import">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("import.confirmDirectTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("import.confirmDirectDesc", {
                  count: pendingDirectImportPreview?.summary.totalRows ?? 0,
                  filter: pdfFilterLabel(pendingDirectImportPreview?.summary.sectionFilter),
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("import.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleConfirmDirectImport();
                }}
                disabled={isPendingDirectPreviewStale}
                data-testid="button-confirm-direct-pdf-import"
              >
                {t("import.confirmImport")}
              </AlertDialogAction>
            </AlertDialogFooter>
            {isPendingDirectPreviewStale && (
              <p className="text-xs text-destructive">
                {t("import.pendingStaleWarning")}
              </p>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
