import { useQuery } from '@tanstack/react-query';
import { signalsApi } from '../api/signals.api';

export function useFunnel(date?: string) {
  return useQuery({
    queryKey: ['signal-funnel', date],
    queryFn: () => signalsApi.funnel(date),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRejectionDistribution(period_days = 30) {
  return useQuery({
    queryKey: ['rejection-distribution', period_days],
    queryFn: () => signalsApi.rejectionDistribution(period_days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCalibration() {
  return useQuery({
    queryKey: ['confidence-calibration'],
    queryFn: () => signalsApi.calibration(),
    staleTime: 10 * 60 * 1000,
  });
}
