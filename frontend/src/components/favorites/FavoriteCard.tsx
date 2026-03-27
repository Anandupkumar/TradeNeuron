import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSector, encodeSymbol } from '../../utils/symbols';
import { formatDate } from '../../utils/format';
import type { FavoriteRecord } from '../../types/favorite.types';

interface FavoriteCardProps {
  favorite: FavoriteRecord;
  on_remove?: (symbol: string) => void;
}

export function FavoriteCard({ favorite, on_remove }: FavoriteCardProps) {
  const [confirm_open, set_confirm_open] = useState(false);

  function handleRemove() {
    if (!confirm_open) {
      set_confirm_open(true);
      return;
    }
    on_remove?.(favorite.symbol);
    set_confirm_open(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-start justify-between">
        <div>
          <Link
            to={`/stock/${encodeSymbol(favorite.symbol)}`}
            className="text-base font-bold text-foreground hover:text-emerald-400 transition-colors"
          >
            {favorite.symbol}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">{getSector(favorite.symbol)}</p>
        </div>
        {on_remove && (
          <button
            onClick={handleRemove}
            onBlur={() => set_confirm_open(false)}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              confirm_open
                ? 'bg-red-500/20 text-red-400'
                : 'text-muted-foreground hover:bg-muted hover:text-red-400',
            )}
            title={confirm_open ? 'Click again to confirm' : 'Remove from favorites'}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {favorite.notes && (
        <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{favorite.notes}</p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">Added {formatDate(favorite.created_at)}</p>
    </div>
  );
}
