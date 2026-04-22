import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Wallet, BarChart3, Target, Clock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { InvestmentCard } from "@/components/investment-card";
import type { Platform, InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";
import { useMemo } from "react";

export default function PlatformDetails() {
  const { t } = useLanguage();
  const [, params] = useRoute("/platform/:id");
  const platformId = params?.id || "";

  const { data: platforms, isLoading: platformLoading } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  // Find the specific platform
  const platform = useMemo(() => {
    return platforms?.find(p => p.id === platformId);
  }, [platforms, platformId]);

  // Filter data for this platform
  const platformInvestments = useMemo(() => {
    return investments?.filter(inv => inv.platformId === platformId) || [];
  }, [investments, platformId]);

  const platformStats = useMemo(() => {
    if (!platformInvestments.length || !cashflows) {
      return null;
    }

    const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
    const platformCashflows = cashflows.filter(cf => platformInvestmentIds.has(cf.investmentId));

    const totalCapital = platformInvestments
      .filter(inv => inv.status === "active")
      .reduce((sum, inv) => sum + Number.parseFloat(String(inv.faceValue)), 0);

    const totalReturns = platformCashflows
      .filter(cf => cf.status === "received" && cf.type === "profit")
      .reduce((sum, cf) => sum + Number.parseFloat(String(cf.amount)), 0);

    const activeInvestments = platformInvestments.filter(inv => inv.status === "active");
    
    const totalIrr = activeInvestments.reduce(
      (sum, inv) => sum + Number.parseFloat(String(inv.expectedIrr)),
      0,
    );
    const averageIrr = activeInvestments.length > 0 ? totalIrr / activeInvestments.length : 0;

    const totalDuration = activeInvestments.reduce((sum, inv) => {
      if (!inv.startDate || !inv.endDate) return sum;
      const start = new Date(inv.startDate);
      const end = new Date(inv.endDate);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    const averageDuration = activeInvestments.length > 0 ? totalDuration / activeInvestments.length : 0;

    const distressedCount = platformInvestments.filter(inv => {
      if (inv.status !== "active" || !inv.endDate) return false;
      const now = new Date();
      const endDate = new Date(inv.endDate);
      const daysDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDelayed >= 90;
    }).length;

    const availableCash = platformCashflows
      .filter(cf => cf.status === "received" && cf.type === "profit")
      .reduce((sum, cf) => sum + Number.parseFloat(String(cf.amount)), 0);

    return {
      totalCapital,
      totalReturns,
      averageIrr,
      averageDuration,
      distressedCount,
      availableCash,
      activeCount: activeInvestments.length,
      completedCount: platformInvestments.filter(inv => inv.status === "completed").length,
      totalInvestments: platformInvestments.length,
    };
  }, [platformInvestments, cashflows]);

  if (platformLoading || investmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <PageHeader title="Platform Not Found" gradient>
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2 rtl:rotate-180" />
              {t("common.back")}
            </Button>
          </Link>
        </PageHeader>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{t("platform.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      key: "totalCapital",
      value: platformStats ? formatCurrency(platformStats.totalCapital) : "-",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "totalReturns",
      value: platformStats ? formatCurrency(platformStats.totalReturns) : "-",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      key: "averageIrr",
      value: platformStats ? formatPercentage(platformStats.averageIrr) : "-",
      icon: BarChart3,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      key: "activeInvestments",
      value: platformStats ? `${platformStats.activeCount}` : "-",
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-platform-details">
      <PageHeader title={platform.name} gradient>
        <Link href="/">
          <Button variant="ghost" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2 rtl:rotate-180" />
            {t("common.back")}
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key} className="hover-elevate transition-all duration-200" data-testid={`card-stat-${card.key}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground leading-snug break-words min-w-0">
                {t(`dashboard.${card.key}`)}
              </CardTitle>
              <div className={`${card.bgColor} ${card.color} rounded-lg p-2`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${card.key}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground leading-snug break-words min-w-0">
              {t("dashboard.averageDuration")}
            </CardTitle>
            <div className="bg-primary/10 text-primary rounded-lg p-2">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats ? `${Math.round(platformStats.averageDuration / 30)} ${t("dashboard.months")}` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.distressedCount")}
            </CardTitle>
            <div className={`${platformStats && platformStats.distressedCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted/10 text-muted-foreground"} rounded-lg p-2`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats ? `${platformStats.distressedCount}` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.completedInvestments")}
            </CardTitle>
            <div className="bg-chart-2/10 text-chart-2 rounded-lg p-2">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {platformStats ? `${platformStats.completedCount}` : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("platform.investments")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {platformInvestments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {t("platform.noInvestments")}
            </p>
          ) : (
            <div className="grid gap-4">
              {platformInvestments.map((investment) => (
                <InvestmentCard 
                  key={investment.id} 
                  investment={investment}
                  onEdit={() => {}} 
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
