import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, FileSpreadsheet, FileText, Calendar, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform, CashTransaction } from "@shared/schema";
import { calculateDashboardMetrics, formatCurrency, formatPercentage } from "@/lib/dashboardMetrics";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { buildExecutiveReportPayload } from "@/lib/report-engine/builder";
import { exportExecutiveReportExcel } from "@/lib/report-engine/exporters/excel";
import { exportExecutiveReportPdf } from "@/lib/report-engine/exporters/pdf";

export default function Reports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Fetch data
  const { data: investments = [] } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows = [] } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const { data: cashTransactions = [] } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  // Report configuration
  const [reportType, setReportType] = useState<"summary" | "detailed" | "custom">("summary");
  const [dateRange, setDateRange] = useState<"all" | "ytd" | "lastYear" | "lastQuarter" | "lastMonth">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">(language as "en" | "ar");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [includeCashflows, setIncludeCashflows] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => {
    let filteredInvestments = investments;
    
    // Filter by platform
    if (platformFilter !== "all") {
      filteredInvestments = filteredInvestments.filter(inv => inv.platformId === platformFilter);
    }

    // Filter by date range
    const now = new Date();
    let dateRangeFilter: { start: Date; end: Date } | undefined;

    if (dateRange === "ytd") {
      dateRangeFilter = {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      };
    } else if (dateRange === "lastYear") {
      dateRangeFilter = {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31)
      };
    } else if (dateRange === "lastQuarter") {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      dateRangeFilter = { start: quarterStart, end: quarterEnd };
    } else if (dateRange === "lastMonth") {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      dateRangeFilter = { start: monthStart, end: monthEnd };
    }

    return calculateDashboardMetrics(
      filteredInvestments,
      cashTransactions,
      platforms,
      cashflows,
      dateRangeFilter
    );
  }, [investments, cashflows, platforms, cashTransactions, platformFilter, dateRange]);

  const executivePayload = useMemo(
    () =>
      buildExecutiveReportPayload({
        investments,
        cashflows,
        platforms,
        cashTransactions,
      }),
    [investments, cashflows, platforms, cashTransactions],
  );

  const exportToExcel = async () => {
    await exportExecutiveReportExcel(executivePayload);
    toast({
      title: t("reports.toast.exportedTitle"),
      description: t("reports.toast.executiveExcelDone"),
    });
  };

  const exportToPDF = async () => {
    await exportExecutiveReportPdf(
      executivePayload,
      t("reports.executiveReportTitle", reportLanguage),
    );
    toast({
      title: t("reports.toast.exportedTitle"),
      description: t("reports.toast.executivePdfDone"),
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5" data-testid="page-reports">
      {/* Page Header */}
      <PageHeader title={t("reports.title")} gradient />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1 shadcn-card">
          <CardHeader>
            <CardTitle data-testid="heading-report-config">
              {t("reports.configTitle")}
            </CardTitle>
            <CardDescription>
              {t("reports.configDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Report Type */}
            <div className="space-y-1.5">
              <Label>{t("reports.reportType")}</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">
                    {t("reports.typeSummary")}
                  </SelectItem>
                  <SelectItem value="detailed">
                    {t("reports.typeDetailed")}
                  </SelectItem>
                  <SelectItem value="custom">
                    {t("reports.typeCustom")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <Label>{t("reports.dateRange")}</Label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.drAll")}</SelectItem>
                  <SelectItem value="ytd">{t("reports.drYtd")}</SelectItem>
                  <SelectItem value="lastYear">{t("reports.drLastYear")}</SelectItem>
                  <SelectItem value="lastQuarter">{t("reports.drLastQuarter")}</SelectItem>
                  <SelectItem value="lastMonth">{t("reports.drLastMonth")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="space-y-1.5">
              <Label>{t("reports.platform")}</Label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger data-testid="select-platform-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("reports.allPlatforms")}</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report Language */}
            <div className="space-y-1.5">
              <Label>{t("reports.reportLanguage")}</Label>
              <Select value={reportLanguage} onValueChange={(v: "en" | "ar") => setReportLanguage(v)}>
                <SelectTrigger data-testid="select-report-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("reports.langEnglish")}</SelectItem>
                  <SelectItem value="ar">{t("reports.langArabic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Include Options */}
            <div className="space-y-2.5">
              <Label className="text-base">{t("reports.includeInReport")}</Label>
              
              <div className="flex items-center gap-2 min-w-0">
                <Checkbox 
                  id="include-metrics" 
                  checked={includeMetrics}
                  onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
                  data-testid="checkbox-include-metrics"
                />
                <Label htmlFor="include-metrics" className="cursor-pointer font-normal">
                  {t("reports.includeMetrics")}
                </Label>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <Checkbox 
                  id="include-investments" 
                  checked={includeInvestments}
                  onCheckedChange={(checked) => setIncludeInvestments(checked as boolean)}
                  data-testid="checkbox-include-investments"
                />
                <Label htmlFor="include-investments" className="cursor-pointer font-normal">
                  {t("reports.includeInvestments")}
                </Label>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <Checkbox 
                  id="include-cashflows" 
                  checked={includeCashflows}
                  onCheckedChange={(checked) => setIncludeCashflows(checked as boolean)}
                  data-testid="checkbox-include-cashflows"
                />
                <Label htmlFor="include-cashflows" className="cursor-pointer font-normal">
                  {t("reports.includeCashflows")}
                </Label>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <Checkbox 
                  id="include-charts" 
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  data-testid="checkbox-include-charts"
                />
                <Label htmlFor="include-charts" className="cursor-pointer font-normal">
                  {t("reports.includeCharts")}
                </Label>
              </div>
            </div>

            <Separator />

            {/* Export Buttons */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => void exportToExcel()}
                disabled={!metrics}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("reports.exportExcel")}
              </Button>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => void exportToPDF()}
                disabled={!metrics}
                data-testid="button-export-pdf"
              >
                <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("reports.exportPdf")}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void exportExecutiveReportExcel(executivePayload)}
                data-testid="button-export-executive-excel"
              >
                <FileDown className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("reports.executiveExcel")}
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  void exportExecutiveReportPdf(executivePayload, t("reports.executiveReportTitle", reportLanguage))
                }
                data-testid="button-export-executive-pdf"
              >
                <FileDown className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("reports.executivePdf")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadcn-card">
            <CardHeader>
              <CardTitle data-testid="heading-report-preview">
                {t("reports.previewTitle")}
              </CardTitle>
              <CardDescription>
                {t("reports.previewDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("reports.loadingData")}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Portfolio Summary */}
                  {includeMetrics && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {t("reports.portfolioSummary")}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.portfolioValue")}
                          </div>
                          <div className="text-xl font-bold">
                            {formatCurrency(metrics.portfolioValue)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.totalCash")}
                          </div>
                          <div className="text-xl font-bold text-chart-2">
                            {formatCurrency(metrics.totalCash)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.cashRatio")}
                          </div>
                          <div className="text-xl font-bold">
                            {formatPercentage(metrics.cashRatio)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.activeApr")}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.activeAPR)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.histApr")}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.weightedAPR)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {t("reports.roi")}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.portfolioROI)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {t("reports.statusLive")}
                          </div>
                          <div className="text-lg font-bold text-chart-2">
                            {metrics.liveInvestmentsCount}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">
                            {t("reports.statusCompleted")}
                          </div>
                          <div className="text-lg font-bold">
                            {metrics.completedInvestments}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {t("reports.statusLate")}
                          </div>
                          <div className="text-lg font-bold text-yellow-600">
                            {metrics.lateInvestments}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {t("reports.statusDefaulted")}
                          </div>
                          <div className="text-lg font-bold text-destructive">
                            {metrics.defaultedInvestments}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platform Distribution */}
                  {metrics.platformDistribution.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {t("reports.platformDistribution")}
                      </h3>
                      
                      <div className="space-y-1.5">
                        {metrics.platformDistribution.map((platform) => (
                          <div 
                            key={platform.platformId}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{platform.platformName}</div>
                              <div className="text-sm text-muted-foreground">
                                {t("reports.investmentLine", { count: platform.count })}
                              </div>
                            </div>
                            <div className="text-end">
                              <div className="font-bold">{formatCurrency(platform.value)}</div>
                              <Badge variant="outline" className="mt-1">
                                {formatPercentage(platform.percentage)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Summary */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{investments.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("reports.summaryInvestments")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{cashflows.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("reports.summaryCashflows")}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{platforms.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("reports.summaryPlatforms")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
