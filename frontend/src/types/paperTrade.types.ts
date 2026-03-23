import type { SignalDirection } from './signal.types';

export type ExitReason = 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'MANUAL';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface PaperTrade {
  id: number;
  signal_id: number;
  symbol: string;
  direction: SignalDirection;
  entry_date: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  shares_to_buy: number;
  exit_date: string | null;
  exit_price: number | null;
  exit_reason: ExitReason | null;
  pnl_pct: number | null;
  gross_pnl_inr: number | null;
  status: TradeStatus;
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
