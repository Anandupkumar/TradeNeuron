import {
  formatConfidence,
  formatDate,
  formatDateTime,
  formatINR,
  formatPct,
  formatRR,
  formatShares,
} from '../format';

describe('formatINR', () => {
  it('formats positive amounts with INR symbol and two decimals', () => {
    expect(formatINR(2450)).toBe('₹2,450.00');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0.00');
  });

  it('formats large numbers with Indian digit grouping', () => {
    expect(formatINR(12345678.9)).toBe('₹1,23,45,678.90');
  });
});

describe('formatPct', () => {
  it('formats without a leading sign by default', () => {
    expect(formatPct(2.5)).toBe('2.50%');
  });

  it('adds a plus sign for positive values when showSign is true', () => {
    expect(formatPct(2.5, true)).toBe('+2.50%');
  });

  it('does not add a plus sign for zero when showSign is true', () => {
    expect(formatPct(0, true)).toBe('0.00%');
  });

  it('formats negative values without a plus sign', () => {
    expect(formatPct(-1.25)).toBe('-1.25%');
    expect(formatPct(-1.25, true)).toBe('-1.25%');
  });
});

describe('formatRR', () => {
  it('formats risk-reward with two decimals and x suffix', () => {
    expect(formatRR(2)).toBe('2.00x');
    expect(formatRR(1.5)).toBe('1.50x');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string to d MMM yyyy', () => {
    expect(formatDate('2025-03-15')).toBe('15 Mar 2025');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO string to IST wall time with date and time', () => {
    const iso_str = '2025-01-15T10:30:00.000Z';
    expect(formatDateTime(iso_str)).toBe('15 Jan 2025, 4:00 PM IST');
  });
});

describe('formatShares', () => {
  it('formats integers with en-IN locale and no fraction digits', () => {
    expect(formatShares(1234567)).toBe('12,34,567');
  });
});

describe('formatConfidence', () => {
  it('rounds to the nearest integer as a string', () => {
    expect(formatConfidence(72.4)).toBe('72');
    expect(formatConfidence(72.6)).toBe('73');
  });

  it('handles whole numbers', () => {
    expect(formatConfidence(80)).toBe('80');
  });
});
