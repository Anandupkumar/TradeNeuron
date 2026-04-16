import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import StockDetailPage from '../StockDetail';
import { renderWithProviders } from '@/test/test-utils';
import { useStockDetail } from '../../hooks/useStockDetail';
import { useHistory } from '../../hooks/useHistory';
import { useAddFavorite, useRemoveFavorite } from '../../hooks/useFavorites';
import { mockHistoryResponse, mockStockDetail } from '../../mocks/fixtures/stocks';

vi.mock('../../hooks/useStockDetail', () => ({
  useStockDetail: vi.fn(),
}));

vi.mock('../../hooks/useHistory', () => ({
  useHistory: vi.fn(),
}));

vi.mock('../../hooks/useFavorites', () => ({
  useAddFavorite: vi.fn(),
  useRemoveFavorite: vi.fn(),
}));

describe('StockDetailPage', () => {
  beforeEach(() => {
    vi.mocked(useAddFavorite).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    vi.mocked(useRemoveFavorite).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it('renders an invalid-symbol error state', () => {
    vi.mocked(useStockDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useHistory).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderWithProviders(
      <Routes>
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
      </Routes>,
      { route: '/stock/%E0%A4%A' },
    );

    expect(screen.getByText(/symbol is missing or invalid/i)).toBeInTheDocument();
  });

  it('renders an empty state when stock detail data is missing', () => {
    vi.mocked(useStockDetail).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useHistory).mockReturnValue({
      data: mockHistoryResponse,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderWithProviders(
      <Routes>
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
      </Routes>,
      { route: '/stock/RELIANCE.NS' },
    );

    expect(screen.getByText(/stock details unavailable/i)).toBeInTheDocument();
  });

  it('renders a clear empty-history state without blanking the page', () => {
    vi.mocked(useStockDetail).mockReturnValue({
      data: mockStockDetail,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useHistory).mockReturnValue({
      data: { ...mockHistoryResponse, candles: [], total: 0 },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    renderWithProviders(
      <Routes>
        <Route path="/stock/:symbol" element={<StockDetailPage />} />
      </Routes>,
      { route: '/stock/RELIANCE.NS' },
    );

    expect(screen.getByText(/price action/i)).toBeInTheDocument();
    expect(screen.getByText(/no price history available/i)).toBeInTheDocument();
    expect(screen.getByText(/indicators/i)).toBeInTheDocument();
  });
});
