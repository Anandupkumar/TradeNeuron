import apiClient from './client';
import type { SignalListResponse, ActiveSignalsResponse, SignalFilters, RejectedSignalsResponse } from '../types';

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
};
