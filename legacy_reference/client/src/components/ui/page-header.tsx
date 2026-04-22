import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  gradient?: boolean;
  /** @deprecated Ignored; header is always single-row title + actions */
  inline?: boolean;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  gradient = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-lg px-3 sm:px-4 py-2 border-b",
        "flex flex-row flex-wrap items-center justify-between gap-2 gap-y-1.5 min-w-0",
        gradient
          ? "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
          : "bg-primary/10",
        className
      )}
      data-testid="page-header"
    >
      <h1 className="app-page-title flex-1">
        {title}
      </h1>
      {children && (
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 justify-end shrink-0">
          {children}
        </div>
      )}
      {description ? (
        <p className="text-sm text-muted-foreground w-full basis-full pt-0.5">{description}</p>
      ) : null}
    </div>
  );
}
