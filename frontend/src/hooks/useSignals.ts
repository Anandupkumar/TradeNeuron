import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';
import type { SignalFilters } from '../types';

export function useSignals(filters: SignalFilters) {
  return useQuery({
    queryKey: ['signals', 'list', filters],
    queryFn: () => signalsApi.list(filters),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  });
}
