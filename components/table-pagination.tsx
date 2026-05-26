"use client";

import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  pageCount,
  onPageChange,
}: TablePaginationProps) {
  const { t } = useApp();
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label={t("pagination.previousPage")}
      >
        ‹
      </Button>
      <span className="tabular-nums">
        {page} / {pageCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        aria-label={t("pagination.nextPage")}
      >
        ›
      </Button>
    </div>
  );
}
