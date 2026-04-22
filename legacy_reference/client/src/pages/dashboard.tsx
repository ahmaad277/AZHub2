import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PageSection } from "@/components/ui/page-section";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Wallet, Target, Banknote, Clock, AlertTriangle, ChevronDown, ChevronUp, PieChart, Plus, Percent, Calendar } from "lucide-react";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";
import { useLanguage } from "@/lib/language-provider";
import { usePlatformFilter } from "@/lib/platform-filter-context";
import { PlatformCard } from "@/components/platform-card";
import { CashTransactionDialog } from "@/components/cash-transaction-dialog";
import { InvestmentDialog } from "@/components/investment-dialog";
import { DateRangeFilter } from "@/components/date-range-filter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { runBackgroundTasksOnce } from "@/lib/backgroundTaskManager";
import { fadeInUp, collapseVariant } from "@/lib/motion-variants";
import { useEditingFlow, useQueryRefreshOptions } from "@/hooks/use-query-refresh";
import { fromHalalas, toHalalas } from "@shared/money";
import { MetricTile } from '@/components/Dashboard/MetricTile';
import {
  calculateNAV,
  calculateCashDrag,
  calculateActiveAnnualYield,
  calculateTotalDistributedProfit,
  calculateDefaultRate,
  calculateWAM,
  calculateExpectedInflow,
  calculatePlatformConcentration,
} from '@/utils/portfolioCalculations';
import {
  computeRealizedGainsWithFallback,
  computePrincipalRepaid,
  computePendingSettlementsAmount,
  sumFaceValues,
} from "@shared/portfolio-metrics";
import { isPendingCashflow } from "@shared/cashflow-filters";
import { calculateDurationMonths } from "@shared/profit-calculator";
import type { PortfolioStats, InvestmentWithPlatform, CashflowWithInvestment, AnalyticsData, UserSettings, Platform, CashTransaction } from "@shared/schema";
import { PageErrorState, PageLoadingState } from "@/components/ui/view-states";

const Vision2040CalculatorRefactored = lazy(() =>
  import("@/components/vision-2040-calculator-refactored").then((module) => ({
    default: module.Vision2040CalculatorRefactored,
  })),
);
const RecentInvestments = lazy(() =>
  import("@/components/recent-investments").then((module) => ({
    default: module.RecentInvestments,
  })),
);

function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(num) ? num : 0;
}

function parseMoney(value: string | number | null | undefined): number {
  return fromHalalas(toHalalas(parseNumber(value)));
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { selectedPlatform, setSelectedPlatform } = usePlatformFilter();
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('All Platforms');
  const [showWarning, setShowWarning] = useState(false);
  const hasActiveEditingFlow = useEditingFlow(investmentDialogOpen, depositDialogOpen, withdrawDialogOpen);
  const queryRefreshOptions = useQueryRefreshOptions({ isEditing: hasActiveEditingFlow });
  
  const {
    data: stats,
    isLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
    ...queryRefreshOptions,
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    ...queryRefreshOptions,
  });

  // Date Range Filter for analytics
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>();

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    ...queryRefreshOptions,
  });

  // Track collapsed sections locally
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  // Sync with settings when they load
  useEffect(() => {
    if (settings?.collapsedSections) {
      try {
        const parsed = JSON.parse(settings.collapsedSections);
        setCollapsedSections(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCollapsedSections([]);
      }
    } else {
      setCollapsedSections([]);
    }
  }, [settings?.collapsedSections]);

  // Run background tasks (status check + alert generation) once per session
  useEffect(() => {
    runBackgroundTasksOnce();
  }, []);

  // Mutation to save collapsed sections
  const updateCollapsedSections = useMutation({
    mutationFn: async (sections: string[]) => {
      const response = await apiRequest("PUT", "/api/settings", {
        collapsedSections: JSON.stringify(sections),
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache directly instead of invalidating to avoid race conditions
      queryClient.setQueryData(["/api/settings"], data);
    },
  });

  // Toggle section collapse state
  const toggleSection = (sectionId: string) => {
    const newCollapsed = collapsedSections.includes(sectionId)
      ? collapsedSections.filter(id => id !== sectionId)
      : [...collapsedSections, sectionId];
    
    setCollapsedSections(newCollapsed);
    updateCollapsedSections.mutate(newCollapsed);
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections.includes(sectionId);

  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
    ...queryRefreshOptions,
  });

  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
    ...queryRefreshOptions,
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const { data: cashBalance } = useQuery<{balance: number; total: number; byPlatform: Record<string, number>}>({
    queryKey: ["/api/cash/balance"],
    ...queryRefreshOptions,
  });

  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
    ...queryRefreshOptions,
  });

  // Convert server investments to mock format for calculations
  const mockInvestments = useMemo(() => {
    if (!investments || !cashflows) return [];
    
    return investments.map(inv => ({
      id: inv.id,
      principal: parseMoney(inv.faceValue),
      expectedProfit: parseMoney(inv.totalExpectedProfit),
      actualProfitDistributed: cashflows
        .filter(cf => cf.investmentId === inv.id && cf.type === 'profit' && cf.status === 'received')
        .reduce((sum, cf) => sum + parseMoney(cf.amount), 0),
      platformName: inv.platform.name,
      status: inv.status === "late" ? "delayed" : (inv.status as 'active' | 'completed' | 'defaulted' | 'delayed'),
      startDate: inv.startDate ? new Date(inv.startDate).toISOString() : new Date().toISOString(),
      maturityDate: inv.endDate ? new Date(inv.endDate).toISOString() : (inv.startDate ? new Date(inv.startDate).toISOString() : new Date().toISOString()),
      expectedPaymentDate: inv.endDate ? new Date(inv.endDate).toISOString() : undefined,
    }));
  }, [investments, cashflows]);

  const mockCashBalance = cashBalance?.balance || 0;

  // Calculate filtered stats based on selected platform
  const filteredStats = useMemo(() => {
    if (!stats || !investments || !cashflows || selectedPlatform === "all") {
      return stats;
    }
    const activeLikeStatuses = new Set(["active", "late", "defaulted"]);

    const platformInvestments = investments.filter(inv => inv.platformId === selectedPlatform);
    const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
    const platformCashflows = cashflows.filter(cf => platformInvestmentIds.has(cf.investmentId));

    const liveList = platformInvestments.filter((inv) => activeLikeStatuses.has(inv.status));
    const totalCapital = sumFaceValues(liveList);

    const normalizedTotalReturns = computeRealizedGainsWithFallback(platformInvestments, platformCashflows);
    const principalRepaid = computePrincipalRepaid(platformCashflows);
    const pendingSettlements = computePendingSettlementsAmount(platformCashflows);

    const activeInvestments = liveList.length;
    const completedInvestmentsCount = platformInvestments.filter((inv) => inv.status === "completed").length;
    const pendingInvestmentsCount = platformInvestments.filter((inv) => inv.status === "pending").length;
    const strictActiveCount = platformInvestments.filter((inv) => inv.status === "active").length;

    const averageIrr = platformInvestments.length > 0
      ? platformInvestments.reduce((sum, inv) => sum + parseNumber(inv.expectedIrr), 0) / platformInvestments.length
      : 0;

    const upcomingCashflow = pendingSettlements;

    const target2040 = 10000000;
    const progressTo2040 = (totalCapital / target2040) * 100;

    const totalCashBalance = parseMoney(cashBalance?.byPlatform?.[selectedPlatform] ?? 0);
    const totalAum = totalCapital + totalCashBalance;

    const reinvestedAmount = platformInvestments
      .filter((inv) => inv.isReinvestment === 1 && (inv.status === "active" || inv.status === "pending"))
      .reduce((sum, inv) => sum + parseMoney(inv.faceValue), 0);

    const availableCash = totalCashBalance - reinvestedAmount;

    const completedInvestments = platformInvestments.filter((inv) => inv.status === "completed");
    const averageDuration = completedInvestments.length > 0
      ? completedInvestments.reduce((sum, inv) => {
          if (!inv.startDate) return sum;
          const start = new Date(inv.startDate);
          const end = new Date(inv.actualEndDate || inv.endDate || new Date());
          const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + duration;
        }, 0) / completedInvestments.length
      : 0;

    const now = new Date();
    const distressedCount = platformInvestments.filter((inv) => {
      if (inv.status !== "active" || !inv.endDate) return false;
      const endDate = new Date(inv.endDate);
      const monthsDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsDelayed >= 3;
    }).length;

    return {
      totalCapital,
      totalReturns: normalizedTotalReturns,
      realizedGains: normalizedTotalReturns,
      totalAum,
      averageIrr,
      activeInvestments,
      completedInvestmentsCount,
      pendingInvestmentsCount,
      strictActiveCount,
      principalRepaid,
      pendingSettlements,
      upcomingCashflow,
      progressTo2040,
      totalCashBalance,
      availableCash,
      reinvestedAmount,
      averageDuration: Math.round(averageDuration),
      distressedCount,
    };
  }, [stats, investments, cashflows, selectedPlatform, cashBalance]);

  // Use filtered or global stats
  const displayStats = filteredStats || stats;

  // Calculate status breakdown for chart
  const statusBreakdown = useMemo(() => {
    if (!investments) return null;

    const filteredInvestments = selectedPlatform === "all" 
      ? investments 
      : investments.filter(inv => inv.platformId === selectedPlatform);

    // Only count active and completed investments for the breakdown
    const relevantInvestments = filteredInvestments.filter(inv => 
      inv.status === "active" || inv.status === "completed"
    );
    
    const total = relevantInvestments.length;
    if (total === 0) return null;

    const now = new Date();
    let activeCount = 0;
    let completedCount = 0;
    let delayedCount = 0;
    let distressedCount = 0;

    relevantInvestments.forEach(inv => {
      if (inv.status === "completed") {
        completedCount++;
      } else if (inv.status === "active") {
        if (!inv.endDate) {
          activeCount++;
          return;
        }
        const endDate = new Date(inv.endDate);
        const daysDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDelayed >= 90) { // 3+ months
          distressedCount++;
        } else if (daysDelayed > 0) {
          delayedCount++;
        } else {
          activeCount++;
        }
      }
    });

    return {
      active: ((activeCount / total) * 100).toFixed(1),
      completed: ((completedCount / total) * 100).toFixed(1),
      delayed: ((delayedCount / total) * 100).toFixed(1),
      distressed: ((distressedCount / total) * 100).toFixed(1),
      activeCount,
      completedCount,
      delayedCount,
      distressedCount,
      total
    };
  }, [investments, selectedPlatform]);

  // Calculate platform stats for Platform Cards (weighted IRR, live capital, avg duration)
  const platformStats = useMemo(() => {
    if (!platforms || !investments || !cashflows) return [];

    const liveStatuses = new Set(["active", "late", "defaulted"]);

    return platforms.map(platform => {
      const platformInvestments = investments.filter(inv => inv.platformId === platform.id);
      const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
      const platformCashflows = cashflows.filter(cf => platformInvestmentIds.has(cf.investmentId));

      const totalReturns = platformCashflows
        .filter(cf => cf.status === "received" && cf.type === "profit")
        .reduce((sum, cf) => sum + parseMoney(cf.amount), 0);

      const totalLiveCapital = platformInvestments
        .filter(inv => liveStatuses.has(inv.status))
        .reduce((sum, inv) => sum + parseMoney(inv.faceValue), 0);

      const forWeightedIrr = platformInvestments.filter(inv => inv.status !== "pending");
      const irrDenom = forWeightedIrr.reduce((sum, inv) => sum + parseMoney(inv.faceValue), 0);
      const irrNumer = forWeightedIrr.reduce(
        (sum, inv) => sum + parseMoney(inv.faceValue) * parseNumber(inv.expectedIrr),
        0
      );
      const averageIrr = irrDenom > 0 ? irrNumer / irrDenom : 0;

      const forDuration = platformInvestments.filter((inv) => {
        if (inv.status === "pending" || !inv.startDate || !inv.endDate) return false;
        return (
          calculateDurationMonths(new Date(inv.startDate), new Date(inv.endDate)) > 0
        );
      });
      const averageDurationMonths =
        forDuration.length > 0
          ? forDuration.reduce((sum, inv) => {
              const m = calculateDurationMonths(
                new Date(inv.startDate!),
                new Date(inv.endDate!)
              );
              return sum + m;
            }, 0) / forDuration.length
          : 0;

      const liveCount = platformInvestments.filter(inv => liveStatuses.has(inv.status)).length;

      return {
        platform,
        investments: platformInvestments,
        totalReturns,
        totalLiveCapital,
        averageIrr,
        averageDurationMonths,
        liveCount,
      };
    });
  }, [platforms, investments, cashflows]);

  // New portfolio calculations
  const filteredInvestments = platformFilter === 'All Platforms' ? mockInvestments : mockInvestments.filter(inv => inv.platformName === platformFilter);

  const nav = calculateNAV(filteredInvestments, mockCashBalance);
  const cashDrag = calculateCashDrag(mockCashBalance, nav);
  const activeYield = calculateActiveAnnualYield(filteredInvestments);
  const totalDistributed = calculateTotalDistributedProfit(filteredInvestments);
  const expectedInflow = calculateExpectedInflow(filteredInvestments);
  const defaultRate = calculateDefaultRate(filteredInvestments);
  const wam = calculateWAM(filteredInvestments);
  const concentration = calculatePlatformConcentration(filteredInvestments);

  const cashDragTooltip = useMemo(() => {
    const futurePayments = filteredInvestments.filter(inv => 
      inv.expectedPaymentDate && 
      new Date(inv.expectedPaymentDate) > new Date() && 
      inv.principal <= mockCashBalance
    );
    if (futurePayments.length === 0) return undefined;
    const closest = futurePayments.reduce((prev, curr) => {
      const prevTime = new Date(prev.expectedPaymentDate!).getTime();
      const currTime = new Date(curr.expectedPaymentDate!).getTime();
      return currTime < prevTime ? curr : prev;
    });
    const dateStr = new Date(closest.expectedPaymentDate!).toLocaleDateString('ar-SA');
    return `مبلغ ${formatCurrency(closest.principal)} يكفي لشراء صك يستحق في ${dateStr}`;
  }, [filteredInvestments, mockCashBalance]);

  type MetricTilePropsType = Parameters<typeof MetricTile>[0];

  const tiles: MetricTilePropsType[] = [
    {
      title: 'إجمالي قيمة المحفظة',
      primaryValue: formatCurrency(nav),
      secondaryValue: '0.0%',
      alert: 'none' as const,
      icon: Wallet,
      tooltip: 'إجمالي قيمة المحفظة = رأس المال النشط (الاستثمارات النشطة) + رصيد النقد المتاح',
    },
    {
      title: 'السيولة المعطلة',
      primaryValue: `${cashDrag.percentage.toFixed(2)}%`,
      secondaryValue: formatCurrency(mockCashBalance),
      alert: cashDrag.percentage > 20 ? 'orange' : 'none',
      icon: Banknote,
      tooltip: cashDragTooltip,
    },
    {
      title: 'العائد السنوي النشط',
      primaryValue: `${activeYield.percentage.toFixed(2)}%`,
      secondaryValue: formatCurrency(activeYield.estimatedAnnualProfit),
      alert: 'none' as const,
      icon: TrendingUp,
      tooltip: 'العائد السنوي النشط = (إجمالي الأرباح المتوقعة / رأس المال النشط) × (365 / متوسط الأيام المتبقية)',
    },
    {
      title: 'إجمالي الأرباح المستلمة',
      primaryValue: formatCurrency(totalDistributed),
      secondaryValue: nav > 0 ? `${((totalDistributed / nav) * 100).toFixed(2)}%` : '0.00%',
      alert: 'none' as const,
      icon: Target,
      tooltip: 'إجمالي الأرباح المستلمة = مجموع جميع التوزيعات النقدية المستلمة من الاستثمارات',
    },
    {
      title: 'التدفق المتوقع (30 يوم)',
      primaryValue: formatCurrency(expectedInflow.totalAmount),
      secondaryValue: expectedInflow.count > 0 ? `${expectedInflow.count} دفعة` : 'لا يوجد',
      alert: 'none' as const,
      icon: Clock,
      tooltip: 'التدفق المتوقع في 30 يوماً القادمة = رأس المال + الأرباح المتوقعة للاستثمارات المستحقة',
    },
    {
      title: 'معدل التعثر',
      primaryValue: `${defaultRate.percentage.toFixed(2)}%`,
      secondaryValue: formatCurrency(defaultRate.atRiskAmount),
      alert: defaultRate.percentage > 2 ? 'red' : 'none',
      icon: AlertTriangle,
      tooltip: 'معدل التعثر = (قيمة الاستثمارات المتعثرة / إجمالي قيمة المحفظة) × 100%',
    },
    {
      title: 'متوسط فترة الاستحقاق',
      primaryValue: `${wam.averageDays.toFixed(0)} يوم`,
      secondaryValue: `${wam.percentMaturingIn90Days.toFixed(2)}% خلال 90 يوم`,
      alert: 'none' as const,
      icon: Calendar,
      tooltip: 'متوسط فترة الاستحقاق = متوسط الأيام المتبقية حتى استحقاق الاستثمارات النشطة',
    },
    {
      title: 'تركيز المنصة الأعلى',
      primaryValue: concentration.topPlatform,
      secondaryValue: `${concentration.percentage.toFixed(2)}% من المحفظة`,
      alert: concentration.percentage > 50 ? 'orange' : 'none',
      icon: PieChart,
      tooltip: 'تركيز المنصة الأعلى = النسبة المئوية للاستثمارات في المنصة الأكبر',
    },
  ];

  // Data consistency check
  useEffect(() => {
    const activePrincipal = filteredInvestments
      .filter(inv => inv.status === 'active')
      .reduce((sum, inv) => sum + inv.principal, 0);
    setShowWarning(Math.abs(mockCashBalance + activePrincipal - nav) > 0.01);
  }, [mockCashBalance, filteredInvestments, nav]);


  // Vision 2040 Target & Progress Calculations
  const target2040 = settings?.targetCapital2040 ? parseMoney(settings.targetCapital2040) : 10000000;
  const initialPortfolio = 600000; // Starting portfolio value
  const currentDate = new Date();
  const targetDate = new Date(2040, 0, 1); // January 1, 2040
  const startDate = new Date(2024, 0, 1); // Assuming starting from 2024
  
  const totalYears = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const elapsedYears = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const remainingYears = totalYears - elapsedYears;
  
  // Use actual portfolio value or initial portfolio as fallback
  const currentPortfolioValue = displayStats && (displayStats.totalAum > 0 || displayStats.totalCapital + displayStats.totalCashBalance > 0)
    ? (displayStats.totalAum > 0 ? displayStats.totalAum : displayStats.totalCapital + displayStats.totalCashBalance)
    : initialPortfolio;
    
  const currentProgress = Math.min(Math.max((currentPortfolioValue / target2040) * 100, 0), 100);
  
  // Expected progress based on time elapsed (clamped to [0,100])
  const expectedProgressPercent = Math.min(Math.max((elapsedYears / totalYears) * 100, 0), 100);
  const expectedValue = (target2040 * expectedProgressPercent) / 100;
  
  // Required annual return to reach target (safe division with fallback, clamped to [0,100])
  const requiredAnnualReturn = remainingYears > 0 && currentPortfolioValue > 0 && currentPortfolioValue < target2040
    ? Math.min(Math.max((Math.pow(target2040 / currentPortfolioValue, 1 / remainingYears) - 1) * 100, 0), 100)
    : 0;

  const cashStatCards = [
    {
      key: "totalCashBalance",
      value: displayStats ? formatCurrency(displayStats.totalCashBalance) : "-",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  // Calculate weighted average APR for additional metrics
  const weightedAvgAPR = useMemo(() => {
    if (!investments || investments.length === 0) return 0;
    
    const activeInvestments = selectedPlatform === "all" 
      ? investments.filter(inv => inv.status === "active")
      : investments.filter(inv => inv.status === "active" && inv.platformId === selectedPlatform);
    
    if (activeInvestments.length === 0) return 0;
    
    const totalValue = activeInvestments.reduce((sum, inv) => sum + parseMoney(inv.faceValue), 0);
    const weightedSum = activeInvestments.reduce((sum, inv) => {
      const weight = parseMoney(inv.faceValue) / totalValue;
      return sum + (parseNumber(inv.expectedIrr) * weight);
    }, 0);
    
    return weightedSum;
  }, [investments, selectedPlatform]);

  // Calculate next payment expected
  const nextPayment = useMemo(() => {
    if (!cashflows) return null;
    
    const upcomingCashflows = selectedPlatform === "all"
      ? cashflows.filter(cf => isPendingCashflow(cf))
      : cashflows.filter(cf => {
          const investment = investments?.find(inv => inv.id === cf.investmentId);
          return isPendingCashflow(cf) && investment?.platformId === selectedPlatform;
        });
    
    if (upcomingCashflows.length === 0) return null;
    
    // Sort by due date
    const sortedCashflows = upcomingCashflows.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    return {
      amount: parseMoney(sortedCashflows[0].amount),
      date: new Date(sortedCashflows[0].dueDate),
      daysUntil: Math.ceil((new Date(sortedCashflows[0].dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [cashflows, investments, selectedPlatform]);

  const additionalStatCards = [
    {
      key: "weightedAvgAPR",
      value: formatPercentage(weightedAvgAPR),
      icon: TrendingUp,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      key: "nextPaymentExpected",
      value: nextPayment ? formatCurrency(nextPayment.amount) : "-",
      secondaryValue: nextPayment ? `${t("cashflows.inDays").replace("{0}", nextPayment.daysUntil.toString())}` : t("dashboard.noDataYet"),
      icon: Banknote,
      color: nextPayment && nextPayment.daysUntil <= 7 ? "text-chart-2" : "text-primary",
      bgColor: nextPayment && nextPayment.daysUntil <= 7 ? "bg-chart-2/10" : "bg-primary/10",
    },
  ];

  if (isLoading) {
    return (
      <PageLoadingState
        title={t("common.loading")}
        rows={6}
        data-testid="state-loading-dashboard"
      />
    );
  }

  if (statsError) {
    return (
      <PageErrorState
        title={t("common.error")}
        description={statsError instanceof Error ? statsError.message : (t("dashboard.noDataYet") || "Unexpected error")}
        retryLabel={t("common.retry") || "Retry"}
        onRetry={() => {
          void refetchStats();
        }}
        data-testid="state-error-dashboard"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-dashboard">
      {/* Page Header with Cash Transaction Buttons */}
      <PageHeader
        title={t("dashboard.title")}
        gradient
        className="py-1.5"
      >
        {/* Cash Transaction Buttons - positioned on opposite side */}
        <Button
          onClick={() => setInvestmentDialogOpen(true)}
          size="sm"
          className="h-7 sm:h-6 px-1.5 gap-0.5 text-[10px] sm:text-xs max-sm:whitespace-normal max-sm:text-center max-sm:min-h-8"
          data-testid="button-add-investment-dashboard"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("investments.addInvestment")}
        </Button>
        <CashTransactionDialog type="deposit" onDialogStateChange={setDepositDialogOpen} />
        <CashTransactionDialog type="withdrawal" onDialogStateChange={setWithdrawDialogOpen} />
      </PageHeader>

      {showWarning && (
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center rounded-md mx-4">
          تنبيه: بيانات المحفظة تحتاج مراجعة
        </div>
      )}

      {/* New KPI Tiles Section */}
      <PageSection title="المعايير المالية الرئيسية">
        <div className="mb-4">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Platforms">جميع المنصات</SelectItem>
              <SelectItem value="Manafa">Manafa</SelectItem>
              <SelectItem value="Lendo">Lendo</SelectItem>
              <SelectItem value="Sukuk">Sukuk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiles.map((tile, i) => (
            <MetricTile key={i} {...tile} />
          ))}
        </div>
      </PageSection>

      {/* 2. Vision 2040 Progress Calculator - Unified Component */}
      <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted/40" />}>
        <Vision2040CalculatorRefactored 
          isCollapsed={isSectionCollapsed('vision-2040')}
          onToggle={() => toggleSection('vision-2040')}
        />
      </Suspense>

      {/* Platform-Specific Cash Balance Card */}
      {selectedPlatform !== "all" && cashBalance?.byPlatform && platforms && (
        (() => {
          const platform = platforms.find(p => p.id === selectedPlatform);
          const platformCashBalance = cashBalance.byPlatform[selectedPlatform] || 0;
          
          if (!platform) return null;
          
          return (
            <motion.div
              key="platform-cash-balance"
              {...fadeInUp}
            >
              <Card 
                className={cn("border-s-4", getPlatformBorderClasses(platform.name))}
                data-testid="card-platform-cash-balance"
              >
                <CardHeader>
                  <div className="flex flex-row items-center justify-between gap-2">
                    <Badge className={getPlatformBadgeClasses(platform.name)} data-testid="badge-platform-name">
                      {platform.name}
                    </Badge>
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-platform-cash-amount">
                    {formatCurrency(platformCashBalance)}
                  </div>
                  <p className="text-sm text-muted-foreground">{t("dashboard.cashBalance")}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()
      )}

      {/* Platforms Overview - Collapsible */}
      {platformStats.length > 0 && (
        <Card data-testid="card-platforms-overview">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">{t("dashboard.platformsOverview")}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleSection('platforms-overview')}
              data-testid="button-toggle-platforms-overview"
            >
              {isSectionCollapsed('platforms-overview') ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
          <AnimatePresence initial={false}>
            {!isSectionCollapsed('platforms-overview') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {platformStats.map(({ platform, investments, totalReturns, totalLiveCapital, averageIrr, averageDurationMonths, liveCount }) => (
                      <PlatformCard
                        key={platform.id}
                        platform={platform}
                        investments={investments}
                        totalReturns={totalReturns}
                        totalLiveCapital={totalLiveCapital}
                        averageIrr={averageIrr}
                        averageDurationMonths={averageDurationMonths}
                        liveCount={liveCount}
                        onClick={() => setLocation(`/platform/${platform.id}`)}
                      />
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Analytics Charts and Lists - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && (
          <motion.div
            key="analytics-section"
            {...fadeInUp}
            className="space-y-5"
          >
            <Card data-testid="card-recent-investments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">{t("dashboard.recentInvestments")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('recent-investments')}
                  data-testid="button-toggle-recent-investments"
                  className="h-8 w-8 p-0"
                >
                  {isSectionCollapsed('recent-investments') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {!isSectionCollapsed('recent-investments') && (
                  <motion.div
                    {...collapseVariant}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
                        <RecentInvestments />
                      </Suspense>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <InvestmentDialog
        open={investmentDialogOpen}
        onOpenChange={setInvestmentDialogOpen}
      />
    </div>
  );
}
