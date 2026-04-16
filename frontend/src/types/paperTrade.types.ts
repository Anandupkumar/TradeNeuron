import type { SignalDirection, ExecutionType } from './signal.types';

export type ExitReason = 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED' | 'MANUAL';
export type TradeStatus = 'OPEN' | 'CLOSED';

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
}
