import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export function formatINR(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });
}

export function formatPct(value: number | null | undefined, showSign = false): string {
  if (value == null) return '—';
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatRR(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${value.toFixed(2)}x`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy');
}

export function formatDateTime(isoStr: string): string {
  return formatInTimeZone(new Date(isoStr), 'Asia/Kolkata', "d MMM yyyy, h:mm a 'IST'");
}

export function formatShares(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatConfidence(value: number | null | undefined): string {
  if (value == null) return '—';
  return Math.round(value).toString();
}
