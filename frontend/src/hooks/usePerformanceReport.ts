import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports.api';
import type { PerformanceReportParams } from '../types';

export function usePerformanceReport(params: PerformanceReportParams) {
  return useQuery({
    queryKey: ['reports', 'performance', params],
    queryFn: () => reportsApi.performance(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function downloadPerformanceReportCsv(params: PerformanceReportParams) {
  return reportsApi.performanceCsv(params);
}
