import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/language-provider";
import { Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getPlatformChartColor } from "@/lib/platform-colors";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface PlatformDistributionChartProps {
  metrics: DashboardMetrics;
}

// Fallback colors for unmapped platforms (cycle through these)
const FALLBACK_PLATFORM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const DEFAULT_PLATFORM_COLOR = "hsl(var(--primary))";

export function PlatformDistributionChart({ metrics }: PlatformDistributionChartProps) {
  const { t } = useLanguage();
  const [showPercentage, setShowPercentage] = useState(true);
  
  // Toggle between percentage and value on chart click
  const handleChartClick = () => {
    setShowPercentage(!showPercentage);
  };
  
  // Handle keyboard interaction for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChartClick();
    }
  };

  // Map platform distribution to chart data with platform-specific colors
  const data = metrics.platformDistribution.map((platform, index) => {
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

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Custom labelLine renderer - only show lines for small slices
  const renderLabelLine = (props: any) => {
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

  // Smart label renderer - inside for large slices, outside for small ones
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;
    const count = payload?.count || 0;
    // Use the already-computed percentage from metrics (0-100), not Recharts percent (0-1)
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

    const displayText = showPercentage 
      ? `${pct.toFixed(0)}%` 
      : `#${count}`;

    return (
      <text
        x={x}
        y={y}
        fill={isLargeSlice ? "white" : "hsl(var(--foreground))"}
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="font-bold text-[11px]"
        style={{ 
          textShadow: isLargeSlice ? '0 0 3px rgba(0,0,0,0.8)' : 'none',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  // If no platform data, show empty state
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">
            {t("dashboard.platformDistribution")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.noPlatformData")}
        </p>
      </div>
    );
  }

  return (
    <div 
      role="button"
      tabIndex={0}
      className="rounded-lg border bg-card hover-elevate active-elevate-2 transition-all cursor-pointer"
      onClick={handleChartClick}
      onKeyDown={handleKeyDown}
      aria-label={`${t("dashboard.platformDistribution")} - ${t("dashboard.clickToToggle")}`}
      data-testid="card-platform-chart"
    >
      <div className="py-3 px-4">
        <div className="flex items-center justify-center flex-col gap-3">
          {/* Title and Description */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">
                {t("dashboard.platformDistribution")}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.totalValue")}: {formatCurrency(totalValue)}
            </p>
          </div>
          
          {/* Pie Chart - centered */}
          <div className="w-full max-w-[170px] aspect-square mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={renderLabelLine}
                  label={renderLabel}
                  outerRadius={65}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
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
          </div>
        </div>
      </div>
    </div>
  );
}
