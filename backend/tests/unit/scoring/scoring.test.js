jest.mock('../../../src/models/feature.model');
jest.mock('../../../src/models/indicator.model');
jest.mock('../../../src/config/db', () => ({
  pool: { query: jest.fn().mockResolvedValue([[]]) },
}));

const { calculateScore, calculateScoreWithBreakdown, buildExplanations } = require('../../../src/services/scoring/scoring.service');
const featureModel = require('../../../src/models/feature.model');
const indicatorModel = require('../../../src/models/indicator.model');

describe('Scoring Service', () => {
  afterEach(() => jest.clearAllMocks());

  test('should return 0 when no feature/indicator data', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(null);
    indicatorModel.findBySymbolAndDate.mockResolvedValue(null);

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(0);
  });

  test('should score 30 for trend alignment only', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(30);
  });

  test('should score 100 when all LONG factors are present', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 1,
      volume_tier: 'extreme', close_position: 0.85,
      is_high_delivery: 1, ema50_slope: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(100); // 30 trend + 20 RSI + 30 volume + 20 breakout + 10 quality = 110, clamped to 100
  });

  test('should score 70 for trend + RSI + breakout (meets min_confidence)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 1,
      volume_tier: 'normal', close_position: 0.85, ema50_slope: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(70); // 30 trend + 20 RSI + 0 volume + 20 breakout
  });

  test('should not score trend if ema_20 <= ema_50', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 0,
      volume_tier: 'extreme', ema50_slope: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 95, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(50); // 0 trend + 20 RSI + 30 volume
  });

  test('should penalize LONG trend when ema50_slope <= 0', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(15); // 30 - 15 penalty = 15
  });

  test('should reduce breakout points when close_position is moderate', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 1,
      volume_tier: 'normal', close_position: 0.65, ema50_slope: null,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 95, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(10); // 20 - 10 soft penalty = 10
  });

  test('should give 0 breakout points when close_position < 0.6', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 1,
      volume_tier: 'normal', close_position: 0.45, ema50_slope: null,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 95, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(0);
  });
});

describe('SHORT Scoring', () => {
  afterEach(() => jest.clearAllMocks());

  test('should score downtrend alignment for SHORT', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.5, close_position: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(30); // downtrend confirmed, negative slope = no penalty
  });

  test('should score RSI overbought for SHORT', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'OVERBOUGHT', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: null, close_position: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 105, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(20); // only RSI overbought (not downtrend since ema_20 > ema_50)
  });

  test('should score breakdown when close_position < 0.4', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.3, close_position: 0.2,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(50); // 30 trend + 20 breakdown
  });

  test('should NOT score breakdown when close_position >= 0.4', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.3, close_position: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(30); // only trend, no breakdown
  });

  test('should NOT score breakdown when is_breakout is true', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 1,
      volume_tier: 'normal', ema50_slope: -0.3, close_position: 0.2,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(30); // only trend, breakout=true blocks breakdown
  });

  test('should score quality bonus for high delivery on breakdown', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.3, close_position: 0.15,
      is_high_delivery: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(60); // 30 trend + 20 breakdown + 10 quality
  });

  test('should NOT score quality bonus for high delivery without breakdown', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: -0.3, close_position: 0.5,
      is_high_delivery: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(30); // trend only, no breakdown so no quality
  });

  test('should penalize SHORT trend when ema50_slope >= 0', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: 0.2, close_position: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(15); // 30 - 15 penalty = 15
  });

  test('should score volume the same for SHORT as LONG', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'NEUTRAL', is_breakout: 0,
      volume_tier: 'extreme', ema50_slope: null, close_position: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 105, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(30); // only volume (not downtrend since ema_20 > ema_50)
  });

  test('should score 100 when all SHORT factors are present', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'OVERBOUGHT', is_breakout: 0,
      volume_tier: 'extreme', ema50_slope: -0.5, close_position: 0.15,
      is_high_delivery: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(100); // 30 trend + 20 RSI + 30 volume + 20 breakdown + 10 quality = 110, clamped
  });

  test('should return 0 for SHORT when features are bullish', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 1,
      volume_tier: 'normal', close_position: 0.85, ema50_slope: 0.5,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(score).toBe(0); // uptrend, pullback RSI, breakout — all wrong for SHORT
  });
});

describe('SHORT Scoring Breakdown', () => {
  afterEach(() => jest.clearAllMocks());

  test('should return correct breakdown buckets for SHORT', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 0, rsi_zone: 'OVERBOUGHT', is_breakout: 0,
      volume_tier: 'high', ema50_slope: -0.3, close_position: 0.2,
      is_high_delivery: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 90, ema_50: 100, rsi_14: 72,
    });

    const { score, breakdown } = await calculateScoreWithBreakdown('RELIANCE.NS', '2026-03-23', 'SHORT');
    expect(breakdown.technical).toBe(50); // 30 trend + 20 breakdown
    expect(breakdown.momentum).toBe(20); // RSI overbought
    expect(breakdown.volume).toBe(20); // high tier
    expect(breakdown.quality).toBe(10); // delivery + breakdown
    expect(score).toBe(100); // 50+20+20+10 = 100
  });
});

describe('buildExplanations direction-aware', () => {
  test('should produce SHORT-specific sentences', () => {
    const feature = {
      is_uptrend: 0, rsi_zone: 'OVERBOUGHT', is_breakout: 0,
      volume_tier: 'high', ema50_slope: -0.3, close_position: 0.2,
      is_high_delivery: 1, rvol: 2.5,
    };
    const indicator = { ema_20: 90, ema_50: 100, rsi_14: 72 };

    const sentences = buildExplanations(feature, indicator, 'BEARISH', null, 'SHORT');

    expect(sentences.some(s => s.includes('downtrend'))).toBe(true);
    expect(sentences.some(s => s.includes('overbought'))).toBe(true);
    expect(sentences.some(s => s.includes('breakdown'))).toBe(true);
    expect(sentences.some(s => s.includes('institutional selling'))).toBe(true);
    expect(sentences.some(s => s.includes('BEARISH'))).toBe(true);
  });

  test('should produce LONG-specific sentences', () => {
    const feature = {
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 1,
      volume_tier: 'high', ema50_slope: 0.5, close_position: 0.85,
      is_high_delivery: 1, rvol: 2.5,
    };
    const indicator = { ema_20: 110, ema_50: 100, rsi_14: 38 };

    const sentences = buildExplanations(feature, indicator, 'BULLISH', null, 'LONG');

    expect(sentences.some(s => s.includes('uptrend'))).toBe(true);
    expect(sentences.some(s => s.includes('pullback'))).toBe(true);
    expect(sentences.some(s => s.includes('breaking out'))).toBe(true);
    expect(sentences.some(s => s.includes('BULLISH'))).toBe(true);
  });

  test('should default to LONG when direction not provided', () => {
    const feature = {
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_breakout: 0,
      volume_tier: 'normal', ema50_slope: 0.5,
    };
    const indicator = { ema_20: 110, ema_50: 100, rsi_14: 38 };

    const sentences = buildExplanations(feature, indicator, null, null);
    expect(sentences.some(s => s.includes('uptrend'))).toBe(true);
  });
});
