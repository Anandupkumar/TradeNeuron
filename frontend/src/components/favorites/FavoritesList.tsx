import { Star } from 'lucide-react';
import { FavoriteCard } from './FavoriteCard';
import { EmptyState } from '../common/EmptyState';
import type { FavoriteRecord } from '../../types/favorite.types';

interface FavoritesListProps {
  favorites: FavoriteRecord[];
  on_remove?: (symbol: string) => void;
}

export function FavoritesList({ favorites, on_remove }: FavoritesListProps) {
  if (favorites.length === 0) {
    return EmptyState({
      icon: <Star className="h-10 w-10" />,
      title: 'No favorites yet',
      description: 'Add stocks from the Signals page to start tracking them here.',
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {favorites.map((fav) => (
        <div key={fav.id}>
          {FavoriteCard({ favorite: fav, on_remove })}
        </div>
      ))}
    </div>
  );
}
