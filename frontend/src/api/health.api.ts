import apiClient from './client';
import type { HealthData } from '../types/health.types';

export const healthApi = {
  check: (): Promise<HealthData> => apiClient.get('/health'),
};
