export interface HealthData {
  status: 'ok' | 'degraded';
  db: 'connected' | 'disconnected';
  last_pipeline_run: string | null;
  active_signals_count: number;
}
