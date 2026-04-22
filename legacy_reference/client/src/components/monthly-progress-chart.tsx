import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  TooltipProps,
} from "recharts";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Target } from "lucide-react";
import type { MonthlyProgress } from "@shared/schema";
import { useLanguage } from "@/lib/language-provider";

interface MonthlyProgressChartProps {
  startDate?: Date;
  endDate?: Date;
  height?: number;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  const { t } = useLanguage();
  
  if (active && payload && payload.length) {
    const target = payload.find(p => p.dataKey === 'targetValue');
    const actual = payload.find(p => p.dataKey === 'actualValue');
    
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-2">
          {label}
        </p>
        {target && target.value !== null && (
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {t("vision2040.targetValue")}: {formatCurrency(target.value as number)}
          </p>
        )}
        {actual && actual.value !== null && (
          <p className="text-sm text-orange-600 dark:text-orange-400">
            {t("vision2040.actualColumn")}: {formatCurrency(actual.value as number)}
          </p>
        )}
        {target?.value && actual?.value && (
          <p className="text-xs mt-1 text-muted-foreground">
            {t("vision2040.latestVariance")}: {formatCurrency((actual.value as number) - (target.value as number))}
            {' '}({((((actual.value as number) - (target.value as number)) / (target.value as number)) * 100).toFixed(1)}%)
          </p>
        )}
      </div>
    );
  }

  return null;
}

export function MonthlyProgressChart({
  startDate,
  endDate,
  height = 340,
}: MonthlyProgressChartProps) {
  const { t, language } = useLanguage();
  const locale = language === "ar" ? arSA : enUS;
  
  // Fetch monthly progress data
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

  // Transform data for chart
  const chartData = useMemo(() => {
    return monthlyProgress.map(entry => {
      // Ensure month is a Date object
      const monthDate = entry.month instanceof Date ? entry.month : new Date(entry.month);
      return {
        month: format(monthDate, "MMM yyyy", { locale }),
        targetValue: entry.targetValue || null,
        actualValue: entry.actualValue || null,
        variance: entry.variance || null,
      };
    });
  }, [monthlyProgress, locale]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const hasTargets = monthlyProgress.some(p => p.targetValue !== null);
    const hasActuals = monthlyProgress.some(p => p.actualValue !== null);
    
    const latestWithBoth = [...monthlyProgress]
      .reverse()
      .find(p => p.targetValue !== null && p.actualValue !== null);
    
    const avgVariance = monthlyProgress
      .filter(p => p.variance !== null)
      .reduce((sum, p) => sum + (p.variance || 0), 0) / 
      monthlyProgress.filter(p => p.variance !== null).length || 0;
    
    return {
      hasData: hasTargets || hasActuals,
      hasTargets,
      hasActuals,
      latestVariance: latestWithBoth?.variance || null,
      latestVariancePercent: latestWithBoth?.variancePercent || null,
      avgVariance,
      totalEntries: monthlyProgress.length,
    };
  }, [monthlyProgress]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("vision2040.progressTowardsVision")}
          </CardTitle>
          <CardDescription>{t("vision2040.trackProgress")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (!stats.hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("vision2040.progressTowardsVision")}
          </CardTitle>
          <CardDescription>
            {t("vision2040.noData")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height: height / 2 }}>
          <div className="text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("vision2040.noData")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("vision2040.progressTowardsVision")}
            </CardTitle>
            <CardDescription>
              {t("vision2040.monthlyTargetsVsActual")}
            </CardDescription>
          </div>
          {stats.latestVariance !== null && (
            <div className="text-end">
              <p className="text-xs text-muted-foreground">{t("vision2040.latestVariance")}</p>
              <p className={`text-lg font-semibold ${
                stats.latestVariance >= 0 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {stats.latestVariance >= 0 ? "+" : ""}
                {formatCurrency(stats.latestVariance)}
              </p>
              {stats.latestVariancePercent !== null && (
                <p className="text-xs text-muted-foreground">
                  ({stats.latestVariancePercent >= 0 ? "+" : ""}
                  {stats.latestVariancePercent.toFixed(1)}%)
                </p>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 2 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 11 }}
              angle={-35}
              textAnchor="end"
              height={48}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: "0.5rem" }}
              iconType="line"
            />
            {stats.hasTargets && (
              <Line
                type="monotone"
                dataKey="targetValue"
                name={t("vision2040.targetValue")}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            )}
            {stats.hasActuals && (
              <Line
                type="monotone"
                dataKey="actualValue"
                name={t("vision2040.actualColumn")}
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Entries</p>
            <p className="text-lg font-semibold">{stats.totalEntries}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Variance</p>
            <p className={`text-lg font-semibold ${
              stats.avgVariance >= 0 
                ? "text-green-600 dark:text-green-400" 
                : "text-red-600 dark:text-red-400"
            }`}>
              {stats.avgVariance >= 0 ? "+" : ""}
              {formatCurrency(stats.avgVariance)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Data Coverage</p>
            <div className="flex justify-center gap-2 mt-1">
              {stats.hasTargets && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">
                  Targets
                </span>
              )}
              {stats.hasActuals && (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs">
                  Actuals
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}