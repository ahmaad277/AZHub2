"use client";

import { Button } from "@/components/ui/button";

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
  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Previous page"
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
        aria-label="Next page"
      >
        ›
      </Button>
    </div>
  );
}
