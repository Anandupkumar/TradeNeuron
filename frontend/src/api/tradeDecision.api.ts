import apiClient from './client';
import type { TradeDecision, DecisionHistoryResponse } from '../types';

export const tradeDecisionApi = {
  get: (signalId: number): Promise<TradeDecision | null> =>
    apiClient.get(`/signals/${signalId}/decision`),

  upsert: (signalId: number, body: {
    decision: 'TAKEN' | 'SKIPPED' | 'MODIFIED';
    notes?: string;
    actual_entry?: number;
    actual_qty?: number;
  }): Promise<TradeDecision> =>
    apiClient.post(`/signals/${signalId}/decision`, body),

  history: (limit?: number): Promise<DecisionHistoryResponse> =>
    apiClient.get('/decisions', { params: limit ? { limit } : {} }),
};
