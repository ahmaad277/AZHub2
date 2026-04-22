import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-provider";
import { QuickActionsHub } from "@/components/quick-actions-hub";
import { InvestmentDialog } from "@/components/investment-dialog";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { InvestmentDetailsDrawer } from "@/components/investment-details-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCashActions } from "@/hooks/use-cash-actions";
import { useInvestmentActions } from "@/hooks/use-investment-actions";
import { buildExecutiveReportPayload } from "@/lib/report-engine/builder";
import { exportExecutiveReportExcel } from "@/lib/report-engine/exporters/excel";
import { exportExecutiveReportPdf } from "@/lib/report-engine/exporters/pdf";
import type { CashflowWithInvestment, CashTransaction, InvestmentWithPlatform, Platform } from "@shared/schema";

const FinanceTimeline = lazy(() =>
  import("@/components/finance-timeline").then((module) => ({
    default: module.FinanceTimeline,
  })),
);
const DataQualityCenter = lazy(() =>
  import("@/components/data-quality-center").then((module) => ({
    default: module.DataQualityCenter,
  })),
);
const ImportCenter = lazy(() =>
  import("@/components/import-center").then((module) => ({
    default: module.ImportCenter,
  })),
);

export default function OperationsPage() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>();
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [addPaymentInvestmentId, setAddPaymentInvestmentId] = useState<string>("");

  const { data: investments = [] } = useQuery<InvestmentWithPlatform[]>({ queryKey: ["/api/investments"] });
  const { data: cashflows = [] } = useQuery<CashflowWithInvestment[]>({ queryKey: ["/api/cashflows"] });
  const { data: cashTransactions = [] } = useQuery<CashTransaction[]>({ queryKey: ["/api/cash/transactions"] });
  const { data: platforms = [] } = useQuery<Platform[]>({ queryKey: ["/api/platforms"] });

  const { generateAlerts } = useCashActions();
  const { checkStatuses } = useInvestmentActions();

  const addCashflowMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => apiRequest("POST", "/api/cashflows", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      setAddPaymentDialogOpen(false);
    },
  });

  const reportPayload = useMemo(
    () =>
      buildExecutiveReportPayload({
        investments,
        cashflows,
        platforms,
        cashTransactions,
      }),
    [investments, cashflows, platforms, cashTransactions],
  );

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-operations">
      <PageHeader title={t("operations.title")} gradient />

      <QuickActionsHub
        onAddInvestment={() => setInvestmentDialogOpen(true)}
        onAddPayment={() => {
          if (investments.length > 0) {
            setAddPaymentInvestmentId(investments[0].id);
            setAddPaymentDialogOpen(true);
          }
        }}
        onGenerateAlerts={() => generateAlerts.mutate()}
        onCheckStatuses={() => checkStatuses.mutate()}
      />

      <Tabs defaultValue="timeline" className="w-full" data-testid="tabs-operations">
        <TabsList className="flex h-auto w-full min-h-11 flex-wrap items-stretch justify-center gap-1 p-1 sm:overflow-x-auto sm:flex-nowrap sm:justify-start">
          <TabsTrigger className="min-h-9 min-w-0 flex-1 px-2 sm:min-w-[5.5rem] sm:flex-initial sm:px-3" value="timeline">
            {t("operations.tabTimeline")}
          </TabsTrigger>
          <TabsTrigger className="min-h-9 min-w-0 flex-1 px-2 sm:min-w-[5.5rem] sm:flex-initial sm:px-3" value="quality">
            {t("operations.tabQuality")}
          </TabsTrigger>
          <TabsTrigger className="min-h-9 min-w-0 flex-1 px-2 sm:min-w-[5.5rem] sm:flex-initial sm:px-3" value="reports">
            {t("operations.tabReports")}
          </TabsTrigger>
          <TabsTrigger className="min-h-9 min-w-0 flex-1 px-2 sm:min-w-[5.5rem] sm:flex-initial sm:px-3" value="import">
            {t("operations.tabImport")}
          </TabsTrigger>
          <TabsTrigger className="min-h-9 min-w-0 flex-1 px-2 sm:min-w-[5.5rem] sm:flex-initial sm:px-3" value="actions">
            {t("operations.tabActions")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
            <FinanceTimeline
              cashflows={cashflows}
              cashTransactions={cashTransactions}
              investments={investments}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              onOpenInvestmentDetails={setSelectedInvestment}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
            <DataQualityCenter />
          </Suspense>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="shadcn-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg leading-snug break-words">
                {t("operations.executiveReportsTitle")}
              </CardTitle>
              <CardDescription className="break-words leading-relaxed">
                {t("operations.executiveReportsDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                className="w-full sm:w-auto"
                onClick={() => void exportExecutiveReportExcel(reportPayload)}
                data-testid="button-export-executive-excel"
              >
                {t("operations.exportExcel")}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() =>
                  void exportExecutiveReportPdf(reportPayload, t("operations.executiveReportPdfTitle"))
                }
                data-testid="button-export-executive-pdf"
              >
                {t("operations.exportPdf")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted/40" />}>
            <ImportCenter />
          </Suspense>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <QuickActionsHub
            onAddInvestment={() => setInvestmentDialogOpen(true)}
            onAddPayment={() => {
              if (investments.length > 0) {
                setAddPaymentInvestmentId(investments[0].id);
                setAddPaymentDialogOpen(true);
              }
            }}
            onGenerateAlerts={() => generateAlerts.mutate()}
            onCheckStatuses={() => checkStatuses.mutate()}
          />
        </TabsContent>
      </Tabs>

      <InvestmentDialog open={investmentDialogOpen} onOpenChange={setInvestmentDialogOpen} />
      <AddPaymentDialog
        open={addPaymentDialogOpen}
        onOpenChange={setAddPaymentDialogOpen}
        investmentId={addPaymentInvestmentId}
        onSubmit={(data: any) => addCashflowMutation.mutate(data)}
        isPending={addCashflowMutation.isPending}
      />
      <InvestmentDetailsDrawer
        open={!!selectedInvestment}
        onOpenChange={(open) => {
          if (!open) setSelectedInvestment(null);
        }}
        investment={selectedInvestment}
        cashflows={selectedInvestment ? cashflows.filter((cf) => cf.investmentId === selectedInvestment.id) : []}
      />
    </div>
  );
}
