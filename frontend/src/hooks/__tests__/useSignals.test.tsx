import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSignals } from '../useSignals';
import { createHookWrapper } from '../../test/test-utils';
import { signalsApi } from '../../api/signals.api';
import { mockSignalListResponse } from '../../mocks/fixtures';

vi.mock('../../api/signals.api', () => ({
  signalsApi: {
    list: vi.fn(),
    active: vi.fn(),
  },
}));

describe('useSignals', () => {
  const default_filters = { page: 1, limit: 20 };

  beforeEach(() => {
    vi.mocked(signalsApi.list).mockResolvedValue(mockSignalListResponse);
  });

  it('returns signal data after loading', async () => {
    const { result } = renderHook(() => useSignals(default_filters), {
      wrapper: createHookWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSignalListResponse);
  });

  it('has isLoading=true initially, then false when data arrives', async () => {
    const { result } = renderHook(() => useSignals(default_filters), {
      wrapper: createHookWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSignalListResponse);
  });
});
