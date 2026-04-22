import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Bell, CheckCircle2, AlertTriangle, Info, TrendingUp, Check, RefreshCw } from "lucide-react";
import type { Alert } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/ui/view-states";

export default function Alerts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const {
    data: alerts,
    isLoading,
    error,
    refetch,
  } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/alerts/generate", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      
      if (data.generatedCount > 0) {
        toast({
          title: t("alerts.toast.generatedTitle"),
          description: t("alerts.toast.generatedDesc", { count: data.generatedCount }),
        });
      } else {
        toast({
          title: t("alerts.toast.noNewTitle"),
          description: t("alerts.toast.noNewDesc"),
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("alerts.toast.generateFailed"),
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === "error") return AlertTriangle;
    if (severity === "success") return CheckCircle2;
    if (type === "distribution") return TrendingUp;
    return Info;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "text-chart-2 bg-chart-2/10";
      case "warning":
        return "text-destructive bg-destructive/10";
      case "error":
        return "text-destructive bg-destructive/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      success: "bg-chart-2/10 text-chart-2",
      warning: "bg-destructive/10 text-destructive",
      error: "bg-destructive/10 text-destructive",
      info: "bg-primary/10 text-primary",
    };

    return (
      <Badge className={colors[severity] || colors.info} variant="outline" data-testid={`badge-severity-${severity}`}>
        {t(`alerts.${severity}`)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <PageLoadingState
        title={t("alerts.pageLoadingTitle")}
        description={t("alerts.pageLoadingDesc")}
        rows={5}
        data-testid="state-loading-alerts"
      />
    );
  }

  if (error) {
    return (
      <PageErrorState
        title={t("alerts.pageErrorTitle")}
        description={error instanceof Error ? error.message : t("common.unexpectedError")}
        retryLabel={t("common.tryAgain")}
        onRetry={() => {
          void refetch();
        }}
        data-testid="state-error-alerts"
      />
    );
  }

  const unreadCount = alerts?.filter((a: Alert) => !a.read).length || 0;

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-alerts">
      <PageHeader title={t("alerts.title")} gradient>
        <Button
          onClick={() => generateAlertsMutation.mutate()}
          disabled={generateAlertsMutation.isPending}
          variant="outline"
          size="sm"
          className="shrink-0"
          data-testid="button-generate-alerts"
        >
          <RefreshCw className={`h-4 w-4 ltr:mr-2 rtl:ml-2 ${generateAlertsMutation.isPending ? 'animate-spin' : ''}`} />
          {t("alerts.refreshAlerts")}
        </Button>
        {unreadCount > 0 && (
          <Badge className="bg-destructive/10 text-destructive text-sm sm:text-base px-2.5 sm:px-3 py-1 shrink-0 whitespace-normal text-center max-w-[min(100%,20rem)] leading-snug" data-testid="badge-unread-count">
            {t("alerts.unread").replace("{0}", unreadCount.toString())}
          </Badge>
        )}
      </PageHeader>

      <Card data-testid="card-alerts">
        <CardContent>
          {alerts && alerts.length === 0 ? (
            <PageEmptyState
              title={t("alerts.noAlertsYet")}
              description={t("alerts.noAlertsDesc")}
              icon={Bell}
              className="border-0 shadow-none"
              data-testid="empty-state-alerts"
            />
          ) : (
            <div className="divide-y -mx-6">
              {alerts?.map((alert: Alert) => {
                const Icon = getAlertIcon(alert.type, alert.severity);
                const colorClass = getAlertColor(alert.severity);

                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col gap-3 sm:flex-row sm:gap-4 p-4 sm:p-5 hover-elevate transition-colors ${
                      !alert.read ? "bg-primary/5" : ""
                    }`}
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className={`${colorClass} rounded-full p-3 h-fit w-fit shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-base leading-snug break-words">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1.5 break-words leading-relaxed">{alert.message}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
                          {getSeverityBadge(alert.severity)}
                          {!alert.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsReadMutation.mutate(alert.id)}
                              data-testid={`button-mark-read-${alert.id}`}
                            >
                              <Check className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                              {t("alerts.markAsRead")}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDate(alert.createdAt)}</span>
                        <span aria-hidden>•</span>
                        <Badge variant="outline" className="capitalize" data-testid={`badge-type-${alert.type}`}>
                          {t(`alerts.${alert.type}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
