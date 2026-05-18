import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useReportFilters, useSignalFilters } from '../useFilterUrlSync';
import { createHookWrapper } from '../../test/test-utils';

describe('useSignalFilters', () => {
  it('normalizes invalid query params into safe defaults', () => {
    const { result } = renderHook(() => useSignalFilters(), {
      wrapper: createHookWrapper({
        route: '/signals?status=BAD&direction=DOWN&page=-2&limit=999&min_confidence=140&sort_by=bad&sort_order=sideways',
      }),
    });

    expect(result.current[0]).toMatchObject({
      status: 'all',
      direction: 'all',
      page: 1,
      limit: 100,
      min_confidence: 100,
      sort_by: 'date',
      sort_order: 'desc',
    });
  });

  it('resets page when a non-page filter changes', async () => {
    const { result } = renderHook(() => useSignalFilters(), {
      wrapper: createHookWrapper({
        route: '/signals?page=3&status=ACTIVE',
      }),
    });

    act(() => {
      result.current[1]({ symbol: 'TCS.NS' });
    });

    await waitFor(() => {
      expect(result.current[0].symbol).toBe('TCS.NS');
      expect(result.current[0].page).toBe(1);
    });
  });
});

describe('useReportFilters', () => {
  it('reads date range filters from URL params', () => {
    const { result } = renderHook(() => useReportFilters(), {
      wrapper: createHookWrapper({
        route: '/reports?from_date=2026-05-01&to_date=2026-05-30',
      }),
    });

    expect(result.current[0]).toEqual({
      from_date: '2026-05-01',
      to_date: '2026-05-30',
    });
  });

  it('updates date range filters in URL params', async () => {
    const { result } = renderHook(() => useReportFilters(), {
      wrapper: createHookWrapper({
        route: '/reports?from_date=2026-05-01&to_date=2026-05-30',
      }),
    });

    act(() => {
      result.current[1]({ from_date: '2026-05-10' });
    });

    await waitFor(() => {
      expect(result.current[0].from_date).toBe('2026-05-10');
      expect(result.current[0].to_date).toBe('2026-05-30');
    });
  });
});
