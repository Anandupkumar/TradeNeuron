import type { Signal, SignalListResponse, ActiveSignalsResponse } from '../../types';

export const mockSignal: Signal = {
  id: 1,
  symbol: 'RELIANCE.NS',
  date: '2025-01-15',
  signal_type: 'BUY',
  direction: 'LONG',
  execution_type: 'EQUITY',
  is_executable: true,
  confidence: 82,
  raw_confidence: 82,
  confidence_calibrated: false,
  entry_degraded: false,
  confidence_tier: 'HIGH',
  entry_price: 2450.0,
  stop_loss: 2380.0,
  target_price: 2590.0,
  risk_reward: 2.0,
  shares_to_buy: 14,
  position_value: 34300.0,
  capital_risk_inr: 980.0,
  regime_size_multiplier: 1,
  reasons: ['EMA crossover', 'RSI pullback from oversold', 'Volume surge'],
  status: 'ACTIVE',
  strategy_source: 'TREND_PULLBACK',
  sector: 'Energy',
  is_favorite: false,
  created_at: '2025-01-15T10:30:00.000Z',
  closed_at: null,
  explanation: ['Trend and momentum aligned.'],
  confidence_breakdown: {
    technical: 30,
    momentum: 20,
    volume: 20,
    quality: 12,
  },
};

export const mockSignalSell: Signal = {
  ...mockSignal,
  id: 2,
  symbol: 'HDFCBANK.NS',
  signal_type: 'SELL',
  direction: 'SHORT',
  confidence: 75,
  entry_price: 1650.0,
  stop_loss: 1700.0,
  target_price: 1550.0,
  status: 'ACTIVE',
  strategy_source: 'BREAKDOWN',
  reasons: ['Breakdown below support', 'Bearish divergence'],
};

export const mockSignalListResponse: SignalListResponse = {
  signals: [mockSignal, mockSignalSell],
  pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
};

export const mockActiveSignalsResponse: ActiveSignalsResponse = {
  signals: [mockSignal],
};
