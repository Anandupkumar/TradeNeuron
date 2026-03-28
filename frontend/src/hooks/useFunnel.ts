import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';

export function useFunnel(date?: string) {
  return useQuery({
    queryKey: ['signal-funnel', date],
    queryFn: () => signalsApi.funnel(date),
    staleTime: 5 * 60 * 1000,
  });
}
