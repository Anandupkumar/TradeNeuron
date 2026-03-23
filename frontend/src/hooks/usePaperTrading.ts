import { useQuery } from '@tanstack/react-query';
import { paperTradingApi } from '../api/paperTrading.api';

export function usePaperSummary() {
  return useQuery({
    queryKey: ['paper-trading', 'summary'],
    queryFn: () => paperTradingApi.summary(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePaperTrades(params: {
  status?: string;
  symbol?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: ['paper-trading', 'trades', params],
    queryFn: () => paperTradingApi.trades(params),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}
