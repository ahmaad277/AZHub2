import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricTileProps {
  title: string;
  primaryValue: string | number;
  secondaryValue: string | number;
  alert?: 'red' | 'orange' | 'none';
  tooltip?: string;
  icon: LucideIcon;
}

export function MetricTile({
  title,
  primaryValue,
  secondaryValue,
  alert = 'none',
  tooltip,
  icon: Icon,
}: MetricTileProps) {
  const secondaryClass = alert === 'red'
    ? 'text-red-500'
    : alert === 'orange'
    ? 'text-amber-500'
    : 'text-muted-foreground';

  const content = (
    <div className="bg-card rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      </div>
      <div className="text-2xl font-bold tracking-tight mt-1">{primaryValue}</div>
      <div className={`text-sm ${secondaryClass} mt-0.5`}>{secondaryValue}</div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}