import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';

export function useRejectedSignals(date?: string, enabled = true) {
  return useQuery({
    queryKey: ['signals', 'rejected', date ?? null],
    queryFn: () => signalsApi.rejected(date),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
