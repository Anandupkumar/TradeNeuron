import apiClient from './client';
import type { SignalListResponse, ActiveSignalsResponse, SignalFilters, RejectedSignalsResponse, FunnelResponse, RejectionDistributionResponse, CalibrationResponse } from '../types';

function stripAllValues(filters: SignalFilters): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === 'all' || value === undefined || value === null || value === '' || value === false) {
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
}

export const signalsApi = {
  list: (filters: SignalFilters): Promise<SignalListResponse> =>
    apiClient.get('/signals', { params: stripAllValues(filters) }),
  active: (): Promise<ActiveSignalsResponse> => apiClient.get('/signals/active'),
  rejected: (date?: string): Promise<RejectedSignalsResponse> =>
    apiClient.get('/signals/rejected', { params: date ? { date } : {} }),
  funnel: (date?: string): Promise<FunnelResponse> =>
    apiClient.get('/signals/funnel', { params: date ? { date } : {} }),
  rejectionDistribution: (period_days = 30): Promise<RejectionDistributionResponse> =>
    apiClient.get('/signals/rejected/distribution', { params: { period_days } }),
  calibration: (): Promise<CalibrationResponse> =>
    apiClient.get('/signals/calibration'),
};
