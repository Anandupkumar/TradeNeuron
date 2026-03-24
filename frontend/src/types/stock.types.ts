import type { Signal } from './signal.types';

export type RsiZone = 'OVERSOLD' | 'PULLBACK' | 'NEUTRAL' | 'OVERBOUGHT';
export type MarketRegime = 'BULLISH' | 'SIDEWAYS' | 'BEARISH' | 'HIGH_VOLATILITY';
export type VolumeTier = 'LOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH' | 'EXTREME';

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  delivery_pct: number | null;
}

export interface CandleWithIndicators extends Candle {
  indicators?: {
    ema_20?: number | null;
    ema_50?: number | null;
    ema_200?: number | null;
    rsi?: number | null;
    macd_line?: number | null;
    macd_signal?: number | null;
    macd_histogram?: number | null;
    atr?: number | null;
    volume_change?: number | null;
  };
}

export interface StockIndicators {
  ema_20: number | null;
  ema_50: number | null;
  ema_200: number | null;
  rsi: number | null;
  macd_line: number | null;
  macd_signal: number | null;
  macd_histogram: number | null;
  atr: number | null;
  volume_change: number | null;
}

export interface StockFeatures {
  is_uptrend: boolean;
  rsi_zone: RsiZone;
  is_volume_spike: boolean;
  is_breakout: boolean;
  near_support: boolean;
  is_liquid: boolean;
  is_ranging: boolean;
  z_score_20d: number | null;
  distance_from_52w_high_pct: number | null;
  relative_strength_vs_nifty: number | null;
  rvol: number | null;
  volume_tier: VolumeTier | null;
  vwap: number | null;
  vwap_distance_pct: number | null;
  is_near_vwap: boolean;
  is_high_delivery: boolean;
  delivery_pct: number | null;
}

export interface StockDetail {
  symbol: string;
  sector: string;
  is_favorite: boolean;
  latest_candle: Candle;
  indicators: StockIndicators;
  features: StockFeatures;
  active_signal: Signal | null;
}

export interface HistoryResponse {
  symbol: string;
  candles: CandleWithIndicators[];
  total: number;
}
