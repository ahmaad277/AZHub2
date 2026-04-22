import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StateBaseProps = {
  title: string;
  description?: string;
  className?: string;
  icon?: LucideIcon;
  "data-testid"?: string;
};

export function PageLoadingState({
  title,
  description,
  className,
  rows = 3,
  "data-testid": dataTestId,
}: StateBaseProps & { rows?: number }) {
  return (
    <Card className={cn("border-dashed", className)} data-testid={dataTestId}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h3 className="mt-3 text-base font-semibold">{title}</h3>
          {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="mt-6 space-y-2">
          {Array.from({ length: Math.max(1, rows) }).map((_, index) => (
            <div key={index} className="h-10 w-full animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PageEmptyState({
  title,
  description,
  className,
  icon: Icon = Inbox,
  action,
  "data-testid": dataTestId,
}: StateBaseProps & { action?: React.ReactNode }) {
  return (
    <Card className={cn("border-dashed", className)} data-testid={dataTestId}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Icon className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function PageErrorState({
  title,
  description,
  className,
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel,
  "data-testid": dataTestId,
}: StateBaseProps & { onRetry?: () => void; retryLabel?: string }) {
  return (
    <Card className={cn("border-destructive/30 bg-destructive/5", className)} data-testid={dataTestId}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-4">
            <Icon className="h-7 w-7 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
          {onRetry && (
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function InlineLoadingState({
  title,
  className,
  "data-testid": dataTestId,
}: Pick<StateBaseProps, "title" | "className" | "data-testid">) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)} data-testid={dataTestId}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="mt-2 text-sm text-muted-foreground">{title}</p>
    </div>
  );
}

export function InlineEmptyState({
  title,
  description,
  className,
  icon: Icon = Inbox,
  "data-testid": dataTestId,
}: StateBaseProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)} data-testid={dataTestId}>
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
