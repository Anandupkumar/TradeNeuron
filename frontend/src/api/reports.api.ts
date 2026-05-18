import apiClient from './client';
import type { PerformanceReport, PerformanceReportParams } from '../types';

export const reportsApi = {
  performance: (params: PerformanceReportParams): Promise<PerformanceReport> =>
    apiClient.get('/reports/performance', { params }),

  performanceCsv: (params: PerformanceReportParams): Promise<Blob> =>
    apiClient.get('/reports/performance/export.csv', {
      params,
      responseType: 'blob',
    }),
};
