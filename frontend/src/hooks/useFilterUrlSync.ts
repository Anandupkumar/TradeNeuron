import { useSearchParams } from 'react-router-dom';
import type { SignalFilters, SignalStatus, SignalDirection, ConfidenceTier } from '../types';
import { PAGINATION } from '../utils/constants';

const STATUS_VALUES = new Set<SignalStatus>([
  'ACTIVE',
  'TARGET_HIT',
  'SL_HIT',
  'EXPIRED',
  'EXPIRED_PENALIZED',
]);
const DIRECTION_VALUES = new Set<SignalDirection>(['LONG', 'SHORT']);
const CONFIDENCE_TIER_VALUES = new Set<ConfidenceTier>(['HIGH', 'NORMAL', 'LOW']);
const SORT_BY_VALUES = new Set<NonNullable<SignalFilters['sort_by']>>([
  'date',
  'confidence',
  'risk_reward',
  'symbol',
  'ranking_score',
]);
const SORT_ORDER_VALUES = new Set<NonNullable<SignalFilters['sort_order']>>(['asc', 'desc']);
const PAGE_SIZE_VALUES = new Set([20, 50, 100]);

function parseEnum<T extends string>(
  value: string | null,
  allowlist: Set<T>,
  fallback: T | 'all',
): T | 'all' {
  if (value == null || value === 'all') return fallback;
  return allowlist.has(value as T) ? (value as T) : fallback;
}

function parsePositiveInt(value: string | null, fallback: number, max?: number): number {
  if (value == null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  if (max != null && parsed > max) return max;
  return parsed;
}

function parseConfidence(value: string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(100, Math.max(0, parsed));
}

export function useSignalFilters(): [SignalFilters, (f: Partial<SignalFilters>) => void] {
  const [params, setParams] = useSearchParams();

  const parsed_limit = parsePositiveInt(
    params.get('limit'),
    PAGINATION.defaultPageSize,
    PAGINATION.maxPageSize,
  );
  const limit = PAGE_SIZE_VALUES.has(parsed_limit)
    ? parsed_limit
    : PAGINATION.defaultPageSize;

  const filters: SignalFilters = {
    status: parseEnum(params.get('status'), STATUS_VALUES, 'all'),
    direction: parseEnum(params.get('direction'), DIRECTION_VALUES, 'all'),
    confidence_tier: parseEnum(params.get('confidence_tier'), CONFIDENCE_TIER_VALUES, 'all'),
    symbol: params.get('symbol') ?? undefined,
    from_date: params.get('from_date') ?? undefined,
    to_date: params.get('to_date') ?? undefined,
    min_confidence: parseConfidence(params.get('min_confidence')),
    favorites_only: params.get('favorites_only') === 'true',
    page: parsePositiveInt(params.get('page'), 1),
    limit,
    sort_by: parseEnum(params.get('sort_by'), SORT_BY_VALUES, 'date') as NonNullable<SignalFilters['sort_by']>,
    sort_order: parseEnum(params.get('sort_order'), SORT_ORDER_VALUES, 'desc') as NonNullable<SignalFilters['sort_order']>,
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
