export type DecisionType = 'TAKEN' | 'SKIPPED' | 'MODIFIED';

export interface TradeDecision {
  id: number;
  signal_id: number;
  user_identifier: string;
  decision: DecisionType;
  notes: string | null;
  actual_entry: number | null;
  actual_qty: number | null;
  decided_at: string;
  updated_at: string;
}

export interface DecisionHistoryItem extends TradeDecision {
  symbol: string;
  signal_type: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  target_price: number;
  confidence: number;
  signal_status: string;
}

export interface DecisionHistoryResponse {
  decisions: DecisionHistoryItem[];
}
