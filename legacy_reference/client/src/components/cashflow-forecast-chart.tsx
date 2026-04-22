import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import type { MonthlyForecast } from "@shared/cashflow-forecast";
import { TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface CashflowForecastChartProps {
  data: MonthlyForecast[];
  months?: number;
}

export function CashflowForecastChart({ data, months = 40 }: CashflowForecastChartProps) {
  const { t } = useLanguage();
  
  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Take only the requested number of months
  const chartData = data.slice(0, months);

  // Guard against empty datasets
  if (chartData.length === 0) {
    return (
      <Card data-testid="card-cashflow-forecast">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-2" />
            {t("forecast.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            {t("forecast.noData") || "No forecast data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic height based on number of rows (32px per row)
  const baseRowHeight = 32;
  const minChartHeight = 400;
  const chartHeight = Math.max(chartData.length * baseRowHeight, minChartHeight);
  
  // Mobile label alignment: account for padding/margins (10px top + 10px bottom)
  const mobilePadding = 20;
  const effectiveRowHeight = (chartHeight - mobilePadding) / chartData.length;
  
  // Responsive chart configuration
  const chartConfig = useMemo(() => {
    // Calculate max value from data for dynamic domain
    const maxValue = Math.max(
      ...chartData.map(d => (d.principal || 0) + (d.profit || 0)),
      1
    );
    
    // Adaptive rounding for domain - smaller steps for tighter fit
    let roundingStep = 100;
    if (maxValue >= 100000) roundingStep = 5000;
    else if (maxValue >= 10000) roundingStep = 1000;
    else if (maxValue >= 5000) roundingStep = 500;
    else if (maxValue >= 1000) roundingStep = 100;
    else roundingStep = 50;
    
    // Tighter domain - only 5% headroom instead of 15%
    const domain = [0, Math.ceil(maxValue * 1.05 / roundingStep) * roundingStep];
    
    if (isMobile) {
      return {
        yAxisWidth: 95,
        margins: { top: 10, right: 8, left: 0, bottom: 10 },
        tickFontSize: 11,
        barSize: 12,
        barCategoryGap: 4,
        tickDx: -16,
        domain,
      };
    }
    
    return {
      yAxisWidth: 100,
      margins: { top: 10, right: 20, left: 0, bottom: 10 },
      tickFontSize: 10,
      barSize: 16,
      barCategoryGap: 10,
      tickDx: 0,
      domain,
    };
  }, [isMobile, chartData]);

  // Calculate average value for reference line
  const averageValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + (d.principal || 0) + (d.profit || 0), 0);
    return total / chartData.length;
  }, [chartData]);

  // Format large numbers compactly (K, M)
  const formatCompact = (value: number): string => {
    if (value === 0) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Custom label for bars - show value only if bar is wide enough
  const CustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    // Only show label if bar width is at least 40px
    if (width < 40 || value === 0) return null;
    
    const formattedValue = formatCompact(value);
    
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="600"
      >
        {formattedValue}
      </text>
    );
  };

  // Custom tooltip to show formatted values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const principal = payload.find((p: any) => p.dataKey === "principal")?.value || 0;
      const profit = payload.find((p: any) => p.dataKey === "profit")?.value || 0;
      
      return (
        <Card className="p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.monthLabel}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                {t("forecast.principal")}
              </span>
              <span className="font-semibold">{formatCurrency(principal, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-3))" }} />
                {t("forecast.profit")}
              </span>
              <span className="font-semibold">{formatCurrency(profit, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="font-semibold">{t("forecast.total")}</span>
              <span className="font-bold">{formatCurrency(principal + profit, "SAR")}</span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Format tick values for X-axis (horizontal)
  const formatXAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <Card data-testid="card-cashflow-forecast">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-4 ${isMobile ? 'px-4' : ''}`}>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-chart-2" />
          {t("forecast.title")}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {t("forecast.next")} {months} {t("forecast.months")}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isMobile ? (
          <div className="flex -mx-6">
            {/* Left column: HTML month labels */}
            <div className="flex flex-col" style={{ width: '90px', height: `${chartHeight}px`, paddingTop: '10px', paddingBottom: '10px', paddingInlineStart: '20px' }}>
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center text-foreground font-medium"
                  style={{ 
                    height: `${effectiveRowHeight}px`,
                    fontSize: '11px',
                    lineHeight: '1'
                  }}
                  data-testid={`label-month-${index}`}
                >
                  {item.monthLabel}
                </div>
              ))}
            </div>
            
            {/* Right column: Chart without Y-axis labels */}
            <div className="flex-1" style={{ minWidth: 0, height: `${chartHeight}px` }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 8, left: 40, bottom: 10 }}
                  barCategoryGap={chartConfig.barCategoryGap}
                  barSize={chartConfig.barSize}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <ReferenceLine 
                    x={averageValue} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5" 
                    strokeWidth={1}
                    label={{ value: `${t("forecast.average") || "Avg"}: ${formatXAxis(averageValue)}`, position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <XAxis
                    type="number"
                    domain={chartConfig.domain}
                    reversed={true}
                    tickFormatter={formatXAxis}
                    tick={{ fontSize: chartConfig.tickFontSize }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    type="category"
                    dataKey="monthLabel"
                    width={0}
                    tick={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
                  <Legend
                    wrapperStyle={{ paddingTop: "8px" }}
                    formatter={(value) => {
                      if (value === "principal") return t("forecast.principal");
                      if (value === "profit") return t("forecast.profit");
                      return value;
                    }}
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div className="flex justify-center gap-4 pt-2 text-sm">
                          {payload?.map((entry: any, index: number) => (
                            <span key={index} style={{ color: entry.color }}>
                              {entry.value === "principal" ? t("forecast.principal") : t("forecast.profit")}
                            </span>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="principal"
                    stackId="a"
                    fill="hsl(var(--chart-1))"
                    name="principal"
                    data-testid="bar-principal"
                  >
                    <LabelList content={<CustomLabel />} />
                  </Bar>
                  <Bar
                    dataKey="profit"
                    stackId="a"
                    fill="hsl(var(--chart-3))"
                    name="profit"
                    data-testid="bar-profit"
                  >
                    <LabelList content={<CustomLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={chartConfig.margins}
                barCategoryGap={chartConfig.barCategoryGap}
                barSize={chartConfig.barSize}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <ReferenceLine 
                  x={averageValue} 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeDasharray="5 5" 
                  strokeWidth={1}
                  label={{ value: `${t("forecast.average") || "Avg"}: ${formatXAxis(averageValue)}`, position: 'top', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <XAxis
                  type="number"
                  domain={chartConfig.domain}
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: chartConfig.tickFontSize }}
                  className="text-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="monthLabel"
                  width={chartConfig.yAxisWidth}
                  tick={{ 
                    fontSize: chartConfig.tickFontSize, 
                    dx: chartConfig.tickDx, 
                    textAnchor: "start", 
                    fill: "hsl(var(--foreground))",
                    fontWeight: 400
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
                <Legend
                  wrapperStyle={{ paddingTop: "8px" }}
                  content={(props) => {
                    const { payload } = props;
                    return (
                      <div className="flex justify-center gap-4 pt-2 text-sm">
                        {payload?.map((entry: any, index: number) => (
                          <span key={index} style={{ color: entry.color }}>
                            {entry.value === "principal" ? t("forecast.principal") : t("forecast.profit")}
                          </span>
                        ))}
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="principal"
                  stackId="a"
                  fill="hsl(var(--chart-1))"
                  name="principal"
                  data-testid="bar-principal"
                >
                  <LabelList content={<CustomLabel />} />
                </Bar>
                <Bar
                  dataKey="profit"
                  stackId="a"
                  fill="hsl(var(--chart-3))"
                  name="profit"
                  data-testid="bar-profit"
                >
                  <LabelList content={<CustomLabel />} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
