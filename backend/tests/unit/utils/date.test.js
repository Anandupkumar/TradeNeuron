const { isTradingDay, countTradingDays, formatDate } = require('../../../src/utils/date.util');

describe('Date Utilities', () => {
  test('formatDate should produce YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-03-23'))).toBe('2026-03-23');
  });

  test('weekends should not be trading days', () => {
    expect(isTradingDay(new Date('2026-03-21'))).toBe(false); // Saturday
    expect(isTradingDay(new Date('2026-03-22'))).toBe(false); // Sunday
  });

  test('weekday non-holiday should be trading day', () => {
    expect(isTradingDay(new Date('2026-03-23'))).toBe(true); // Monday
  });

  test('Republic Day 2026 should not be trading day', () => {
    expect(isTradingDay(new Date('2026-01-26'))).toBe(false);
  });

  test('countTradingDays should count correctly', () => {
    const count = countTradingDays('2026-03-23', '2026-03-27');
    expect(count).toBe(5); // Mon-Fri
  });

  test('countTradingDays should exclude weekends', () => {
    const count = countTradingDays('2026-03-21', '2026-03-29');
    expect(count).toBe(5); // Only Mon-Fri
  });
});
