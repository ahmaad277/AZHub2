import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";
import { InvestmentDialog } from "@/components/investment-dialog";
import { InvestmentRow } from "@/components/investment-row";
import { InvestmentDetailsDrawer } from "@/components/investment-details-drawer";
import { CompletePaymentDialog } from "@/components/complete-payment-dialog";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { LateStatusDialog } from "@/components/late-status-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, createIdempotencyKey } from "@/lib/queryClient";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useDataEntry } from "@/lib/data-entry-context";
import { LanguageToggle } from "@/components/language-toggle";
import { useEditingFlow, useQueryRefreshOptions } from "@/hooks/use-query-refresh";
import { InlineEmptyState, InlineLoadingState } from "@/components/ui/view-states";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const DATA_ENTRY_GUIDE_COLLAPSED_KEY = "azfinance-data-entry-guide-collapsed";

// Helper function to make API requests with data-entry token
async function apiRequestWithToken(
  method: string,
  url: string,
  token: string,
  data?: unknown,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Data-Entry-Token": token,
      ...(extraHeaders ?? {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

// Create a custom query function that includes the token
function createDataEntryQueryFn(token: string) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const endpoint = String(queryKey[2] ?? queryKey[0] ?? "");
    if (!endpoint.startsWith("/api/")) {
      throw new Error(`Invalid data-entry endpoint: ${endpoint}`);
    }
    const res = await fetch(endpoint, {
      headers: {
        "X-Data-Entry-Token": token,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json();
  };
}

export default function DataEntry() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, params] = useRoute("/data-entry/:token");
  const token = params?.token;
  const { setDataEntryMode, clearDataEntryMode } = useDataEntry();

  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [lateStatusDialogOpen, setLateStatusDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [addingPaymentForInvestment, setAddingPaymentForInvestment] = useState<string | null>(null);
  const [pendingCashflowId, setPendingCashflowId] = useState<string | null>(null);
  const [pendingCashflowInvestment, setPendingCashflowInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [guideOpen, setGuideOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(DATA_ENTRY_GUIDE_COLLAPSED_KEY) !== "true";
  });
  const hasActiveEditingFlow = useEditingFlow(
    dialogOpen,
    completePaymentDialogOpen,
    addPaymentDialogOpen,
    lateStatusDialogOpen,
    Boolean(editingInvestment),
    Boolean(selectedInvestment)
  );
  const queryRefreshOptions = useQueryRefreshOptions({ isEditing: hasActiveEditingFlow });

  // Verify token on mount
  useEffect(() => {
    const controller = new AbortController();
    const verifyToken = async () => {
      if (!token) {
        setIsVerified(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify-data-entry-token/${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Verification failed: ${response.status}`);
        }
        const data = await response.json();
        const isValid = data.valid === true;
        setIsVerified(isValid);
        
        if (isValid) {
          setDataEntryMode(token);
        } else {
          clearDataEntryMode();
        }
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        clearDataEntryMode();
        setIsVerified(false);
      }
    };

    verifyToken();
    return () => controller.abort();
  }, [token, setDataEntryMode, clearDataEntryMode]);

  const {
    data: investments,
    isLoading: investmentsLoading,
    error: investmentsError,
  } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["data-entry", token || "none", "/api/investments"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    refetchOnMount: true,
    ...queryRefreshOptions,
    enabled: isVerified === true && !!token,
  });

  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["data-entry", token || "none", "/api/cashflows"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    refetchOnMount: true,
    ...queryRefreshOptions,
    enabled: isVerified === true && !!token,
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["data-entry", token || "none", "/api/platforms"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    refetchOnMount: true,
    ...queryRefreshOptions,
    enabled: isVerified === true && !!token,
  });

  // Mutation to mark cashflow as received
  const updateCashflowMutation = useMutation({
    mutationFn: async ({ 
      cashflowId, 
      status,
      clearLateStatus,
      updateLateInfo,
    }: { 
      cashflowId: string; 
      status: string;
      clearLateStatus?: boolean;
      updateLateInfo?: { lateDays: number };
    }) => {
      if (!token) throw new Error("No token available");
      return apiRequestWithToken("PATCH", `/api/cashflows/${cashflowId}`, token, { 
        status,
        receivedDate: status === "received" ? new Date().toISOString() : null,
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-entry", token || "none", "/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["data-entry", token || "none", "/api/investments"] });
      setLateStatusDialogOpen(false);
      
      toast({
        title: t("investments.toast.updated"),
        description: t("investments.toast.paymentStatusUpdated"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.paymentStatusFailed"),
        variant: "destructive",
      });
    },
  });

  // Mutation to add new cashflow
  const addCashflowMutation = useMutation({
    mutationFn: async ({ data, idempotencyKey }: { data: any; idempotencyKey: string }) => {
      if (!token) throw new Error("No token available");
      return apiRequestWithToken("POST", "/api/cashflows", token, data, {
        "X-Idempotency-Key": idempotencyKey,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-entry", token || "none", "/api/cashflows"] });
      
      toast({
        title: t("common.success"),
        description: t("investments.toast.paymentAdded"),
      });
      setAddPaymentDialogOpen(false);
      setAddingPaymentForInvestment(null);
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.paymentAddFailed"),
        variant: "destructive",
      });
    },
  });

  const deleteCashflowMutation = useMutation({
    mutationFn: async (cashflowId: string) => {
      if (!token) throw new Error("No token available");
      return apiRequestWithToken("DELETE", `/api/cashflows/${cashflowId}`, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-entry", token || "none", "/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["data-entry", token || "none", "/api/investments"] });
      toast({
        title: t("common.success"),
        description: t("investments.toast.paymentDeleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.paymentDeleteFailed"),
        variant: "destructive",
      });
    },
  });

  const handleTogglePaymentStatus = (cashflowId: string, newStatus: "received" | "upcoming") => {
    updateCashflowMutation.mutate({ cashflowId, status: newStatus });
  };

  const handleRemovePayment = (cashflowId: string) => {
    deleteCashflowMutation.mutate(cashflowId);
  };

  if (isVerified === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (isVerified === false) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              {t("dataEntry.invalidLinkTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {t("dataEntry.invalidLinkDesc")}
            </p>
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="h-10 px-5"
                onClick={() => {
                  clearDataEntryMode();
                  window.location.href = "/";
                }}
              >
                {t("dataEntry.exitMode")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <main className="flex-1 overflow-auto">
        <div
          className="max-w-7xl mx-auto px-3 py-4 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-5 pb-24"
          data-testid="data-entry-main"
        >
          <div data-testid="text-page-title">
            <PageHeader title={t("dataEntry.pageTitle")} gradient className="rounded-xl">
              <LanguageToggle />
            </PageHeader>
          </div>

          <Collapsible
            open={guideOpen}
            onOpenChange={(open) => {
              setGuideOpen(open);
              if (typeof window !== "undefined") {
                window.localStorage.setItem(DATA_ENTRY_GUIDE_COLLAPSED_KEY, open ? "false" : "true");
              }
            }}
          >
            <Card className="border-dashed bg-muted/15 shadow-none">
              <CardHeader className="pb-2 space-y-0">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg text-start -mx-1 px-1 py-1.5 hover:bg-muted/40 transition-colors"
                    aria-expanded={guideOpen}
                    aria-label={t("dataEntry.guideToggleAria")}
                  >
                    <CardTitle className="text-base font-semibold">{t("dataEntry.guideTitle")}</CardTitle>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        guideOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed pt-0">
                  <p>{t("dataEntry.guide1")}</p>
                  <p>{t("dataEntry.guide2")}</p>
                  <p>{t("dataEntry.guide3")}</p>
                  <p>{t("dataEntry.guide4")}</p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Alert variant="default" className="border-muted bg-muted/30 py-3">
            <AlertDescription className="text-sm leading-relaxed">
              {t("dataEntry.scopeAlert")}
            </AlertDescription>
          </Alert>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>{t("dataEntry.listTitle")}</CardTitle>
              {investments != null && !investmentsLoading && !investmentsError && (
                <CardDescription className="tabular-nums">
                  {t("dataEntry.listCount", { count: investments.length })}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {investmentsLoading ? (
                <InlineLoadingState
                  title={t("investments.pageLoadingTitle")}
                  data-testid="state-loading-data-entry-investments"
                />
              ) : investmentsError ? (
                <InlineEmptyState
                  title={t("investments.pageErrorTitle")}
                  description={investmentsError instanceof Error ? investmentsError.message : t("common.unexpectedError")}
                  data-testid="state-error-data-entry-investments"
                />
              ) : !investments || investments.length === 0 ? (
                <InlineEmptyState
                  title={t("investments.noInvestmentsYet")}
                  data-testid="state-empty-data-entry-investments"
                />
              ) : (
                <div className="space-y-2">
                  {investments.map((investment) => (
                    <InvestmentRow
                      key={investment.id}
                      investment={investment}
                      cashflows={cashflows?.filter((cf) => cf.investmentId === investment.id) || []}
                      onOpenDetails={() => setSelectedInvestment(investment)}
                      onEdit={() => {
                        setEditingInvestment(investment);
                        setDialogOpen(true);
                      }}
                      onDelete={() => {
                        if (confirm(t("investments.deleteConfirm"))) {
                          void (async () => {
                            try {
                              if (!token) throw new Error("No token available");
                              await apiRequestWithToken("DELETE", `/api/investments/${investment.id}`, token);
                              queryClient.invalidateQueries({ queryKey: ["data-entry", token, "/api/investments"] });
                              toast({
                                title: t("common.success"),
                                description: t("investments.toast.investmentDeleted"),
                              });
                            } catch (error: any) {
                              toast({
                                title: t("dialog.error"),
                                description: error?.message || t("investments.toast.investmentDeleteFailed"),
                                variant: "destructive",
                              });
                            }
                          })();
                        }
                      }}
                      onCompletePayment={() => {
                        setCompletingInvestment(investment);
                        setCompletePaymentDialogOpen(true);
                      }}
                      onAddPayment={(invId: string) => {
                        setAddingPaymentForInvestment(invId);
                        setAddPaymentDialogOpen(true);
                      }}
                      onMarkPaymentAsReceived={(cashflowId: string) => {
                        setPendingCashflowId(cashflowId);
                        setPendingCashflowInvestment(investment);
                        if (investment.status === "late" || investment.status === "defaulted") {
                          setLateStatusDialogOpen(true);
                        } else {
                          updateCashflowMutation.mutate({ cashflowId, status: "received" });
                        }
                      }}
                      onRemovePayment={handleRemovePayment}
                      onTogglePaymentStatus={handleTogglePaymentStatus}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Button
        type="button"
        onClick={() => {
          setEditingInvestment(null);
          setDialogOpen(true);
        }}
        data-testid="button-add-investment"
        size="icon"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label={t("investments.addInvestment")}
        title={t("investments.addInvestment")}
      >
        <Plus className="h-7 w-7" aria-hidden />
      </Button>

      {/* Dialogs */}
      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
        dataEntryToken={token}
      />

      <InvestmentDetailsDrawer
        investment={selectedInvestment}
        open={!!selectedInvestment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvestment(null);
          }
        }}
        cashflows={cashflows?.filter((cf) => cf.investmentId === selectedInvestment?.id) || []}
        onEdit={() => {
          if (selectedInvestment) {
            setEditingInvestment(selectedInvestment);
            setDialogOpen(true);
            setSelectedInvestment(null);
          }
        }}
        onCompletePayment={() => {
          if (selectedInvestment) {
            setCompletingInvestment(selectedInvestment);
            setCompletePaymentDialogOpen(true);
            setSelectedInvestment(null);
          }
        }}
        onAddPayment={(invId: string) => {
          setAddingPaymentForInvestment(invId);
          setAddPaymentDialogOpen(true);
          setSelectedInvestment(null);
        }}
        onMarkPaymentAsReceived={(cashflowId: string) => {
          if (selectedInvestment) {
            setPendingCashflowId(cashflowId);
            setPendingCashflowInvestment(selectedInvestment);
            if (selectedInvestment.status === "late" || selectedInvestment.status === "defaulted") {
              setLateStatusDialogOpen(true);
            } else {
              updateCashflowMutation.mutate({ cashflowId, status: "received" });
            }
          }
        }}
        onRemovePayment={handleRemovePayment}
      />

      <CompletePaymentDialog
        open={completePaymentDialogOpen}
        onOpenChange={setCompletePaymentDialogOpen}
        investment={completingInvestment}
        dataEntryToken={token}
      />

      <AddPaymentDialog
        open={addPaymentDialogOpen}
        onOpenChange={(open) => {
          setAddPaymentDialogOpen(open);
          if (!open) setAddingPaymentForInvestment(null);
        }}
        investmentId={addingPaymentForInvestment || ""}
        onSubmit={async (data: any) => {
          await addCashflowMutation.mutateAsync({
            data,
            idempotencyKey: createIdempotencyKey("data-entry-cashflow-create"),
          });
        }}
        isPending={addCashflowMutation.isPending}
      />

      <LateStatusDialog
        mode="single"
        open={lateStatusDialogOpen}
        onOpenChange={setLateStatusDialogOpen}
        investment={pendingCashflowInvestment}
        cashflowId={pendingCashflowId}
        isPending={updateCashflowMutation.isPending}
        onConfirm={(data) => {
          updateCashflowMutation.mutate({
            status: "received",
            ...data,
          });

          setPendingCashflowId(null);
          setPendingCashflowInvestment(null);
        }}
      />
    </div>
  );
}
