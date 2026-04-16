import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSignalFilters } from '../useFilterUrlSync';
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
