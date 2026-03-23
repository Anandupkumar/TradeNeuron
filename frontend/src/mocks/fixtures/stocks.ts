import type { StockDetail, HistoryResponse, CandleWithIndicators } from '../../types/stock.types';

export const mockStockDetail: StockDetail = {
  symbol: 'RELIANCE.NS',
  sector: 'Energy',
  is_favorite: false,
  latest_candle: {
    date: '2025-01-15',
    open: 2440.0,
    high: 2465.0,
    low: 2430.0,
    close: 2450.0,
    adjusted_close: 2450.0,
    volume: 12500000,
  },
  indicators: {
    ema_20: 2420.0,
    ema_50: 2400.0,
    ema_200: 2350.0,
    rsi: 58.5,
    macd_line: 15.2,
    macd_signal: 12.8,
    macd_histogram: 2.4,
    atr: 45.0,
    volume_change: 25.3,
  },
  features: {
    is_uptrend: true,
    rsi_zone: 'NEUTRAL',
    is_volume_spike: false,
    is_breakout: false,
    near_support: false,
    is_liquid: true,
    is_ranging: false,
    z_score_20d: 0.8,
    distance_from_52w_high_pct: -5.2,
    relative_strength_vs_nifty: 1.05,
  },
  active_signal: null,
};

export const mockCandle: CandleWithIndicators = {
  date: '2025-01-15',
  open: 2440.0,
  high: 2465.0,
  low: 2430.0,
  close: 2450.0,
  adjusted_close: 2450.0,
  volume: 12500000,
  indicators: { ema_20: 2420.0, ema_50: 2400.0, ema_200: 2350.0, rsi: 58.5 },
};

export const mockHistoryResponse: HistoryResponse = {
  symbol: 'RELIANCE.NS',
  candles: [mockCandle],
  total: 1,
};
