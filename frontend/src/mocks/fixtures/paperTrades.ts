import type { PaperTrade, PaperTradingSummary } from '../../types/paperTrade.types';

export const mockPaperTrade: PaperTrade = {
  id: 1,
  signal_id: 10,
  symbol: 'RELIANCE.NS',
  direction: 'LONG',
  entry_date: '2025-01-05',
  entry_price: 2400.0,
  stop_loss: 2340.0,
  target_price: 2520.0,
  shares_to_buy: 14,
  exit_date: '2025-01-12',
  exit_price: 2520.0,
  exit_reason: 'TARGET_HIT',
  pnl_pct: 5.0,
  gross_pnl_inr: 1680.0,
  status: 'CLOSED',
};

export const mockPaperTradeSummary: PaperTradingSummary = {
  total_trades: 25,
  open_trades: 3,
  closed_trades: 22,
  win_rate_pct: 63.6,
  avg_pnl_pct: 2.1,
  total_pnl_pct: 46.2,
  max_drawdown_pct: -8.5,
};
