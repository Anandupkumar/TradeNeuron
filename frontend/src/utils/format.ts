import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatINR(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return n.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  });
}

export function formatPct(value: number | string | null | undefined, showSign = false): string {
  const n = toNum(value);
  if (n == null) return '—';
  const sign = showSign && n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function formatRR(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return `${n.toFixed(2)}x`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy');
}

export function formatDateTime(isoStr: string): string {
  return formatInTimeZone(new Date(isoStr), 'Asia/Kolkata', "d MMM yyyy, h:mm a 'IST'");
}

export function formatShares(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatConfidence(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return Math.round(n).toString();
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatDurationMs(value: number | string | null | undefined): string {
  const n = toNum(value);
  if (n == null) return '—';
  if (n < 1000) return `${Math.round(n)} ms`;
  const seconds = n / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} sec`;
  const minutes = seconds / 60;
  return `${minutes.toFixed(1)} min`;
}

export function formatExitReason(reason: string | null | undefined): string {
  if (!reason) return '—';
  if (reason === 'EXPIRED_PENALIZED') return 'Expired (penalized)';
  return reason.split('_').join(' ');
}

