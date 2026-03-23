import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({ columns, data, onRowClick, className }: DataTableProps<T>) {
  const [sort_key, set_sort_key] = useState<string | null>(null);
  const [sort_dir, set_sort_dir] = useState<SortDirection>('asc');

  function handleSort(key: string) {
    if (sort_key === key) {
      set_sort_dir(sort_dir === 'asc' ? 'desc' : 'asc');
    } else {
      set_sort_key(key);
      set_sort_dir('asc');
    }
  }

  const sorted_data = sort_key
    ? [...data].sort((a, b) => {
        const a_val = (a as Record<string, unknown>)[sort_key];
        const b_val = (b as Record<string, unknown>)[sort_key];
        if (a_val == null || b_val == null) return 0;
        const cmp = a_val < b_val ? -1 : a_val > b_val ? 1 : 0;
        return sort_dir === 'asc' ? cmp : -cmp;
      })
    : data;

  function sortIcon(key: string) {
    if (sort_key !== key) return <ArrowUpDown className="h-3 w-3 text-zinc-500" />;
    return sort_dir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-zinc-300" />
    ) : (
      <ArrowDown className="h-3 w-3 text-zinc-300" />
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-zinc-800', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400',
                  col.sortable && 'cursor-pointer select-none',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortIcon(col.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
          {sorted_data.map((item, idx) => (
            <tr
              key={idx}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-zinc-800/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-zinc-200', col.className)}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
