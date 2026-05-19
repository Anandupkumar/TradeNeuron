import type { PaginationMeta } from './api.types';

export type SignalType = 'BUY' | 'SELL';
export type SignalDirection = 'LONG' | 'SHORT';
export type SignalStatus = 'ACTIVE' | 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED';
export type ConfidenceTier = 'HIGH' | 'NORMAL' | 'LOW';
export type ExecutionType = 'EQUITY' | 'FUTURES' | 'OPTIONS' | 'NONE';
export type SignalMarketRegime = 'BULLISH' | 'SIDEWAYS' | 'BEARISH' | 'HIGH_VOLATILITY' | 'UNKNOWN';

export type StrategySource =
  | 'TREND_PULLBACK'
  | 'BREAKOUT'
  | 'RANGE'
  | 'MEAN_REVERSION'
  | 'TREND_PULLBACK_SHORT'
  | 'BREAKDOWN'
  | string;

export interface ConfidenceBreakdown {
  technical: number | null;
  momentum: number | null;
  volume: number | null;
  quality: number | null;
}

export interface Signal {
  id: number;
  symbol: string;
  date: string;
  signal_type: SignalType;
  direction: SignalDirection;
  execution_type: ExecutionType;
  is_executable: boolean;
  confidence: number;
  raw_confidence: number | null;
  confidence_calibrated: boolean;
  entry_degraded: boolean;
  confidence_tier: ConfidenceTier | null;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  risk_reward: number;
  shares_to_buy: number;
  position_value: number;
  capital_risk_inr: number;
  regime_size_multiplier: number | null;
  reasons: string[];
  status: SignalStatus;
  strategy_source: StrategySource;
  sector: string | null;
  market_regime?: SignalMarketRegime | null;
  ranking_score?: number | null;
  ranking_components?: Record<string, number | null> | null;
  exit_policy?: Record<string, unknown> | null;
  max_hold_days?: number | null;
  target_reachability_warning?: boolean;
  signal_flags?: string[] | null;
  is_favorite: boolean;
  created_at: string;
  closed_at: string | null;
  explanation: string[] | null;
  confidence_breakdown: ConfidenceBreakdown | null;
}

export interface SignalFilters {
  status?: SignalStatus | 'all';
  direction?: SignalDirection | 'all';
  confidence_tier?: ConfidenceTier | 'all';
  symbol?: string;
  from_date?: string;
  to_date?: string;
  min_confidence?: number;
  favorites_only?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'date' | 'confidence' | 'risk_reward' | 'symbol' | 'ranking_score';
  sort_order?: 'asc' | 'desc';
}

export interface ActiveSignalsResponse {
  signals: Signal[];
}

export interface SignalListResponse {
  signals: Signal[];
  pagination: PaginationMeta;
}

export interface FunnelGate {
  gate: string;
  input: number;
  rejected: number;
  passed: number;
  pass_rate_pct: number;
}

export interface FunnelResponse {
  date: string;
  total_candidates: number;
  final_signals: number;
  overall_conversion_pct: number;
  funnel: FunnelGate[];
  warnings: string[];
}

export interface RejectionByStage {
  reject_stage: string;
  count: number;
  pct: number;
}

export interface RejectionBySymbol {
  symbol: string;
  count: number;
}

export interface RejectionDistributionResponse {
  period_days: number;
  total_rejected: number;
  by_stage: RejectionByStage[];
  by_symbol: RejectionBySymbol[];
  avg_raw_confidence_at_rejection: number | null;
  avg_raw_rr_at_rejection: number | null;
}

export interface CalibrationBucket {
  confidence_bucket: number;
  slice_level: 'GLOBAL' | 'STRATEGY' | 'STRATEGY_DIRECTION';
  strategy: string;
  direction: SignalDirection | '*';
  total_signals: number;
  actual_win_rate: number;
  computed_at: string;
}

export interface CalibrationResponse {
  buckets: CalibrationBucket[];
  filters?: {
    slice_level: string | null;
    strategy: string | null;
    direction: string | null;
  };
}
