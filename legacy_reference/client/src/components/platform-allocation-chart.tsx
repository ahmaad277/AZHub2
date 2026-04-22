import { useState, useEffect } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { getPlatformChartColor } from "@/lib/platform-colors";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/language-provider";

type AllocationMode = 'all-value' | 'active-value' | 'count';

interface PlatformAllocationChartProps {
  dataAll: Array<{ platform: string; amount: number; percentage: number }>;
  dataActive: Array<{ platform: string; amount: number; percentage: number }>;
  dataCount: Array<{ platform: string; amount: number; percentage: number }>;
}

export function PlatformAllocationChart({ dataAll, dataActive, dataCount }: PlatformAllocationChartProps) {
  const { t } = useLanguage();
  
  // Load saved mode from localStorage or default to 'all-value'
  const [mode, setMode] = useState<AllocationMode>(() => {
    const saved = localStorage.getItem('platformAllocationMode');
    return (saved as AllocationMode) || 'all-value';
  });

  // Save mode to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('platformAllocationMode', mode);
  }, [mode]);

  // Toggle between modes on click
  const handleChartClick = () => {
    setMode(prev => {
      if (prev === 'all-value') return 'active-value';
      if (prev === 'active-value') return 'count';
      return 'all-value';
    });
  };

  // Select the appropriate data based on mode
  const data = mode === 'all-value' ? dataAll : mode === 'active-value' ? dataActive : dataCount;
  const dataKey = mode === 'count' ? 'count' : 'amount';

  // Get mode label
  const getModeLabel = () => {
    if (mode === 'all-value') return t('platformAllocation.allValue');
    if (mode === 'active-value') return t('platformAllocation.activeValue');
    return t('platformAllocation.count');
  };

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <p>No data available yet</p>
      </div>
    );
  }

  const formatValue = (value: number) => {
    if (mode === 'count') {
      return `${value} ${t('common.investments')}`;
    }
    return `SAR ${value.toLocaleString()}`;
  };

  return (
    <div className="relative">
      {/* Mode indicator badge */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <Badge 
          variant="secondary" 
          className="text-xs cursor-pointer hover-elevate active-elevate-2"
          onClick={handleChartClick}
          data-testid="badge-allocation-mode"
        >
          {getModeLabel()}
        </Badge>
      </div>

      {/* Desktop version */}
      <div className="px-6 pb-6 cursor-pointer" onClick={handleChartClick} data-testid="chart-platform-allocation-desktop">
        <ResponsiveContainer width="100%" height={400} className="hidden sm:block">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ platform, percentage }) => `${platform}: ${percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => {
                const color = getPlatformChartColor(entry.platform);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={color}
                    data-testid={`pie-segment-${entry.platform.toLowerCase()}`}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => formatValue(value)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile version - edge to edge with smaller radius */}
      <div className="w-full sm:hidden -mx-6 px-6 cursor-pointer" onClick={handleChartClick} data-testid="chart-platform-allocation-mobile">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ platform, percentage }) => `${platform}: ${percentage.toFixed(1)}%`}
              outerRadius={90}
              fill="#8884d8"
              dataKey={dataKey}
            >
              {data.map((entry, index) => {
                const color = getPlatformChartColor(entry.platform);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={color}
                    data-testid={`pie-segment-${entry.platform.toLowerCase()}`}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => formatValue(value)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
