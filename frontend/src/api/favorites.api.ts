import apiClient from './client';
import type { FavoritesResponse, FavoriteRecord } from '../types/favorite.types';

export const favoritesApi = {
  list: (): Promise<FavoritesResponse> => apiClient.get('/favorites'),
  add: (symbol: string, notes?: string): Promise<FavoriteRecord> =>
    apiClient.post('/favorites', { symbol, notes }),
  remove: (symbol: string): Promise<{ removed: boolean; symbol: string }> =>
    apiClient.delete(`/favorites/${encodeURIComponent(symbol)}`),
};
