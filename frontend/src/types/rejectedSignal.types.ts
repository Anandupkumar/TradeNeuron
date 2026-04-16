export type RejectStage =
  | 'LIQUIDITY_GATE'
  | 'FUNDAMENTAL_FILTER'
  | 'SENTIMENT_FILTER'
  | 'VWAP_FILTER'
  | 'PCR_FILTER'
  | 'SECTOR_GATE'
  | 'CONFIDENCE_GATE'
  | 'RR_GATE'
  | 'MERGED_RISK_ZERO'
  | 'ACTIVE_CAP'
  | 'DUPLICATE'
  | 'POSITION_SIZING'
  | 'EARNINGS_BLACKOUT';

export interface RejectedSignal {
  id: number;
  symbol: string;
  date: string;
  strategy_source: string;
  reject_stage: RejectStage;
  reject_reason: string;
  raw_confidence: number | null;
  raw_rr: number | null;
  created_at: string;
}

export interface RejectedSignalsResponse {
  rejected: RejectedSignal[];
}
