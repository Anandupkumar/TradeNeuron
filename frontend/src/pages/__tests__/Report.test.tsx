import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportPage from '../Report';
import { renderWithProviders } from '@/test/test-utils';
import { useReportFilters } from '../../hooks/useFilterUrlSync';
import { downloadPerformanceReportCsv, usePerformanceReport } from '../../hooks/usePerformanceReport';
import { mockPerformanceReport } from '../../mocks/fixtures';

vi.mock('../../hooks/useFilterUrlSync', () => ({
  useReportFilters: vi.fn(),
}));

vi.mock('../../hooks/usePerformanceReport', () => ({
  usePerformanceReport: vi.fn(),
  downloadPerformanceReportCsv: vi.fn(),
}));

describe('ReportPage', () => {
  const set_filters = vi.fn();

  beforeEach(() => {
    set_filters.mockReset();
    vi.mocked(downloadPerformanceReportCsv).mockReset();
    vi.mocked(useReportFilters).mockReturnValue([
      { from_date: '2026-05-01', to_date: '2026-05-30' },
      set_filters,
    ]);
    vi.mocked(usePerformanceReport).mockReturnValue({
      data: mockPerformanceReport,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it('renders the consolidated performance sections', () => {
    renderWithProviders(<ReportPage />, { route: '/reports' });

    expect(screen.getByRole('heading', { name: /system performance report/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pipeline health/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /signal factory/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /paper trading performance/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /signal outcome details/i })).toBeInTheDocument();
    expect(screen.getByText(/^Target Hit$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Stop Loss Hit$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Expired$/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /strategy performance/i })).toBeInTheDocument();
  });

  it('updates URL-synced filters when dates change', () => {
    renderWithProviders(<ReportPage />, { route: '/reports' });

    fireEvent.change(screen.getByLabelText(/from/i), {
      target: { value: '2026-05-10' },
    });

    expect(set_filters).toHaveBeenCalledWith({ from_date: '2026-05-10' });
  });

  it('shows an error state when the report query fails', () => {
    vi.mocked(usePerformanceReport).mockReturnValue({
      error: new Error('Server error'),
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as never);

    renderWithProviders(<ReportPage />, { route: '/reports' });

    expect(screen.getByText(/server error/i)).toBeInTheDocument();
  });
});
