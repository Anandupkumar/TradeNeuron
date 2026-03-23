import type { HealthData } from '../../types/health.types';

export const mockHealthOk: HealthData = {
  status: 'ok',
  db: 'connected',
  last_pipeline_run: '2025-01-15T11:00:00.000Z',
  active_signals_count: 5,
};

export const mockHealthDegraded: HealthData = {
  status: 'degraded',
  db: 'disconnected',
  last_pipeline_run: null,
  active_signals_count: 0,
};
