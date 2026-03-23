import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/health.api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => healthApi.check(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
