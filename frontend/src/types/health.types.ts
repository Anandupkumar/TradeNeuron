export interface HealthData {
  status: 'ok' | 'degraded';
  db: 'connected' | 'disconnected';
  uptime: number;
  last_pipeline_run: string | null;
  active_signals_count: number;
  weekly_signal_count: number;
  market_regime: 'BULLISH' | 'SIDEWAYS' | 'BEARISH' | 'HIGH_VOLATILITY' | null;
}
