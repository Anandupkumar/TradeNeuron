import { useSearchParams } from 'react-router-dom';
import type { SignalFilters, SignalStatus, SignalDirection, ConfidenceTier } from '../types';
import { PAGINATION } from '../utils/constants';

export function useSignalFilters(): [SignalFilters, (f: Partial<SignalFilters>) => void] {
  const [params, setParams] = useSearchParams();

  const filters: SignalFilters = {
    status: (params.get('status') as SignalStatus) ?? 'all',
    direction: (params.get('direction') as SignalDirection) ?? 'all',
    confidence_tier: (params.get('confidence_tier') as ConfidenceTier | 'all') ?? undefined,
    symbol: params.get('symbol') ?? undefined,
    from_date: params.get('from_date') ?? undefined,
    to_date: params.get('to_date') ?? undefined,
    min_confidence: params.get('min_confidence') ? Number(params.get('min_confidence')) : undefined,
    favorites_only: params.get('favorites_only') === 'true',
    page: params.get('page') ? Number(params.get('page')) : 1,
    limit: params.get('limit') ? Number(params.get('limit')) : PAGINATION.defaultPageSize,
    sort_by: (params.get('sort_by') as SignalFilters['sort_by']) ?? 'date',
    sort_order: (params.get('sort_order') as 'asc' | 'desc') ?? 'desc',
  };

  const setFilters = (updates: Partial<SignalFilters>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '' || v === 'all') {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    if (!('page' in updates)) next.set('page', '1');
    setParams(next, { replace: true });
  };

  return [filters, setFilters];
}
