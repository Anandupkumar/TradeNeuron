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
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <button
          disabled={is_first}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-1.5 transition-colors',
            is_first ? 'cursor-not-allowed opacity-40' : 'hover:bg-zinc-800'
          )}
        >
          <ChevronLeft className="h-4 w-4 text-zinc-300" />
        </button>

        <span className="text-sm text-zinc-400">
          Page {page} of {total_pages}
        </span>

        <button
          disabled={is_last}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-1.5 transition-colors',
            is_last ? 'cursor-not-allowed opacity-40' : 'hover:bg-zinc-800'
          )}
        >
          <ChevronRight className="h-4 w-4 text-zinc-300" />
        </button>
      </div>

      {page_sizes && onPageSizeChange && (
        <select
          value={current_size}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-300 outline-none focus:border-zinc-600"
        >
          {page_sizes.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
