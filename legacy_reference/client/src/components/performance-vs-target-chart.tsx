import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface PerformanceVsTargetChartProps {
  data: Array<{ year: number; actual: number; target: number }>;
}

export function PerformanceVsTargetChart({ data }: PerformanceVsTargetChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <p>No data available yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop version */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={400} className="hidden sm:block">
          <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="year"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number) => `SAR ${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Actual"
              dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Target 2040"
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Mobile version - edge to edge with scroll */}
      <div className="w-full overflow-x-auto sm:hidden -mx-6 px-6">
        <div style={{ minWidth: "600px", width: "100%" }}>
          <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="year"
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--popover-foreground))" }}
              formatter={(value: number) => `SAR ${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Actual"
              dot={{ fill: "hsl(var(--chart-1))", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Target 2040"
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
