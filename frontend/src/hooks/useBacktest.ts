import { useQuery } from '@tanstack/react-query';
import { backtestApi } from '../api/backtest.api';

export function useBacktestResults(params: { strategy?: string; latest?: boolean } = {}) {
  return useQuery({
    queryKey: ['backtest', 'results', params],
    queryFn: () => backtestApi.results(params),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
