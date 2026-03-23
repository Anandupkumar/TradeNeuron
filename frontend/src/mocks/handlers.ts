import { http, HttpResponse } from 'msw';
import {
  mockSignalListResponse,
  mockActiveSignalsResponse,
  mockHealthOk,
  mockFavoritesResponse,
  mockFavorite,
  mockStockDetail,
  mockHistoryResponse,
  mockPaperTradeSummary,
  mockPaperTrade,
  mockBacktestResults,
} from './fixtures';

function envelope<T>(data: T) {
  return { success: true, data, error: null };
}

export const handlers = [
  http.get('*/signals', ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/signals/active')) {
      return HttpResponse.json(envelope(mockActiveSignalsResponse));
    }
    return HttpResponse.json(envelope(mockSignalListResponse));
  }),

  http.get('*/signals/active', () => {
    return HttpResponse.json(envelope(mockActiveSignalsResponse));
  }),

  http.get('*/health', () => {
    return HttpResponse.json(envelope(mockHealthOk));
  }),

  http.get('*/favorites', () => {
    return HttpResponse.json(envelope(mockFavoritesResponse));
  }),

  http.post('*/favorites', () => {
    return HttpResponse.json(envelope(mockFavorite));
  }),

  http.delete('*/favorites/:symbol', () => {
    return HttpResponse.json(envelope({ removed: true, symbol: 'RELIANCE.NS' }));
  }),

  http.get('*/stock/:symbol', () => {
    return HttpResponse.json(envelope(mockStockDetail));
  }),

  http.get('*/history/:symbol', () => {
    return HttpResponse.json(envelope(mockHistoryResponse));
  }),

  http.get('*/paper-trading/summary', () => {
    return HttpResponse.json(envelope(mockPaperTradeSummary));
  }),

  http.get('*/paper-trading/trades', () => {
    return HttpResponse.json(
      envelope({ items: [mockPaperTrade], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } }),
    );
  }),

  http.get('*/backtest/results', () => {
    return HttpResponse.json(envelope({ results: mockBacktestResults }));
  }),
];
