import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/language-provider";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface InvestmentStatusChartProps {
  metrics: DashboardMetrics;
}

const COLORS = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  pending: "hsl(var(--chart-3))",
  late: "hsl(var(--chart-4))",
  defaulted: "hsl(var(--destructive))",
};

export function InvestmentStatusChart({ metrics }: InvestmentStatusChartProps) {
  const { t } = useLanguage();
  const [showPercentage, setShowPercentage] = useState(true);
  
  // Toggle between percentage and count on chart click
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

  const data = [
    {
      name: t("status.active"),
      value: metrics.statusDistribution.active,
      color: COLORS.active,
    },
    {
      name: t("status.completed"),
      value: metrics.statusDistribution.completed,
      color: COLORS.completed,
    },
    {
      name: t("status.pending"),
      value: metrics.statusDistribution.pending,
      color: COLORS.pending,
    },
    {
      name: t("status.late"),
      value: metrics.statusDistribution.late,
      color: COLORS.late,
    },
    {
      name: t("status.defaulted"),
      value: metrics.statusDistribution.defaulted,
      color: COLORS.defaulted,
    },
  ].filter(item => item.value > 0);

  const total = metrics.totalInvestments;

  // Custom label renderer - positioned inside the pie chart
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels inside the pie chart (midpoint between inner and outer radius)
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const displayText = showPercentage 
      ? `${(percent * 100).toFixed(0)}%` 
      : `${value}`;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold text-sm"
        style={{ 
          textShadow: '0 0 3px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      className="rounded-lg border bg-card hover-elevate active-elevate-2 transition-all cursor-pointer overflow-hidden"
      onClick={handleChartClick}
      onKeyDown={handleKeyDown}
      aria-label={`${t("dashboard.investmentStatus")} - ${t("dashboard.clickToToggle")}`}
      data-testid="card-status-chart"
    >
      <div className="py-3 px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <PieChart className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">
                {t("dashboard.investmentStatus")}
              </h3>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground mb-3">
              {t("dashboard.totalInvestments")}: {total}
            </p>
            
            {/* Legend - Status Labels with Colors */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {data.map((item, index) => {
                return (
                  <div key={index} className="flex items-start gap-1.5" data-testid={`legend-item-${index}`}>
                    <div 
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="app-card-muted-label break-words leading-snug whitespace-normal">
                      {item.name}: <span className="font-semibold text-foreground">{item.value}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="w-[100px] h-[100px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={42}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const value = Number(data.value ?? 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
}
