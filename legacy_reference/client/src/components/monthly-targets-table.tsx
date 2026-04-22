import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Pencil, Save, X, Trash2, Calculator } from "lucide-react";
import type { MonthlyProgress } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";

interface MonthlyTargetsTableProps {
  startDate?: Date;
  endDate?: Date;
  targetValue?: number;
  currentValue?: number;
  onGenerateTargets?: () => void;
}

export function MonthlyTargetsTable({
  startDate,
  endDate,
  targetValue,
  currentValue,
  onGenerateTargets,
}: MonthlyTargetsTableProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Translate source values
  const translateSource = (source: string | null | undefined): string => {
    if (!source) return "-";
    switch (source) {
      case "manual":
        return t("vision2040.sourceManual");
      case "generated":
        return t("vision2040.sourceGenerated");
      case "auto":
        return t("vision2040.sourceAuto");
      default:
        return source;
    }
  };
  const [editValues, setEditValues] = useState<{
    targetValue: string;
    actualValue: string;
  }>({ targetValue: "", actualValue: "" });

  // Fetch monthly progress data (targets + actuals)
  const { data: monthlyProgress = [], isLoading } = useQuery<MonthlyProgress[]>({
    queryKey: ["/api/monthly-progress", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate.toISOString());
      if (endDate) params.append("endDate", endDate.toISOString());
      
      const response = await fetch(`/api/monthly-progress${params.toString() ? `?${params}` : ""}`);
      if (!response.ok) throw new Error(t("vision2040.fetchError"));
      return response.json();
    },
  });

  // Update portfolio history (actual value)
  const updateActualMutation = useMutation({
    mutationFn: async (data: { month: Date; totalValue: number }) => {
      const response = await apiRequest("PUT", "/api/portfolio-history", {
        month: data.month.toISOString(),
        totalValue: data.totalValue,
        source: "manual",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-history"] });
      toast({
        title: t("vision2040.success"),
        description: t("vision2040.dataUpdated"),
      });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: t("vision2040.error"),
        description: t("vision2040.updateFailed"),
        variant: "destructive",
      });
    },
  });

  // Update vision target (target value)
  const updateTargetMutation = useMutation({
    mutationFn: async (data: { month: Date; targetValue: number }) => {
      const response = await apiRequest("PUT", "/api/vision-targets", {
        month: data.month.toISOString(),
        targetValue: data.targetValue,
        generated: 0, // Mark as manual
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-targets"] });
      toast({
        title: t("vision2040.success"),
        description: t("vision2040.dataUpdated"),
      });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: t("vision2040.error"),
        description: t("vision2040.updateFailed"),
        variant: "destructive",
      });
    },
  });

  // Delete entry
  const deleteMutation = useMutation({
    mutationFn: async (month: Date) => {
      // Delete both target and actual for the month
      const promises = [];
      
      // Find and delete portfolio history entry
      const historyResponse = await fetch(`/api/portfolio-history?startDate=${month.toISOString()}&endDate=${month.toISOString()}`);
      if (historyResponse.ok) {
        const history = await historyResponse.json();
        if (history.length > 0) {
          promises.push(
            apiRequest("DELETE", `/api/portfolio-history/${history[0].id}`)
          );
        }
      }
      
      // Find and delete vision target entry
      const targetResponse = await fetch(`/api/vision-targets?startDate=${month.toISOString()}&endDate=${month.toISOString()}`);
      if (targetResponse.ok) {
        const targets = await targetResponse.json();
        if (targets.length > 0) {
          promises.push(
            apiRequest("DELETE", `/api/vision-targets/${targets[0].id}`)
          );
        }
      }
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monthly-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vision-targets"] });
      toast({
        title: t("vision2040.success"),
        description: t("vision2040.dataUpdated"),
      });
    },
    onError: () => {
      toast({
        title: t("vision2040.error"),
        description: t("vision2040.updateFailed"),
        variant: "destructive",
      });
    },
  });

  const handleEdit = (row: MonthlyProgress) => {
    const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
    const monthKey = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, "0")}`;
    setEditingId(monthKey);
    setEditValues({
      targetValue: row.targetValue?.toString() || "",
      actualValue: row.actualValue?.toString() || "",
    });
  };

  const handleSave = async (row: MonthlyProgress) => {
    const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
    const promises = [];
    
    // Update target if changed
    if (editValues.targetValue && editValues.targetValue !== row.targetValue?.toString()) {
      promises.push(
        updateTargetMutation.mutateAsync({
          month: monthDate,
          targetValue: parseFloat(editValues.targetValue),
        })
      );
    }
    
    // Update actual if changed
    if (editValues.actualValue && editValues.actualValue !== row.actualValue?.toString()) {
      promises.push(
        updateActualMutation.mutateAsync({
          month: monthDate,
          totalValue: parseFloat(editValues.actualValue),
        })
      );
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    } else {
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ targetValue: "", actualValue: "" });
  };

  const handleDelete = (row: MonthlyProgress) => {
    if (window.confirm(t("vision2040.deleteConfirm"))) {
      const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
      deleteMutation.mutate(monthDate);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {t("vision2040.monthlyTargetsProgress")}
          </CardTitle>
          <CardDescription>
            {t("vision2040.trackProgress")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t("vision2040.monthlyTargetsProgress")}
            </CardTitle>
            <CardDescription>
              {t("vision2040.trackProgress")}
            </CardDescription>
          </div>
          {onGenerateTargets && (
            <Button
              onClick={onGenerateTargets}
              variant="outline"
              size="sm"
              data-testid="button-generate-targets"
            >
              <Calculator className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {t("vision2040.generateTargets")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("vision2040.date")}</TableHead>
                <TableHead className="text-end">{t("vision2040.targetValue")}</TableHead>
                <TableHead className="text-end">{t("vision2040.actualColumn")}</TableHead>
                <TableHead className="text-end">{t("vision2040.latestVariance")}</TableHead>
                <TableHead>{t("common.source")}</TableHead>
                <TableHead className="text-center">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyProgress.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("vision2040.noDataMessage")}
                  </TableCell>
                </TableRow>
              ) : (
                monthlyProgress.map((row) => {
                  // Ensure month is a Date object
                  const monthDate = row.month instanceof Date ? row.month : new Date(row.month);
                  const monthKey = `${monthDate.getFullYear()}-${(monthDate.getMonth() + 1).toString().padStart(2, "0")}`;
                  const isEditing = editingId === monthKey;
                  const variance = row.variance || 0;
                  const variancePercent = row.variancePercent || 0;
                  
                  return (
                    <TableRow key={monthKey} data-testid={`row-progress-${monthKey}`}>
                      <TableCell className="font-medium">
                        {format(monthDate, "MM/dd/yyyy")}
                      </TableCell>
                      <TableCell className="text-end">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.targetValue}
                            onChange={(e) =>
                              setEditValues({ ...editValues, targetValue: e.target.value })
                            }
                            className="w-32 text-end"
                            data-testid={`input-target-${monthKey}`}
                          />
                        ) : (
                          <span className="text-blue-600 dark:text-blue-400">
                            {row.targetValue ? formatCurrency(row.targetValue) : "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editValues.actualValue}
                            onChange={(e) =>
                              setEditValues({ ...editValues, actualValue: e.target.value })
                            }
                            className="w-32 text-end"
                            data-testid={`input-actual-${monthKey}`}
                          />
                        ) : (
                          <span className="text-orange-600 dark:text-orange-400">
                            {row.actualValue ? formatCurrency(row.actualValue) : "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        {row.variance !== null ? (
                          <div className="space-y-1">
                            <div
                              className={
                                variance >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {variance >= 0 ? "+" : ""}
                              {formatCurrency(variance)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({variancePercent >= 0 ? "+" : ""}
                              {variancePercent.toFixed(1)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {row.targetSource && (
                            <Badge
                              variant={row.targetSource === "manual" ? "default" : "secondary"}
                              className="text-xs"
                              data-testid={`badge-target-source-${monthKey}`}
                            >
                              {translateSource(row.targetSource)}
                            </Badge>
                          )}
                          {row.actualSource && (
                            <Badge
                              variant={row.actualSource === "manual" ? "default" : "outline"}
                              className="text-xs"
                              data-testid={`badge-actual-source-${monthKey}`}
                            >
                              {translateSource(row.actualSource)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(row)}
                              disabled={
                                updateTargetMutation.isPending ||
                                updateActualMutation.isPending
                              }
                              data-testid={`button-save-${monthKey}`}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              disabled={
                                updateTargetMutation.isPending ||
                                updateActualMutation.isPending
                              }
                              data-testid={`button-cancel-${monthKey}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(row)}
                              data-testid={`button-edit-${monthKey}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(row)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${monthKey}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}