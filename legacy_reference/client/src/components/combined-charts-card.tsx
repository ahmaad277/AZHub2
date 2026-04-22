import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency } from "@/lib/utils";
import { getPlatformChartColor } from "@/lib/platform-colors";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface CombinedChartsCardProps {
  metrics: DashboardMetrics;
}

const STATUS_COLORS = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  pending: "hsl(var(--chart-3))",
  late: "hsl(var(--chart-4))",
  defaulted: "hsl(var(--destructive))",
};

// Fallback colors for unmapped platforms (cycle through these)
const FALLBACK_PLATFORM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DEFAULT_PLATFORM_COLOR = "hsl(var(--primary))";

export function CombinedChartsCard({ metrics }: CombinedChartsCardProps) {
  const { t } = useLanguage();
  const [showStatusPercentage, setShowStatusPercentage] = useState(true);
  const [showPlatformPercentage, setShowPlatformPercentage] = useState(true);

  // Calculate raw sum from original metrics (pre-filter) to catch all-zero scenarios
  const rawStatusSum = metrics.statusDistribution.active +
                       metrics.statusDistribution.completed +
                       metrics.statusDistribution.pending +
                       metrics.statusDistribution.late +
                       metrics.statusDistribution.defaulted;

  const statusData = [
    {
      name: 'نشط',
      value: metrics.statusDistribution.active,
      color: STATUS_COLORS.active,
    },
    {
      name: 'مكتمل',
      value: metrics.statusDistribution.completed,
      color: STATUS_COLORS.completed,
    },
    {
      name: 'متأخر/متعثر',
      value: metrics.statusDistribution.late + metrics.statusDistribution.defaulted,
      color: 'hsl(var(--destructive))',
    },
  ].filter(item => item.value > 0);

  // Use platformDistributionAll for default view (all investments by value)
  const platformData = metrics.platformDistributionAll.map((platform, index) => {
    // Get platform-specific color, fallback to rotating palette for unknown platforms
    const platformColor = getPlatformChartColor(platform.platformName);
    const color = platformColor !== DEFAULT_PLATFORM_COLOR 
      ? platformColor 
      : FALLBACK_PLATFORM_COLORS[index % FALLBACK_PLATFORM_COLORS.length];
    
    return {
      name: platform.platformName,
      value: platform.value,
      count: platform.count,
      percentage: platform.percentage,
      color,
    };
  }).filter(item => item.value > 0);

  const statusTotal = metrics.totalInvestments;

  // Custom labelLine renderer for status chart - only show lines for small slices
  const renderStatusLabelLine = (props: any) => {
    const { payload, points, percent } = props;
    // Use Recharts percent (0-1 range) to match renderStatusLabel logic
    const pct = (percent || 0) * 100;
    
    // Only render connector line for small slices (<15%)
    if (pct > 15) {
      return <></>;
    }
    
    // Convert points array to proper SVG points string
    if (!points || points.length === 0) return <></>;
    const pointsString = points.map((p: any) => `${p.x},${p.y}`).join(' ');
    
    return (
      <polyline 
        points={pointsString} 
        stroke="hsl(var(--border))" 
        strokeWidth={1} 
        fill="none"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderStatusLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const pct = percent * 100; // Convert to 0-100 range
    
    // Smart label positioning: inside for large slices (>15%), outside for small ones
    const isLargeSlice = pct > 15;
    
    let x, y, textAnchor;
    if (isLargeSlice) {
      // Position inside the slice (at midpoint)
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      x = cx + radius * Math.cos(-midAngle * RADIAN);
      y = cy + radius * Math.sin(-midAngle * RADIAN);
      textAnchor = "middle";
    } else {
      // Position outside the slice, very close to edge
      const radius = outerRadius + 8; // 8px outside, very close to circle edge
      const baseX = cx + radius * Math.cos(-midAngle * RADIAN);
      const baseY = cy + radius * Math.sin(-midAngle * RADIAN);
      
      // Add horizontal offset to prevent text from touching slice edges
      const dx = baseX > cx ? 8 : -8;
      x = baseX + dx;
      y = baseY;
      
      // Adjust textAnchor based on which side of the chart
      textAnchor = x > cx ? "start" : "end";
    }

    const displayText = showStatusPercentage 
      ? `${pct.toFixed(0)}%` 
      : `${value}`;

    return (
      <text
        x={x}
        y={y}
        fill={isLargeSlice ? "white" : "hsl(var(--foreground))"}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="font-bold text-sm"
        style={{ 
          textShadow: isLargeSlice ? '0 0 3px rgba(0,0,0,0.8)' : 'none',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  // Custom labelLine renderer - only show lines for small slices
  const renderPlatformLabelLine = (props: any) => {
    const { payload, points } = props;
    const pct = payload?.percentage ?? 0;
    
    // Only render connector line for small slices (<15%)
    if (pct > 15) {
      return <></>;
    }
    
    // Convert points array to proper SVG points string
    if (!points || points.length === 0) return <></>;
    const pointsString = points.map((p: any) => `${p.x},${p.y}`).join(' ');
    
    return (
      <polyline 
        points={pointsString} 
        stroke="hsl(var(--border))" 
        strokeWidth={1} 
        fill="none"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderPlatformLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;
    const count = payload?.count || 0;
    const pct = payload?.percentage ?? 0;
    const RADIAN = Math.PI / 180;
    
    // Smart label positioning: inside for large slices (>15%), outside for small ones
    const isLargeSlice = pct > 15;
    
    let x, y, textAnchor;
    if (isLargeSlice) {
      // Position inside the slice (at midpoint)
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      x = cx + radius * Math.cos(-midAngle * RADIAN);
      y = cy + radius * Math.sin(-midAngle * RADIAN);
      textAnchor = "middle";
    } else {
      // Position outside the slice, very close to edge
      const radius = outerRadius + 8; // 8px outside, very close to circle edge
      const baseX = cx + radius * Math.cos(-midAngle * RADIAN);
      const baseY = cy + radius * Math.sin(-midAngle * RADIAN);
      
      // Add horizontal offset to prevent text from touching slice edges
      const dx = baseX > cx ? 8 : -8;
      x = baseX + dx;
      y = baseY;
      
      // Adjust textAnchor based on which side of the chart
      textAnchor = x > cx ? "start" : "end";
    }

    const displayText = showPlatformPercentage 
      ? `${pct.toFixed(0)}%` 
      : `#${count}`;

    return (
      <text
        x={x}
        y={y}
        fill={isLargeSlice ? "white" : "hsl(var(--foreground))"}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="font-bold text-sm"
        style={{ 
          textShadow: isLargeSlice ? '0 0 3px rgba(0,0,0,0.8)' : 'none',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  return (
    <div 
      className="shadcn-card rounded-lg border bg-card"
      data-testid="card-combined-charts"
    >
      <div className="py-3.5 px-3.5 sm:px-4.5">
        <div className="grid grid-cols-2 gap-3 sm:gap-4.5">
          {/* Platform Distribution Chart - Right (RTL) */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-center text-foreground/90">
              {t("dashboard.platformDistribution")}
            </h3>
            <div 
              role="button"
              tabIndex={0}
              className="w-full max-w-[136px] sm:max-w-[156px] aspect-square cursor-pointer hover-elevate active-elevate-2 rounded-full transition-all"
              onClick={() => setShowPlatformPercentage(!showPlatformPercentage)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowPlatformPercentage(!showPlatformPercentage);
                }
              }}
              aria-label={`${t("dashboard.platformDistribution")} - ${t("dashboard.clickToToggle")}`}
              data-testid="chart-platform"
            >
              {platformData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center">
                  {t("dashboard.noPlatformData")}
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={renderPlatformLabelLine}
                        label={renderPlatformLabel}
                        outerRadius={56}
                        fill="#8884d8"
                        dataKey="value"
                        onClick={(data) => console.log('Filter by platform:', data.name)}
                      >
                        {platformData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke="hsl(var(--border))" 
                            strokeWidth={1.5}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const item = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-md" style={{ zIndex: 1000 }}>
                                <div className="grid gap-1">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {item.name}
                                    </span>
                                    <span className="font-bold text-muted-foreground">
                                      {formatCurrency(item.value)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {item.count} {t("dashboard.investments")} • {item.percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {platformData.length === 1 && <p className="text-center text-sm text-muted-foreground mt-2">تنويع محدود</p>}
                </>
              )}
            </div>
          </div>

          {/* Investment Status Chart - Left (RTL) */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-center text-foreground/90">
              {t("dashboard.investmentStatus")}
            </h3>
            <div 
              role="button"
              tabIndex={0}
              className="w-full max-w-[136px] sm:max-w-[156px] aspect-square cursor-pointer hover-elevate active-elevate-2 rounded-full transition-all"
              onClick={() => setShowStatusPercentage(!showStatusPercentage)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowStatusPercentage(!showStatusPercentage);
                }
              }}
              aria-label={`${t("dashboard.investmentStatus")} - ${t("dashboard.clickToToggle")}`}
              data-testid="chart-status"
            >
              {rawStatusSum === 0 || statusData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                  {t("investments.noInvestmentsYet")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={renderStatusLabelLine}
                      label={renderStatusLabel}
                      outerRadius={56}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => console.log('Filter by status:', data.name)}
                    >
                      {statusData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          stroke="hsl(var(--border))" 
                          strokeWidth={1.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const value = Number(data.value ?? 0);
                          const percentage = statusTotal > 0 ? ((value / statusTotal) * 100).toFixed(1) : '0.0';
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-md" style={{ zIndex: 1000 }}>
                              <div className="grid gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    {data.name}
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {value} {t("dashboard.investments")} ({percentage}%)
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
