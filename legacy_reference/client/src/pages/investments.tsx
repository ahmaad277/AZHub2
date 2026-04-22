import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Filter, ArrowUpDown, Search, Maximize, Minimize, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
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
import { useLanguage } from "@/lib/language-provider";
import { InvestmentRow } from "@/components/investment-row";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { debugSessionLog } from "@/lib/debug-session-log";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform } from "@shared/schema";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";
import { useEditingFlow, useQueryRefreshOptions } from "@/hooks/use-query-refresh";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/view-states";

const InvestmentDialog = lazy(() =>
  import("@/components/investment-dialog").then((module) => ({ default: module.InvestmentDialog })),
);
const InvestmentDetailsDrawer = lazy(() =>
  import("@/components/investment-details-drawer").then((module) => ({ default: module.InvestmentDetailsDrawer })),
);
const CompletePaymentDialog = lazy(() =>
  import("@/components/complete-payment-dialog").then((module) => ({ default: module.CompletePaymentDialog })),
);
const AddPaymentDialog = lazy(() =>
  import("@/components/add-payment-dialog").then((module) => ({ default: module.AddPaymentDialog })),
);
const LateStatusDialog = lazy(() =>
  import("@/components/late-status-dialog").then((module) => ({ default: module.LateStatusDialog })),
);

export default function Investments() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [lateStatusDialogOpen, setLateStatusDialogOpen] = useState(false);
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [addingPaymentForInvestment, setAddingPaymentForInvestment] = useState<string | null>(null);
  const [pendingCashflowId, setPendingCashflowId] = useState<string | null>(null);
  const [pendingCashflowInvestment, setPendingCashflowInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [bulkCompletingInvestment, setBulkCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);

  // Filter and Sort States
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const hasActiveEditingFlow = useEditingFlow(
    dialogOpen,
    addPaymentDialogOpen,
    completePaymentDialogOpen,
    deleteDialogOpen,
    lateStatusDialogOpen,
    bulkCompleteDialogOpen,
    Boolean(editingInvestment),
    Boolean(selectedInvestment)
  );
  const queryRefreshOptions = useQueryRefreshOptions({ isEditing: hasActiveEditingFlow });
  
  // View Mode Management (ultra-compact by default for maximum density)
  // Using controlled mode to sync all investment rows
  const [viewMode, setViewMode, cycleViewMode] = usePersistedViewMode();

  const {
    data: investments,
    isLoading: investmentsLoading,
    error: investmentsError,
    refetch: refetchInvestments,
  } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    ...queryRefreshOptions,
  });

  const {
    data: cashflows,
    isLoading: cashflowsLoading,
    error: cashflowsError,
    refetch: refetchCashflows,
  } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
    ...queryRefreshOptions,
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    ...queryRefreshOptions,
  });
  const cashflowsList = cashflows ?? [];
  const cashflowsByInvestment = useMemo(() => {
    return cashflowsList.reduce<Record<string, CashflowWithInvestment[]>>((acc, cashflow) => {
      if (!acc[cashflow.investmentId]) {
        acc[cashflow.investmentId] = [];
      }
      acc[cashflow.investmentId].push(cashflow);
      return acc;
    }, {});
  }, [cashflowsList]);

  // Mutation to mark cashflow as received (with late status management)
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
      return apiRequest("PATCH", `/api/cashflows/${cashflowId}`, { 
        status,
        receivedDate: status === "received" ? new Date().toISOString() : null,
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      // Close late status dialog if open
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
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/cashflows", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      toast({
        title: t("common.success"),
        description: t("investments.toast.paymentAdded"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.paymentAddFailed"),
        variant: "destructive",
      });
    },
  });


  // Mutation to delete cashflow
  const deleteCashflowMutation = useMutation({
    mutationFn: async (cashflowId: string) => {
      return apiRequest("DELETE", `/api/cashflows/${cashflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
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

  // Mutation to complete all pending payments for an investment
  const bulkCompleteMutation = useMutation({
    mutationFn: async ({ 
      investmentId, 
      clearLateStatus,
      updateLateInfo,
    }: { 
      investmentId: string; 
      clearLateStatus?: boolean;
      updateLateInfo?: { lateDays: number };
    }) => {
      return apiRequest("POST", `/api/investments/${investmentId}/complete-all-payments`, { 
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      setBulkCompleteDialogOpen(false);
      setBulkCompletingInvestment(null);
      
      toast({
        title: t("investments.toast.updated"),
        description: t("investments.toast.allPaymentsComplete"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.completePaymentsFailed"),
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/investments/${id}`);
    },
    onMutate: async (id: string) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/investments"] });
      await queryClient.cancelQueries({ queryKey: ["/api/cashflows"] });
      
      // Snapshot the previous value
      const previousInvestments = queryClient.getQueryData(["/api/investments"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/investments"], (old: InvestmentWithPlatform[] | undefined) => {
        return old ? old.filter(inv => inv.id !== id) : [];
      });
      
      // Return context with snapshot
      return { previousInvestments };
    },
    onSuccess: () => {
      // Invalidate all related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      toast({
        title: t("common.success"),
        description: t("investments.toast.investmentDeleted"),
      });
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
    },
    onError: (error: any, id: string, context: any) => {
      // Check if it's a 404 error (investment already deleted or doesn't exist)
      const is404 = error.message?.includes("404") || error.message?.includes("not found");
      
      if (is404) {
        // Don't rollback - keep the optimistic update (investment removed from cache)
        // Refetch to ensure cache is in sync with server
        queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
        
        toast({
          title: t("investments.toast.alreadyDeletedTitle"),
          description: t("investments.toast.alreadyDeletedDesc"),
        });
      } else {
        // Rollback to previous state for other errors
        if (context?.previousInvestments) {
          queryClient.setQueryData(["/api/investments"], context.previousInvestments);
        }
        
        toast({
          title: t("dialog.error"),
          description: error.message || t("investments.toast.investmentDeleteFailed"),
          variant: "destructive",
        });
      }
      
      // Close dialog even on error to prevent re-attempts
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
    },
  });

  const handleEdit = (investment: InvestmentWithPlatform) => {
    setEditingInvestment(investment);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    // #region agent log
    debugSessionLog({
      runId: "initial",
      hypothesisId: "H5",
      location: "investments.tsx:handleAddNew",
      message: "add new investment clicked",
      data: { route: "investments" },
    });
    // #endregion
    setEditingInvestment(null);
    setDialogOpen(true);
  };

  const handleCompletePayment = (investment: InvestmentWithPlatform) => {
    setCompletingInvestment(investment);
    setCompletePaymentDialogOpen(true);
  };

  const handleDelete = (investment: InvestmentWithPlatform) => {
    setDeletingInvestment(investment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingInvestment) {
      deleteMutation.mutate(deletingInvestment.id);
    }
  };
  
  // Payment management handlers
  const handleMarkPaymentAsReceived = (cashflowId: string) => {
    // Find the cashflow to get its investment
    const cashflow = cashflowsList.find((cf) => cf.id === cashflowId);
    if (!cashflow) {
      updateCashflowMutation.mutate({ cashflowId, status: "received" });
      return;
    }
    
    // Find the investment
    const investment = investments?.find(inv => inv.id === cashflow.investmentId);
    
    // If investment is late or defaulted, show late status dialog
    if (investment && (investment.status === "late" || investment.status === "defaulted")) {
      setPendingCashflowId(cashflowId);
      setPendingCashflowInvestment(investment);
      setLateStatusDialogOpen(true);
    } else {
      // Normal flow - just mark as received
      updateCashflowMutation.mutate({ cashflowId, status: "received" });
    }
  };
  
  // Toggle payment status (for +/- buttons in expanded view)
  const handleTogglePaymentStatus = (cashflowId: string, newStatus: "received" | "upcoming") => {
    // Simply update the cashflow status without showing dialogs
    updateCashflowMutation.mutate({ cashflowId, status: newStatus });
  };
  
  // Handler for late status dialog confirmation
  const handleLateStatusConfirm = (data: {
    cashflowId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => {
    updateCashflowMutation.mutate({
      cashflowId: data.cashflowId,
      status: "received",
      clearLateStatus: data.clearLateStatus,
      updateLateInfo: data.updateLateInfo,
    });
  };

  // Handler for bulk completion (complete all pending payments)
  const handleBulkCompleteAllPayments = (investment: InvestmentWithPlatform) => {
    setBulkCompletingInvestment(investment);
    setBulkCompleteDialogOpen(true);
  };

  // Handler for bulk complete dialog confirmation
  const handleBulkCompleteConfirm = (data: {
    investmentId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => {
    bulkCompleteMutation.mutate({
      investmentId: data.investmentId,
      clearLateStatus: data.clearLateStatus,
      updateLateInfo: data.updateLateInfo,
    });
  };
  
  const handleAddPayment = (investmentId: string) => {
    setAddingPaymentForInvestment(investmentId);
    setAddPaymentDialogOpen(true);
  };
  
  const handleRemovePayment = (cashflowId: string) => {
    deleteCashflowMutation.mutate(cashflowId);
  };

  const handleSubmitNewPayment = (data: any) => {
    addCashflowMutation.mutate({
      investmentId: data.investmentId,
      dueDate: data.dueDate.toISOString(),
      amount: data.amount,
      type: data.type,
      status: data.status,
    });
  };

  // Filter and Sort Logic
  const filteredAndSortedInvestments = useMemo(() => {
    if (!investments) return [];

    let filtered = investments;

    // Smart Search Filter (searches across name, duration, profit, dates)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(inv => {
        // Search in name (case-insensitive)
        if (inv.name.toLowerCase().includes(query)) return true;
        
        // Search in duration months (exact or partial match)
        const durationStr = inv.durationMonths?.toString() || "";
        if (durationStr.includes(query)) return true;
        
        // Search in profit amount (number search)
        const profitStr = inv.totalExpectedProfit?.toString() || "";
        if (profitStr.includes(query)) return true;
        
        // Search in start date (formatted as YYYY-MM-DD or any part)
        const startDateStr = inv.startDate?.toString() || "";
        if (startDateStr.toLowerCase().includes(query)) return true;
        
        // Search in end date (formatted as YYYY-MM-DD or any part)
        const endDateStr = inv.endDate?.toString() || "";
        if (endDateStr.toLowerCase().includes(query)) return true;
        
        return false;
      });
    }

    // Filter by platform
    if (selectedPlatform !== "all") {
      filtered = filtered.filter(inv => inv.platformId === selectedPlatform);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(inv => inv.status === selectedStatus);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const start = (x: typeof a) => (x.startDate ? new Date(x.startDate).getTime() : 0);
      const end = (x: typeof a) => (x.endDate ? new Date(x.endDate).getTime() : 0);
      const amt = (x: typeof a) => Number.parseFloat(String(x.faceValue));
      switch (sortBy) {
        case "date-desc":
          return start(b) - start(a);
        case "date-asc":
          return start(a) - start(b);
        case "amount-desc":
          return amt(b) - amt(a);
        case "amount-asc":
          return amt(a) - amt(b);
        case "end-date-asc":
          return end(a) - end(b);
        case "end-date-desc":
          return end(b) - end(a);
        default:
          return 0;
      }
    });

    return sorted;
  }, [investments, selectedPlatform, selectedStatus, sortBy, searchQuery]);

  const quickStats = useMemo(() => {
    const list = investments ?? [];
    const active = list.filter((inv) => inv.status === "active").length;
    const late = list.filter((inv) => inv.status === "late" || inv.status === "defaulted").length;
    const completed = list.filter((inv) => inv.status === "completed").length;
    const totalValue = list.reduce((sum, inv) => sum + Number.parseFloat(String(inv.faceValue || 0)), 0);
    return { active, late, completed, totalValue };
  }, [investments]);

  const isLoading = investmentsLoading || cashflowsLoading;
  const loadError = investmentsError ?? cashflowsError;

  if (isLoading) {
    return (
      <PageLoadingState
        title={t("investments.pageLoadingTitle")}
        description={t("investments.pageLoadingDesc")}
        rows={6}
        data-testid="state-loading-investments"
      />
    );
  }

  if (loadError) {
    return (
      <PageErrorState
        title={t("investments.pageErrorTitle")}
        description={loadError instanceof Error ? loadError.message : t("common.unexpectedError")}
        retryLabel={t("common.tryAgain")}
        onRetry={() => {
          void Promise.all([refetchInvestments(), refetchCashflows()]);
        }}
        data-testid="state-error-investments"
      />
    );
  }

  return (
    <div
      className="space-y-4 sm:space-y-5 pb-24"
      data-testid="page-investments"
    >
      {/* Page Header with compact opportunities count */}
      <PageHeader title={t("investments.title")} gradient>
        <Badge
          variant="outline"
          className="h-7 px-2.5 text-xs font-semibold tabular-nums"
          aria-label={t("investments.opportunitiesAria", {
            shown: filteredAndSortedInvestments.length,
            total: investments?.length || 0,
          })}
        >
          {filteredAndSortedInvestments.length}/{investments?.length || 0}
        </Badge>
      </PageHeader>

      <Card className="border-dashed bg-muted/15 shadow-none">
        <CardContent className="p-3 sm:p-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <Badge variant="secondary" className="h-7 px-2.5 tabular-nums">
              {t("investments.active")}: {quickStats.active}
            </Badge>
            <Badge variant="outline" className="h-7 px-2.5 tabular-nums">
              {t("investments.completed")}: {quickStats.completed}
            </Badge>
            <Badge variant={quickStats.late > 0 ? "destructive" : "outline"} className="h-7 px-2.5 tabular-nums">
              {t("investments.late")}: {quickStats.late}
            </Badge>
            <Badge variant="outline" className="h-7 px-2.5 tabular-nums">
              {t("dashboard.totalValue")}: {Math.round(quickStats.totalValue).toLocaleString()}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectedStatus === "all" ? "default" : "outline"}
              className="h-8"
              onClick={() => setSelectedStatus("all")}
              data-testid="button-quick-status-all"
            >
              {t("common.all")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedStatus === "active" ? "default" : "outline"}
              className="h-8"
              onClick={() => setSelectedStatus("active")}
              data-testid="button-quick-status-active"
            >
              {t("investments.active")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedStatus === "late" ? "default" : "outline"}
              className="h-8"
              onClick={() => setSelectedStatus("late")}
              data-testid="button-quick-status-late"
            >
              {t("investments.late")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedStatus === "completed" ? "default" : "outline"}
              className="h-8"
              onClick={() => setSelectedStatus("completed")}
              data-testid="button-quick-status-completed"
            >
              {t("investments.completed")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search, view density, filters — single surface */}
      <Card className="sticky top-14 z-10 border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Search Bar */}
        <div className="relative min-w-0">
          <Search className="absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("investments.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 ltr:pr-10 rtl:pl-10"
            data-testid="input-search-investments"
          />
        </div>

        {/* View mode + filters (one compact toolbar) */}
        <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex items-center rounded-lg border bg-muted/50 p-1 shrink-0"
          role="group"
          aria-label={t("investments.listDensityAria")}
        >
          <Button
            onClick={() => setViewMode("ultra-compact")}
            data-testid="button-view-ultra-compact"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-md ${viewMode === "ultra-compact" ? "bg-blue-900 text-white hover:bg-blue-900" : "text-muted-foreground hover:bg-muted"}`}
            title={t("investments.viewUltraCompact")}
          >
            <Minimize className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setViewMode("compact")}
            data-testid="button-view-compact"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-md ${viewMode === "compact" ? "bg-blue-900 text-white hover:bg-blue-900" : "text-muted-foreground hover:bg-muted"}`}
            title={t("investments.viewCompact")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setViewMode("expanded")}
            data-testid="button-view-expanded"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-md ${viewMode === "expanded" ? "bg-blue-900 text-white hover:bg-blue-900" : "text-muted-foreground hover:bg-muted"}`}
            title={t("investments.viewExpanded")}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-full min-w-[9.5rem] sm:w-[180px] shrink-0" data-testid="select-platform-filter">
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("investments.filterAllPlatforms")}</SelectItem>
            {platforms?.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full min-w-[9.5rem] sm:w-[180px] shrink-0" data-testid="select-status-filter">
            <Filter className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("investments.filterAllStatuses")}</SelectItem>
            <SelectItem value="active">{t("investments.active")}</SelectItem>
            <SelectItem value="pending">{t("investments.pending")}</SelectItem>
            <SelectItem value="late">{t("investments.late")}</SelectItem>
            <SelectItem value="defaulted">{t("investments.defaulted")}</SelectItem>
            <SelectItem value="completed">{t("investments.completed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full min-w-[10.5rem] sm:w-[220px] shrink-0" data-testid="select-sort-by">
            <ArrowUpDown className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">{t("investments.sortNewestFirst")}</SelectItem>
            <SelectItem value="date-asc">{t("investments.sortOldestFirst")}</SelectItem>
            <SelectItem value="end-date-asc">{t("investments.sortEndingSoonest")}</SelectItem>
            <SelectItem value="end-date-desc">{t("investments.sortEndingLatest")}</SelectItem>
            <SelectItem value="amount-desc">{t("investments.sortLargestAmount")}</SelectItem>
            <SelectItem value="amount-asc">{t("investments.sortSmallestAmount")}</SelectItem>
          </SelectContent>
        </Select>

        {(selectedPlatform !== "all" || selectedStatus !== "all" || sortBy !== "date-desc" || searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPlatform("all");
              setSelectedStatus("all");
              setSortBy("date-desc");
              setSearchQuery("");
            }}
            className="shrink-0"
            data-testid="button-reset-filters"
          >
            {t("investments.resetFilters")}
          </Button>
        )}
        </div>
        </div>
        </CardContent>
      </Card>

      {filteredAndSortedInvestments.length === 0 ? (
        <PageEmptyState
          title={
            investments && investments.length === 0
              ? t("investments.noInvestmentsYet")
              : t("investments.noMatchingTitle")
          }
          description={
            investments && investments.length === 0
              ? t("investments.noInvestmentsDesc")
              : t("investments.noMatchingDesc")
          }
          icon={Plus}
          action={investments && investments.length === 0 ? (
            <Button onClick={handleAddNew} data-testid="button-add-first-investment">
              <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t("investments.addFirstInvestment")}
            </Button>
          ) : undefined}
          data-testid="card-empty-state"
        />
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {/* Investment List - Uses 3-tier view system (ultra-compact/compact/expanded) */}
          {filteredAndSortedInvestments.map((investment) => (
            <InvestmentRow
              key={investment.id}
              investment={investment}
              cashflows={cashflowsByInvestment[investment.id] ?? []}
              viewMode={viewMode}
              onOpenDetails={() => setSelectedInvestment(investment)}
              onEdit={() => handleEdit(investment)}
              onCompletePayment={() => handleCompletePayment(investment)}
              onDelete={() => handleDelete(investment)}
              onAddPayment={handleAddPayment}
              onRemovePayment={handleRemovePayment}
              onMarkPaymentAsReceived={handleMarkPaymentAsReceived}
              onTogglePaymentStatus={handleTogglePaymentStatus}
            />
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        <InvestmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          investment={editingInvestment}
        />
      </Suspense>

      <Button
        type="button"
        onClick={handleAddNew}
        data-testid="button-add-investment"
        size="icon"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-50 h-14 w-14 rounded-full shadow-lg"
        aria-label={t("investments.addInvestment")}
        title={t("investments.addInvestment")}
      >
        <Plus className="h-7 w-7" aria-hidden />
      </Button>
      
      <Suspense fallback={null}>
        <CompletePaymentDialog
          open={completePaymentDialogOpen}
          onOpenChange={setCompletePaymentDialogOpen}
          investment={completingInvestment}
        />
      </Suspense>

      <Suspense fallback={null}>
        <AddPaymentDialog
          open={addPaymentDialogOpen}
          onOpenChange={setAddPaymentDialogOpen}
          investmentId={addingPaymentForInvestment || ""}
          onSubmit={handleSubmitNewPayment}
          isPending={addCashflowMutation.isPending}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LateStatusDialog
          mode="single"
          open={lateStatusDialogOpen}
          onOpenChange={setLateStatusDialogOpen}
          investment={pendingCashflowInvestment}
          cashflowId={pendingCashflowId}
          onConfirm={handleLateStatusConfirm}
          isPending={updateCashflowMutation.isPending}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LateStatusDialog
          mode="bulk"
          open={bulkCompleteDialogOpen}
          onOpenChange={setBulkCompleteDialogOpen}
          investment={bulkCompletingInvestment}
          pendingCount={
            bulkCompletingInvestment 
              ? (cashflowsByInvestment[bulkCompletingInvestment.id] ?? []).filter((cf) => cf.status === "upcoming").length
              : 0
          }
          totalAmount={
            bulkCompletingInvestment 
              ? (cashflowsByInvestment[bulkCompletingInvestment.id] ?? [])
                  .filter((cf) => cf.status === "upcoming")
                  .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0)
              : 0
          }
          onConfirm={handleBulkCompleteConfirm}
          isPending={bulkCompleteMutation.isPending}
        />
      </Suspense>

      <Suspense fallback={null}>
        <InvestmentDetailsDrawer
          open={!!selectedInvestment}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedInvestment(null);
            }
          }}
          investment={selectedInvestment}
          cashflows={cashflowsList}
          onEdit={() => selectedInvestment && handleEdit(selectedInvestment)}
          onDelete={() => selectedInvestment && handleDelete(selectedInvestment)}
          onCompletePayment={() => selectedInvestment && handleCompletePayment(selectedInvestment)}
          onCompleteAllPayments={() => selectedInvestment && handleBulkCompleteAllPayments(selectedInvestment)}
          onAddPayment={handleAddPayment}
          onRemovePayment={handleRemovePayment}
          onMarkPaymentAsReceived={handleMarkPaymentAsReceived}
        />
      </Suspense>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("investments.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("investments.deleteWarning")}
              {deletingInvestment && (
                <div className="mt-2 font-semibold">
                  {deletingInvestment.name}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t("investments.deleting") : t("investments.deleteVerb")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
