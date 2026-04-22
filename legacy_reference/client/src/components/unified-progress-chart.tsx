import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { useQuery } from "@tanstack/react-query";
import type { VisionTarget, PortfolioHistory } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface UnifiedProgressChartProps {
  currentPortfolioValue: number;
  targetCapital2040: number;
  currentInputs: {
    initialAmount: number;
    monthlyDeposit: number;
    expectedIRR: number;
  };
  scenarioInputs: {
    initialAmount: number;
    monthlyDeposit: number;
    expectedIRR: number;
  };
  yearsTo2040: number;
}

export function UnifiedProgressChart({
  currentPortfolioValue,
  targetCapital2040,
  currentInputs,
  scenarioInputs,
  yearsTo2040
}: UnifiedProgressChartProps) {
  const { t } = useLanguage();

  // Fetch monthly targets (green line - target scenario)
  const { data: monthlyTargets = [] } = useQuery<VisionTarget[]>({
    queryKey: ["/api/vision-targets"],
  });
  
  // Fetch portfolio history (orange line - actual historical data)
  const { data: portfolioHistory = [] } = useQuery<PortfolioHistory[]>({
    queryKey: ["/api/portfolio-history"],
  });

  // Generate chart data with three lines
  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const endYear = 2040;
    const dataPoints: any[] = [];

    // Create monthly data points from now to 2040
    const monthsToEnd = yearsTo2040 * 12;
    
    for (let i = 0; i <= monthsToEnd; i += 6) { // Sample every 6 months for better performance
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${month.toString().padStart(2, '0')}-01`;
      const label = `${month.toString().padStart(2, '0')}/${year}`;

      // Blue Line - Current Path (based on current inputs)
      const currentMonthlyRate = currentInputs.expectedIRR / 100 / 12;
      let currentValue = currentPortfolioValue;
      for (let j = 0; j < i; j++) {
        currentValue = currentValue * (1 + currentMonthlyRate) + currentInputs.monthlyDeposit;
      }

      // Green Line - Target Path (from VisionTarget if exists, otherwise calculated)
      const visionTarget = monthlyTargets.find(t => {
        const targetDate = new Date(t.month);
        return targetDate.getFullYear() === year && targetDate.getMonth() + 1 === month;
      });
      let targetValue: number;
      if (visionTarget) {
        // Use persisted target from database
        targetValue = parseFloat(visionTarget.targetValue);
      } else {
        // Calculate adaptive target if no persisted target exists
        const targetMonthlyRate = scenarioInputs.expectedIRR / 100 / 12;
        let calculatedTarget = currentPortfolioValue;
        for (let j = 0; j < i; j++) {
          calculatedTarget = calculatedTarget * (1 + targetMonthlyRate) + scenarioInputs.monthlyDeposit;
        }
        targetValue = Math.min(calculatedTarget, targetCapital2040);
      }

      // Orange Line - Actual Historical Data from portfolio history
      const actualHistory = portfolioHistory.find(h => {
        const historyDate = new Date(h.month);
        return historyDate.getFullYear() === year && historyDate.getMonth() + 1 === month;
      });
      const actualValue = actualHistory ? parseFloat(actualHistory.totalValue) : null;

      dataPoints.push({
        label,
        date: monthKey,
        currentPath: Math.round(currentValue),
        targetPath: Math.round(targetValue),
        actualData: actualValue,
      });
    }

    return dataPoints;
  }, [currentPortfolioValue, targetCapital2040, currentInputs, scenarioInputs, yearsTo2040, monthlyTargets, portfolioHistory]);

  // Format currency for tooltip - Always use English numbers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 sm:p-3 border-2">
          <div className="text-xs sm:text-sm font-medium mb-1.5">{payload[0].payload.label}</div>
          <div className="space-y-1 text-xs">
            {payload.map((entry: any, index: number) => {
              if (entry.value === null || entry.value === undefined) return null;
              return (
                <div key={index} className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="break-words leading-snug min-w-0 whitespace-normal">{entry.name}:</span>
                  <span className="font-semibold break-words leading-snug min-w-0 whitespace-normal">{formatCurrency(entry.value)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Mobile: Edge-to-edge chart */}
        <div className="w-full h-64 sm:h-80 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ 
                top: 10, 
                right: 10, 
                left: 0, 
                bottom: 5 
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="line"
              />
              
              {/* Blue Line - Current Path */}
              <Line
                type="monotone"
                dataKey="currentPath"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name={t("vision2040.currentPath")}
                connectNulls
              />
              
              {/* Green Line - Target Path */}
              <Line
                type="monotone"
                dataKey="targetPath"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name={t("vision2040.targetPath")}
                strokeDasharray="5 5"
                connectNulls
              />
              
              {/* Orange Line - Actual Data */}
              <Line
                type="monotone"
                dataKey="actualData"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ fill: '#f97316', r: 4 }}
                name={t("vision2040.actualData")}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
