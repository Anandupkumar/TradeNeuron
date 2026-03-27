import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '../hooks/useFavorites';
import { FavoritesList } from '../components/favorites/FavoritesList';
import { AddFavoriteDialog } from '../components/favorites/AddFavoriteDialog';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';

export default function WatchlistPage() {
  const [dialog_open, set_dialog_open] = useState(false);

  const favorites_query = useFavorites();
  const add_mutation = useAddFavorite();
  const remove_mutation = useRemoveFavorite();

  const favorites = favorites_query.data?.favorites ?? [];

  function handleAdd(symbol: string, notes?: string) {
    add_mutation.mutate({ symbol, notes });
  }

  function handleRemove(symbol: string) {
    remove_mutation.mutate(symbol);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
          {!favorites_query.isLoading && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {favorites.length}
            </span>
          )}
        </div>
        <button
          onClick={() => set_dialog_open(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Add Stock
        </button>
      </div>

      {favorites_query.isLoading && <LoadingSkeleton variant="card" count={6} />}

      {favorites_query.isError && (
        <ErrorState
          message="Failed to load watchlist"
          onRetry={() => favorites_query.refetch()}
        />
      )}

      {favorites_query.isSuccess && (
        <FavoritesList favorites={favorites} on_remove={handleRemove} />
      )}

      <AddFavoriteDialog
        open={dialog_open}
        on_close={() => set_dialog_open(false)}
        on_add={handleAdd}
      />
    </div>
  );
}
