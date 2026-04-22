import { lazy, Suspense, useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { useQueryRefreshOptions } from "@/hooks/use-query-refresh";
import { calculateMonthlyForecast, calculateForecastSummaries } from "@shared/cashflow-forecast";
import { isPendingCashflow } from "@shared/cashflow-filters";
import { PageErrorState, PageLoadingState } from "@/components/ui/view-states";
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  DollarSign,
  Filter
} from "lucide-react";
import type { CashflowWithInvestment, CashTransaction, InvestmentWithPlatform } from "@shared/schema";

const LateStatusDialog = lazy(() =>
  import("@/components/late-status-dialog").then((module) => ({ default: module.LateStatusDialog })),
);
const AddCashDialog = lazy(() =>
  import("@/components/add-cash-dialog").then((module) => ({ default: module.AddCashDialog })),
);
const CashflowForecastChart = lazy(() =>
  import("@/components/cashflow-forecast-chart").then((module) => ({ default: module.CashflowForecastChart })),
);
const ForecastSummaryCards = lazy(() =>
  import("@/components/forecast-summary-cards").then((module) => ({ default: module.ForecastSummaryCards })),
);

export default function CashflowsUnified() {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Filter states for cash transactions
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [pendingCashflowId, setPendingCashflowId] = useState<string | null>(null);
  const [pendingInvestment, setPendingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const queryRefreshOptions = useQueryRefreshOptions({
    isEditing: isCashDialogOpen || lateDialogOpen,
  });

  // Fetch cashflows from investments
  const {
    data: cashflows = [],
    isLoading: cashflowsLoading,
    error: cashflowsError,
    refetch: refetchCashflows,
  } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
    ...queryRefreshOptions,
  });

  // Fetch cash transactions
  const {
    data: cashTransactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
    ...queryRefreshOptions,
  });

  // Fetch cash balance
  const { data: cashBalanceResponse } = useQuery<{ balance: number }>({
    queryKey: ["/api/cash/balance"],
    ...queryRefreshOptions,
  });
  const cashBalance = cashBalanceResponse?.balance ?? 0;

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
      setLateDialogOpen(false);
      setPendingCashflowId(null);
      setPendingInvestment(null);
      toast({
        title: t("investments.toast.updated"),
        description: t("investments.toast.paymentStatusUpdated"),
      });
    },
    onError: (error: Error & { message?: string }) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("investments.toast.paymentStatusFailed"),
        variant: "destructive",
      });
    },
  });

  const handleMarkCashflowReceived = (cf: CashflowWithInvestment) => {
    if (cf.status === "received") return;
    const inv = cf.investment;
    if (inv.status === "late" || inv.status === "defaulted") {
      setPendingCashflowId(cf.id);
      setPendingInvestment(inv);
      setLateDialogOpen(true);
    } else {
      updateCashflowMutation.mutate({ cashflowId: cf.id, status: "received" });
    }
  };

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

  // Investment cashflows received: profit + principal
  const cashflowStats = useMemo(() => {
    const totalReceived = cashflows
      .filter(cf => cf.status === "received" && (cf.type === "profit" || cf.type === "principal"))
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
    
    const totalExpected = cashflows
      .filter(cf => isPendingCashflow(cf) && cf.type === "profit")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    return { totalReceived, totalExpected };
  }, [cashflows]);

  // Calculate cash transaction statistics
  const cashStats = useMemo(() => {
    const deposits = cashTransactions
      .filter(t => t.type === "deposit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const withdrawals = cashTransactions
      .filter(t => t.type === "withdrawal")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const investments = cashTransactions
      .filter(t => t.type === "investment")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const distributions = cashTransactions
      .filter(t => t.type === "distribution")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return { deposits, withdrawals, investments, distributions };
  }, [cashTransactions]);

  // Calculate forecast data (memoized for performance)
  const forecastData = useMemo(() => {
    return calculateMonthlyForecast(cashflows, 60);
  }, [cashflows]);

  // Calculate forecast summaries
  const forecastSummaries = useMemo(() => {
    return calculateForecastSummaries(forecastData);
  }, [forecastData]);

  // Filter cash transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...cashTransactions];

    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    if (selectedPeriod !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedPeriod) {
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= filterDate);
    }

    return filtered;
  }, [cashTransactions, selectedType, selectedPeriod]);

  // Combine all transactions for "All" tab
  const allTransactions = useMemo(() => {
    const cashflowTrans = cashflows.map(cf => ({
      id: `cf-${cf.id}`,
      date: cf.dueDate,
      type: "cashflow" as const,
      source: `${cf.investment.name} (${cf.investment.platform.name})`,
      amount: cf.amount,
      status: cf.status,
      cashflowType: cf.type,
      notes: t(`cashflows.${cf.type}`),
    }));

    const cashTrans = cashTransactions.map(ct => ({
      id: `ct-${ct.id}`,
      date: ct.date,
      type: "cash" as const,
      source: ct.source || "-",
      amount: ct.amount,
      transactionType: ct.type,
      notes: ct.notes || "-",
    }));

    return [...cashflowTrans, ...cashTrans].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [cashflows, cashTransactions, t]);

  const getCashflowStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/20" data-testid={`badge-status-received`}>
            <CheckCircle2 className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("cashflows.received")}
          </Badge>
        );
      case "expected":
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20" data-testid={`badge-status-expected`}>
            <Clock className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("cashflows.expected")}
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" data-testid={`badge-status-upcoming`}>
            <TrendingUp className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
            {t("cashflows.upcoming")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="h-4 w-4" />;
      case "withdrawal":
        return <TrendingDown className="h-4 w-4" />;
      case "investment":
        return <DollarSign className="h-4 w-4" />;
      case "distribution":
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getCashTypeBadge = (type: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      deposit: {
        className: "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20",
        label: t("cash.deposit"),
      },
      withdrawal: {
        className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        label: t("cash.withdrawal"),
      },
      investment: {
        className: "bg-primary/10 text-primary hover:bg-primary/20",
        label: t("cash.investment"),
      },
      distribution: {
        className: "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20",
        label: t("cash.distribution"),
      },
      transfer: {
        className: "bg-muted text-muted-foreground hover:bg-muted/80",
        label: t("cash.transfer"),
      },
    };

    const config = configs[type] || configs.transfer;
    return (
      <Badge className={config.className} data-testid={`badge-type-${type}`}>
        {getTypeIcon(type)}
        <span className="ltr:ml-1 rtl:mr-1">{config.label}</span>
      </Badge>
    );
  };

  if (cashflowsLoading || transactionsLoading) {
    return (
      <PageLoadingState
        title={t("common.loading")}
        rows={7}
        data-testid="state-loading-cashflows"
      />
    );
  }

  const loadError = cashflowsError ?? transactionsError;
  if (loadError) {
    return (
      <PageErrorState
        title={t("cashflows.errorTitle")}
        description={loadError instanceof Error ? loadError.message : t("common.unexpectedError")}
        retryLabel={t("common.tryAgain")}
        onRetry={() => {
          void Promise.all([refetchCashflows(), refetchTransactions()]);
        }}
        data-testid="state-error-cashflows"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-cashflows-unified">
      {/* Header */}
      <PageHeader
        title={t("cashflows.title")}
        gradient
      >
        <Suspense fallback={null}>
          <AddCashDialog onDialogStateChange={setIsCashDialogOpen} />
        </Suspense>
      </PageHeader>

      {/* Combined Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <Card className="hover-elevate" data-testid="card-stat-availableBalance">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.availableBalance")}</p>
                <p className="text-xl sm:text-2xl font-bold text-chart-2">{formatCurrency(cashBalance, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalReceived">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cashflows.totalReceived")}</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(cashflowStats.totalReceived, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalExpected">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cashflows.expectedThisQuarter")}</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(cashflowStats.totalExpected, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalDeposits">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.totalDeposits")}</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(cashStats.deposits, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-fiveYearForecast">
          <CardContent className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("forecast.period.years5")}</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(forecastSummaries.months60.total, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Forecast Section */}
      {forecastData.some(month => month.total > 0) ? (
        <div className="space-y-4 sm:space-y-5">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-muted/40" />}>
            <CashflowForecastChart data={forecastData} months={40} />
          </Suspense>
          <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
            <ForecastSummaryCards
              month1={forecastSummaries.month1}
              months3={forecastSummaries.months3}
              months6={forecastSummaries.months6}
              months12={forecastSummaries.months12}
              months24={forecastSummaries.months24}
              months60={forecastSummaries.months60}
            />
          </Suspense>
        </div>
      ) : cashflows.length > 0 ? (
        <Card data-testid="card-forecast-no-data">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("forecast.noData")}</h3>
                <p className="text-sm text-muted-foreground">{t("forecast.noDataDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full" data-testid="tabs-cashflows">
        <TabsList className="flex h-auto w-full gap-1 overflow-x-auto p-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
          <TabsTrigger value="all" className="min-w-[7.5rem] px-2 py-1.5 text-xs sm:min-w-0 sm:text-sm" data-testid="tab-all">{t("cashflows.allTransactions")}</TabsTrigger>
          <TabsTrigger value="investment" className="min-w-[7.5rem] px-2 py-1.5 text-xs sm:min-w-0 sm:text-sm" data-testid="tab-investment">{t("cashflows.investmentCashflows")}</TabsTrigger>
          <TabsTrigger value="cash" className="min-w-[7.5rem] px-2 py-1.5 text-xs sm:min-w-0 sm:text-sm" data-testid="tab-cash">{t("cash.cashTransactions")}</TabsTrigger>
        </TabsList>

        {/* All Transactions Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card data-testid="card-all-transactions">
            <CardHeader>
              <CardTitle>{t("cashflows.allTransactions")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="sm:hidden divide-y p-3 space-y-3">
                {allTransactions.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    {t("cashflows.noTransactions")}
                  </div>
                ) : (
                  allTransactions.map((transaction) => {
                    const isInflow =
                      transaction.type === "cashflow" ||
                      transaction.transactionType === "deposit" ||
                      transaction.transactionType === "distribution";
                    return (
                      <div
                        key={transaction.id}
                        className="space-y-2 pt-3 first:pt-0"
                        data-testid={`card-transaction-${transaction.id}`}
                      >
                        <div className="font-medium text-sm">{formatDate(transaction.date)}</div>
                        <div>
                          {transaction.type === "cashflow" ? (
                            <Badge variant="outline" className="capitalize">
                              {t("cashflows.investmentDistribution")}
                            </Badge>
                          ) : (
                            getCashTypeBadge(transaction.transactionType || "transfer")
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground break-words">
                          <span className="font-medium text-foreground">{t("cash.source")}: </span>
                          {transaction.source}
                        </div>
                        <div
                          className={`font-semibold tabular-nums text-end ${
                            isInflow ? "text-chart-2" : "text-destructive"
                          }`}
                        >
                          {isInflow ? "+" : "-"}
                          {formatCurrency(parseFloat(transaction.amount))}
                        </div>
                        {transaction.notes ? (
                          <div className="text-xs text-muted-foreground break-words whitespace-normal leading-snug">
                            {transaction.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-start text-sm text-muted-foreground">
                      <th className="p-2.5 sm:p-3 font-medium">{t("cashflows.date")}</th>
                      <th className="p-2.5 sm:p-3 font-medium">{t("common.type")}</th>
                      <th className="p-2.5 sm:p-3 font-medium hidden sm:table-cell">{t("cash.source")}</th>
                      <th className="p-2.5 sm:p-3 font-medium text-end">{t("cashflows.amount")}</th>
                      <th className="p-2.5 sm:p-3 font-medium hidden md:table-cell">{t("cash.notes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 sm:p-8 text-center text-muted-foreground">
                          {t("cashflows.noTransactions")}
                        </td>
                      </tr>
                    ) : (
                      allTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover-elevate transition-colors"
                          data-testid={`row-transaction-${transaction.id}`}
                        >
                          <td className="p-2.5 sm:p-3">
                            <div className="font-medium">{formatDate(transaction.date)}</div>
                          </td>
                          <td className="p-2.5 sm:p-3">
                            {transaction.type === "cashflow" ? (
                              <Badge variant="outline" className="capitalize">
                                {t("cashflows.investmentDistribution")}
                              </Badge>
                            ) : (
                              getCashTypeBadge(transaction.transactionType || "transfer")
                            )}
                          </td>
                          <td className="p-2.5 sm:p-3 text-sm text-muted-foreground hidden sm:table-cell">
                            {transaction.source}
                          </td>
                          <td className={`p-2.5 sm:p-3 font-semibold text-end tabular-nums ${
                            transaction.type === "cashflow" || 
                            transaction.transactionType === "deposit" || 
                            transaction.transactionType === "distribution"
                              ? "text-chart-2"
                              : "text-destructive"
                          }`}>
                            {(transaction.type === "cashflow" || 
                              transaction.transactionType === "deposit" || 
                              transaction.transactionType === "distribution") ? "+" : "-"}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </td>
                          <td className="p-2.5 sm:p-3 text-sm text-muted-foreground hidden md:table-cell max-w-md break-words whitespace-normal leading-snug">
                            {transaction.notes}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investment Cashflows Tab */}
        <TabsContent value="investment" className="space-y-4">
          <Card data-testid="card-investment-cashflows">
            <CardHeader>
              <CardTitle>{t("cashflows.allCashflows")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="sm:hidden divide-y p-3 space-y-3">
                {cashflows.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    {t("cashflows.noCashflows")}
                  </div>
                ) : (
                  cashflows.map((cashflow) => (
                    <div
                      key={cashflow.id}
                      className="space-y-2 pt-3 first:pt-0"
                      data-testid={`card-cashflow-${cashflow.id}`}
                    >
                      <div className="font-medium text-sm">{formatDate(cashflow.dueDate)}</div>
                      {cashflow.status === "upcoming" && (
                        <div className="text-xs text-muted-foreground">
                          {t("cashflows.inDays").replace("{0}", calculateDaysUntil(cashflow.dueDate).toString())}
                        </div>
                      )}
                      <div className="font-medium">{cashflow.investment.name}</div>
                      <div className="text-sm text-muted-foreground">{cashflow.investment.platform.name}</div>
                      <div className="font-semibold text-chart-2 tabular-nums">
                        {formatCurrency(cashflow.amount)}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getCashflowStatusBadge(cashflow.status)}
                        <Badge variant="outline" className="capitalize" data-testid={`badge-type-${cashflow.type}`}>
                          {t(`cashflows.${cashflow.type}`)}
                        </Badge>
                      </div>
                      {cashflow.status !== "received" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="w-full text-xs"
                          disabled={updateCashflowMutation.isPending}
                          onClick={() => handleMarkCashflowReceived(cashflow)}
                          data-testid={`button-mark-received-mobile-${cashflow.id}`}
                        >
                          {t("cashflows.markReceived")}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-start text-sm text-muted-foreground">
                      <th className="p-3 font-medium">{t("cashflows.date")}</th>
                      <th className="p-3 font-medium">{t("cashflows.investment")}</th>
                      <th className="p-3 font-medium">{t("cashflows.platform")}</th>
                      <th className="p-3 font-medium">{t("cashflows.amount")}</th>
                      <th className="p-3 font-medium">{t("cashflows.status")}</th>
                      <th className="p-3 font-medium">{t("cashflows.type")}</th>
                      <th className="p-3 font-medium w-[1%] whitespace-nowrap">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cashflows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 sm:p-8 text-center text-muted-foreground">
                          {t("cashflows.noCashflows")}
                        </td>
                      </tr>
                    ) : (
                      cashflows.map((cashflow) => (
                        <tr
                          key={cashflow.id}
                          className="hover-elevate transition-colors"
                          data-testid={`row-cashflow-${cashflow.id}`}
                        >
                          <td className="p-3">
                            <div className="font-medium">{formatDate(cashflow.dueDate)}</div>
                            {cashflow.status === "upcoming" && (
                              <div className="text-xs text-muted-foreground">
                                {t("cashflows.inDays").replace("{0}", calculateDaysUntil(cashflow.dueDate).toString())}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{cashflow.investment.name}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-sm text-muted-foreground">
                              {cashflow.investment.platform.name}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-chart-2 tabular-nums">
                              {formatCurrency(cashflow.amount)}
                            </div>
                          </td>
                          <td className="p-3">{getCashflowStatusBadge(cashflow.status)}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize" data-testid={`badge-type-${cashflow.type}`}>
                              {t(`cashflows.${cashflow.type}`)}
                            </Badge>
                          </td>
                          <td className="p-3 text-end">
                            {cashflow.status !== "received" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 px-3 text-xs"
                                disabled={updateCashflowMutation.isPending}
                                onClick={() => handleMarkCashflowReceived(cashflow)}
                                data-testid={`button-mark-received-${cashflow.id}`}
                              >
                                {t("cashflows.markReceived")}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Transactions Tab */}
        <TabsContent value="cash" className="space-y-4">
          {/* Filters */}
          <Card className="sticky top-14 z-10 border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <CardContent className="p-3 sm:p-3.5">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("common.filters")}:</span>
                </div>
                
                <div className="flex flex-wrap gap-2 flex-1 w-full">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px]" data-testid="select-type">
                      <SelectValue placeholder={t("cash.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="deposit">{t("cash.deposit")}</SelectItem>
                      <SelectItem value="withdrawal">{t("cash.withdrawal")}</SelectItem>
                      <SelectItem value="investment">{t("cash.investment")}</SelectItem>
                      <SelectItem value="distribution">{t("cash.distribution")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="h-10 w-full sm:w-[180px]" data-testid="select-period">
                      <SelectValue placeholder={t("cash.selectPeriod")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allTime")}</SelectItem>
                      <SelectItem value="week">{t("common.lastWeek")}</SelectItem>
                      <SelectItem value="month">{t("common.lastMonth")}</SelectItem>
                      <SelectItem value="quarter">{t("common.lastQuarter")}</SelectItem>
                      <SelectItem value="year">{t("common.lastYear")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground">
                  {filteredTransactions.length} {t("cash.transactions")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Transactions Table */}
          <Card data-testid="card-cash-transactions">
            <CardContent className="p-0">
              <div className="sm:hidden divide-y p-3 space-y-3">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    {t("cash.noTransactions")}
                  </div>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const isInflow = transaction.type === "deposit" || transaction.type === "distribution";
                    return (
                      <div
                        key={transaction.id}
                        className="space-y-2 pt-3 first:pt-0"
                        data-testid={`card-cash-tx-${transaction.id}`}
                      >
                        <div className="font-medium text-sm">{formatDate(transaction.date)}</div>
                        <div>{getCashTypeBadge(transaction.type)}</div>
                        <div className="text-xs text-muted-foreground capitalize break-words">
                          <span className="font-medium text-foreground">{t("cash.source")}: </span>
                          {transaction.source || "—"}
                        </div>
                        <div
                          className={`text-sm font-medium text-end tabular-nums ${
                            isInflow ? "text-chart-2" : "text-destructive"
                          }`}
                        >
                          {isInflow ? "+" : "-"}
                          {formatCurrency(parseFloat(transaction.amount))}
                        </div>
                        <div className="text-xs text-muted-foreground break-words whitespace-normal leading-snug">
                          {transaction.notes || "—"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-start p-3 font-medium text-sm">{t("cash.date")}</th>
                      <th className="text-start p-3 font-medium text-sm">{t("cash.type")}</th>
                      <th className="text-start p-3 font-medium text-sm hidden sm:table-cell">{t("cash.source")}</th>
                      <th className="text-end p-3 font-medium text-sm">{t("cash.amount")}</th>
                      <th className="text-start p-3 font-medium text-sm hidden md:table-cell">{t("cash.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-6 sm:p-8 text-muted-foreground">
                          {t("cash.noTransactions")}
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b last:border-0 hover-elevate">
                          <td className="p-3 text-sm">{formatDate(transaction.date)}</td>
                          <td className="p-3">{getCashTypeBadge(transaction.type)}</td>
                          <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell capitalize">
                            {transaction.source || "-"}
                          </td>
                          <td className={`p-3 text-sm font-medium text-end tabular-nums ${
                            transaction.type === "deposit" || transaction.type === "distribution"
                              ? "text-chart-2"
                              : "text-destructive"
                          }`}>
                            {transaction.type === "deposit" || transaction.type === "distribution" ? "+" : "-"}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground hidden md:table-cell max-w-md break-words whitespace-normal leading-snug">
                            {transaction.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Suspense fallback={null}>
        <LateStatusDialog
          mode="single"
          open={lateDialogOpen}
          onOpenChange={(open) => {
            setLateDialogOpen(open);
            if (!open) {
              setPendingCashflowId(null);
              setPendingInvestment(null);
            }
          }}
          investment={pendingInvestment}
          cashflowId={pendingCashflowId}
          onConfirm={handleLateStatusConfirm}
          isPending={updateCashflowMutation.isPending}
        />
      </Suspense>
    </div>
  );
}
