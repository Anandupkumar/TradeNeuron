import type { PaginationMeta } from './api.types';

export type SignalType = 'BUY' | 'SELL';
export type SignalDirection = 'LONG' | 'SHORT';
export type SignalStatus = 'ACTIVE' | 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED';
export type ConfidenceTier = 'HIGH' | 'NORMAL' | 'LOW';
export type ExecutionType = 'EQUITY' | 'FUTURES' | 'OPTIONS' | 'NONE';

export type StrategySource =
  | 'TREND_PULLBACK'
  | 'BREAKOUT'
  | 'RANGE'
  | 'MEAN_REVERSION'
  | 'TREND_PULLBACK_SHORT'
  | 'BREAKDOWN'
  | string;

export interface ConfidenceBreakdown {
  technical: number;
  momentum: number;
  volume: number;
  quality: number;
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
  confidence_tier: ConfidenceTier | null;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  risk_reward: number;
  shares_to_buy: number;
  position_value: number;
  capital_risk_inr: number;
  reasons: string[];
  status: SignalStatus;
  strategy_source: StrategySource;
  sector: string | null;
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
  sort_by?: 'date' | 'confidence' | 'risk_reward' | 'symbol';
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
