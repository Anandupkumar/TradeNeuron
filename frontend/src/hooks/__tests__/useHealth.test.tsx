import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueryClient } from '@tanstack/react-query';
import { useHealth } from '../useHealth';
import { createHookWrapper } from '../../test/test-utils';
import { healthApi } from '../../api/health.api';
import { mockHealthOk } from '../../mocks/fixtures';

vi.mock('../../api/health.api', () => ({
  healthApi: { check: vi.fn() },
}));

function useHealthWithClient() {
  const health_query = useHealth();
  const query_client = useQueryClient();
  return { health_query, query_client };
}

describe('useHealth', () => {
  beforeEach(() => {
    vi.mocked(healthApi.check).mockResolvedValue(mockHealthOk);
  });

  it('returns health data after loading', async () => {
    const { result } = renderHook(() => useHealth(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockHealthOk);
  });

  it('has correct query key', async () => {
    const { result } = renderHook(() => useHealthWithClient(), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.health_query.isSuccess).toBe(true);
    });

    const cached_query = result.current.query_client
      .getQueryCache()
      .find({ queryKey: ['health'] });

    expect(cached_query?.queryKey).toEqual(['health']);
  });
});
