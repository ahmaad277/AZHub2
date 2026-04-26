"use client";

import { useApp } from "@/components/providers";
import { formatNumber } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

type ResolvedIssueStatus = "late" | "defaulted";

function formatResolvedIssueDuration(days: number) {
  if (days < 31) return `${days}D`;
  if (days < 365) return `${formatNumber(days / 30, "en-US", 1)}M`;
  return `${formatNumber(days / 365, "en-US", 1)}Y`;
}

export function ResolvedIssueBadge({
  status,
  days,
  className,
}: {
  status?: ResolvedIssueStatus | null;
  days?: number | null;
  className?: string;
}) {
  const { t } = useApp();
  if (!status || !days || days <= 0) return null;

  const duration = formatResolvedIssueDuration(days);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full text-[10px] font-medium text-destructive",
        className,
      )}
      title={`${t(`investment.resolvedIssue.${status}`)} ${duration}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-destructive" />
      <span className="tabular-nums">{duration}</span>
    </span>
  );
}
