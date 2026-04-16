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
  getRowKey?: (item: T, index: number) => React.Key;
}

type SortDirection = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  className,
  getRowKey,
}: DataTableProps<T>) {
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
    if (sort_key !== key) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sort_dir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-muted-foreground" />
    ) : (
      <ArrowDown className="h-3 w-3 text-muted-foreground" />
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-card">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground',
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
        <tbody className="divide-y divide-border bg-card/50">
          {sorted_data.map((item, idx) => (
            <tr
              key={getRowKey ? getRowKey(item, idx) : idx}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-foreground', col.className)}>
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
