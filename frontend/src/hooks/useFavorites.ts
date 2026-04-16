import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../api/favorites.api';
import toast from 'react-hot-toast';
import type { FavoritesResponse } from '../types/favorite.types';

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ symbol, notes }: { symbol: string; notes?: string }) =>
      favoritesApi.add(symbol, notes),
    onMutate: async ({ symbol }) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const previous = qc.getQueryData<FavoritesResponse>(['favorites']);
      qc.setQueryData<FavoritesResponse>(['favorites'], (old) => {
        if (!old) return old;
        return {
          ...old,
          favorites: [
            ...old.favorites,
            {
              id: -Date.now(),
              user_id: '',
              symbol,
              notes: null,
              created_at: new Date().toISOString(),
            },
          ],
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['favorites'], context.previous);
      }
      toast.error('Failed to add to watchlist');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['signals'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Added to watchlist');
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => favoritesApi.remove(symbol),
    onMutate: async (symbol) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const previous = qc.getQueryData<FavoritesResponse>(['favorites']);
      qc.setQueryData<FavoritesResponse>(['favorites'], (old) => {
        if (!old) return old;
        return {
          ...old,
          favorites: old.favorites.filter((f) => f.symbol !== symbol),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(['favorites'], context.previous);
      }
      toast.error('Failed to remove from watchlist');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['signals'] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      toast.success('Removed from watchlist');
    },
  });
}
