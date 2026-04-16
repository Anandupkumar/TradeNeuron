const {
  computeMarketRegime,
  computeBreadthPct,
  computePersistenceScore,
} = require('../../../src/services/strategies/market_regime.util');

describe('market_regime.util', () => {
  test('should classify bullish when trend, breadth, and persistence align', () => {
    const regime = computeMarketRegime({
      nifty_close: 22000,
      ema_200: 21000,
      ema_20: 21900,
      ema_50: 21400,
      vix_close: 14,
      vix_threshold: 20,
      breadth_pct: 68,
      persistence_score: 3,
    });

    expect(regime).toBe('BULLISH');
  });

  test('should downgrade to sideways when breadth is weak and persistence is fading', () => {
    const regime = computeMarketRegime({
      nifty_close: 22000,
      ema_200: 21000,
      ema_20: 21900,
      ema_50: 21400,
      vix_close: 14,
      vix_threshold: 20,
      breadth_pct: 35,
      persistence_score: -2,
    });

    expect(regime).toBe('SIDEWAYS');
  });

  test('should classify bearish below ema200 unless breadth and persistence strongly offset it', () => {
    const regime = computeMarketRegime({
      nifty_close: 19800,
      ema_200: 21000,
      ema_20: 19900,
      ema_50: 20200,
      vix_close: 16,
      vix_threshold: 20,
      breadth_pct: 42,
      persistence_score: -3,
    });

    expect(regime).toBe('BEARISH');
  });

  test('should classify sideways below ema200 when breadth and persistence are recovering', () => {
    const regime = computeMarketRegime({
      nifty_close: 20800,
      ema_200: 21000,
      ema_20: 20950,
      ema_50: 20800,
      vix_close: 16,
      vix_threshold: 20,
      breadth_pct: 64,
      persistence_score: 3,
    });

    expect(regime).toBe('SIDEWAYS');
  });

  test('should compute breadth and persistence helpers', () => {
    const breadth_pct = computeBreadthPct({
      total_symbols: 50,
      uptrend_count: 30,
      rs_positive_count: 28,
      slope_positive_count: 26,
    });
    const persistence_score = computePersistenceScore([
      { nifty_close: 22000, ema_200: 21000, ema_20: 21900, ema_50: 21400, vix_close: 15, vix_threshold: 20 },
      { nifty_close: 22100, ema_200: 21050, ema_20: 22000, ema_50: 21450, vix_close: 14, vix_threshold: 20 },
      { nifty_close: 20500, ema_200: 21060, ema_20: 20800, ema_50: 21000, vix_close: 18, vix_threshold: 20 },
    ]);

    expect(breadth_pct).toBeCloseTo(56, 0);
    expect(persistence_score).toBe(1);
  });
});
