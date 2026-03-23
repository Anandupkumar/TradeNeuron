import type { FavoriteRecord, FavoritesResponse } from '../../types/favorite.types';

export const mockFavorite: FavoriteRecord = {
  id: 1,
  user_id: 'test-user-uuid',
  symbol: 'RELIANCE.NS',
  notes: null,
  created_at: '2025-01-10T08:00:00.000Z',
};

export const mockFavoritesResponse: FavoritesResponse = {
  favorites: [
    mockFavorite,
    { id: 2, user_id: 'test-user-uuid', symbol: 'TCS.NS', notes: 'IT bellwether', created_at: '2025-01-11T08:00:00.000Z' },
  ],
};
