import apiClient from './client';
import type { BacktestResult } from '../types/backtest.types';

export const backtestApi = {
  results: (params: {
    strategy?: string;
    latest?: boolean;
  }): Promise<{ results: BacktestResult[] }> => apiClient.get('/backtest/results', { params }),
};
