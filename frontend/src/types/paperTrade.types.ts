import type { SignalDirection, ExecutionType } from './signal.types';

export type ExitReason =
  | 'TARGET_HIT'
  | 'SL_HIT'
  | 'TRAILING_STOP_HIT'
  | 'GAP_STOP'
  | 'EXPIRED'
  | 'EXPIRED_PENALIZED'
  | 'PARTIAL_THEN_TARGET'
  | 'PARTIAL_THEN_BE_STOP'
  | 'PARTIAL_THEN_TRAIL_STOP'
  | 'PARTIAL_THEN_EXPIRED'
  | 'VOL_COMPRESSION'
  | 'MANUAL';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeLifecycleState =
  | 'ACTIVE'
  | 'PARTIAL_EXITED'
  | 'TRAILING'
  | 'STALE'
  | 'COMPRESSING'
  | 'FAILED'
  | 'EXITED';

export interface PaperTrade {
  id: number;
  signal_id: number;
  symbol: string;
  direction: SignalDirection;
  execution_type: ExecutionType;
  entry_date: string;
  entry_price: number;
  actual_entry_price: number | null;
  stop_loss: number;
  target_price: number;
  shares_to_buy: number;
  exit_date: string | null;
  exit_price: number | null;
  exit_reason: ExitReason | null;
  pnl_pct: number | null;
  gross_pnl_inr: number | null;
  status: TradeStatus;
  lifecycle_state: TradeLifecycleState;
  lifecycle_note: string | null;
  lifecycle_state_changed_at: string | null;
  exit_policy?: Record<string, unknown> | null;
  max_hold_days?: number | null;
  mfe_pct?: number | null;
  mae_pct?: number | null;
  bars_held?: number | null;
  entry_gap_pct?: number | null;
}

export interface PaperTradingSummary {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  win_rate_pct: number;
  avg_pnl_pct: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;
  partial_exited_trades: number;
  trailing_trades: number;
  stale_trades: number;
  compressing_trades: number;
}
