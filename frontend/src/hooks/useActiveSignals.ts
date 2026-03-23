import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';

export function useActiveSignals() {
  return useQuery({
    queryKey: ['signals', 'active'],
    queryFn: () => signalsApi.active(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
