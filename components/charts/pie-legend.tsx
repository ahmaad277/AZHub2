import { formatPercent, formatNumber } from "@/lib/finance/money";
import type { PieMode } from "./pie-toggle";

export function PieLegend({
  items,
  total,
  mode,
}: {
  items: Array<{ id: string; name: string; value: number; color: string }>;
  total: number;
  mode: PieMode;
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs [@media(orientation:landscape)_and_(max-height:500px)]:flex [@media(orientation:landscape)_and_(max-height:500px)]:flex-wrap [@media(orientation:landscape)_and_(max-height:500px)]:justify-center">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-1 [@media(orientation:landscape)_and_(max-height:500px)]:justify-center">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate whitespace-nowrap [@media(orientation:landscape)_and_(max-height:500px)]:hidden">{item.name}</span>
          </span>
          <span className="tabular-nums text-muted-foreground whitespace-nowrap [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
            {mode === "current" || mode === "historical"
              ? (total > 0 ? formatPercent((item.value / total) * 100, 0) : "0%")
              : formatNumber(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
