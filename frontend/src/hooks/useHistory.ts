import { useQuery } from '@tanstack/react-query';
import { stocksApi } from '../api/stocks.api';

export function useHistory(
  symbol: string,
  params: { from_date?: string; to_date?: string; include_indicators?: boolean } = {},
) {
  return useQuery({
    queryKey: ['history', symbol, params],
    queryFn: () => stocksApi.history(symbol, params),
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!symbol,
  });
}
