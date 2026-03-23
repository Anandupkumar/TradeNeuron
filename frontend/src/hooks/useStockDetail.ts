import { useQuery } from '@tanstack/react-query';
import { stocksApi } from '../api/stocks.api';

export function useStockDetail(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => stocksApi.detail(symbol),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!symbol,
  });
}
