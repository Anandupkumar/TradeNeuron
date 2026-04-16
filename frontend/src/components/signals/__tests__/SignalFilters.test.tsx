import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalFilters } from '../SignalFilters';
import { renderWithProviders } from '@/test/test-utils';
import type { SignalFilters as SignalFilterState } from '../../../types';

describe('SignalFilters', () => {
  const base_filters: SignalFilterState = {
    status: 'all',
    direction: 'all',
    confidence_tier: 'all',
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces symbol and confidence changes before emitting filter updates', () => {
    const on_change = vi.fn();

    renderWithProviders(
      <SignalFilters filters={base_filters} on_change={on_change} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/search symbol/i), {
      target: { value: 'INFY.NS' },
    });
    fireEvent.change(screen.getByLabelText(/min confidence/i), {
      target: { value: '75' },
    });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(on_change).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(on_change).toHaveBeenCalledWith({ symbol: 'INFY.NS' });
    expect(on_change).toHaveBeenCalledWith({ min_confidence: 75 });
  });

  it('syncs local inputs when URL-driven filters change upstream', () => {
    const on_change = vi.fn();
    const { rerender } = renderWithProviders(
      <SignalFilters filters={base_filters} on_change={on_change} />,
    );

    rerender(
      <SignalFilters
        filters={{ ...base_filters, symbol: 'RELIANCE.NS', min_confidence: 80 }}
        on_change={on_change}
      />,
    );

    expect(screen.getByPlaceholderText(/search symbol/i)).toHaveValue('RELIANCE.NS');
    expect(screen.getByLabelText(/min confidence/i)).toHaveValue('80');
  });
});
