import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  total_pages: number;
  onPageChange: (page: number) => void;
  page_sizes?: number[];
  current_size?: number;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  page,
  total_pages,
  onPageChange,
  page_sizes,
  current_size,
  onPageSizeChange,
}: PaginationProps) {
  const is_first = page <= 1;
  const is_last = page >= total_pages;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={is_first}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'inline-flex items-center rounded-md border border-border bg-card p-1.5 transition-colors',
            is_first ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted'
          )}
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        <span className="text-sm text-muted-foreground">
          Page {page} of {total_pages}
        </span>

        <button
          type="button"
          disabled={is_last}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'inline-flex items-center rounded-md border border-border bg-card p-1.5 transition-colors',
            is_last ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted'
          )}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {page_sizes && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows</span>
          <select
            value={current_size}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-2 py-1 text-sm text-muted-foreground outline-none focus:border-ring"
          >
            {page_sizes.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
