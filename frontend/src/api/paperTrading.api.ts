import apiClient from './client';
import type { PaperTradingSummary, PaperTrade } from '../types/paperTrade.types';
import type { PaginatedResponse } from '../types/api.types';

export const paperTradingApi = {
  summary: (): Promise<PaperTradingSummary> => apiClient.get('/paper-trading/summary'),
  trades: (params: {
    status?: string;
    symbol?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PaperTrade>> =>
    apiClient.get('/paper-trading/trades', { params }),
};
