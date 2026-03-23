import apiClient from './client';
import type { StockDetail, HistoryResponse } from '../types';

export const stocksApi = {
  detail: (symbol: string): Promise<StockDetail> =>
    apiClient.get(`/stock/${encodeURIComponent(symbol)}`),
  history: (
    symbol: string,
    params: { from_date?: string; to_date?: string; include_indicators?: boolean },
  ): Promise<HistoryResponse> =>
    apiClient.get(`/history/${encodeURIComponent(symbol)}`, { params }),
};
