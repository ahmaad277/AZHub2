import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-provider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShieldCheck, RefreshCw, Wrench } from "lucide-react";

interface DataQualityIssue {
  id: string;
  entityType: string;
  issueType: string;
  severity: "info" | "warning" | "error";
  message: string;
  suggestedFix?: string | null;
  status: "open" | "resolved" | "ignored";
}

export function DataQualityCenter() {
  const { t } = useLanguage();

  const { data: issues = [], isLoading } = useQuery<DataQualityIssue[]>({
    queryKey: ["/api/data-quality/issues"],
  });

  const scanMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/data-quality/scan", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality/issues"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("PATCH", `/api/data-quality/issues/${id}/resolve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality/issues"] });
    },
  });

  const applyFixMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/data-quality/issues/${id}/apply-fix`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-quality/issues"] });
    },
  });

  return (
    <Card className="shadcn-card" data-testid="card-data-quality-center">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-base leading-snug break-words">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <span>{t("dataQuality.title")}</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            data-testid="button-run-quality-scan"
          >
            <RefreshCw className={`ltr:mr-2 rtl:ml-2 h-4 w-4 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            {t("dataQuality.scan")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("dataQuality.loading")}</p>
        ) : issues.length === 0 ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            {t("dataQuality.noIssues")}
          </p>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="rounded-md border p-3" data-testid={`dq-issue-${issue.id}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <Badge variant={issue.severity === "error" ? "destructive" : "outline"}>{issue.severity}</Badge>
                <Badge variant="secondary">{issue.entityType}</Badge>
              </div>
              <p className="text-sm font-medium break-words leading-relaxed">{issue.message}</p>
              {issue.suggestedFix && (
                <p className="text-xs text-muted-foreground break-words leading-relaxed">{issue.suggestedFix}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate(issue.id)}
                  data-testid={`button-resolve-issue-${issue.id}`}
                >
                  {t("dataQuality.resolve")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyFixMutation.mutate(issue.id)}
                  data-testid={`button-apply-fix-${issue.id}`}
                >
                  <Wrench className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {t("dataQuality.applyFix")}
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
