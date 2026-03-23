export interface FavoriteRecord {
  id: number;
  user_id: string;
  symbol: string;
  notes: string | null;
  created_at: string;
}

export interface FavoritesResponse {
  favorites: FavoriteRecord[];
}
