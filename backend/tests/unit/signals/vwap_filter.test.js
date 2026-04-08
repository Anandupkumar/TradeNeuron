jest.mock('../../../src/models/signal.model', () => ({
  findActiveBySymbol: jest.fn().mockResolvedValue([]),
  countAllActive: jest.fn().mockResolvedValue(0),
  countActiveBySector: jest.fn().mockResolvedValue(0),
  countByWeek: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../../src/models/feature.model', () => ({
  findBySymbolAndDate: jest.fn(),
}));

jest.mock('../../../src/models/rejected_signal.model', () => ({
  insertRejected: jest.fn().mockResolvedValue(),
}));

jest.mock('../../../src/services/scoring/scoring.service', () => ({
  calculateScoreWithBreakdown: jest.fn().mockResolvedValue({
    score: 80,
    breakdown: { trend: 30, rsi: 20, volume: 30, breakout: 0 },
    feature: {},
    indicator: {},
  }),
  buildExplanations: jest.fn().mockReturnValue('Test explanation'),
}));

jest.mock('../../../src/utils/notify.util', () => ({
  sendTelegramAlert: jest.fn().mockResolvedValue(),
}));

jest.mock('../../../src/models/strategy_config.model', () => ({
  getByName: jest.fn().mockResolvedValue(null),
}));

const featureModel = require('../../../src/models/feature.model');
const rejectedSignalModel = require('../../../src/models/rejected_signal.model');
const { calculateScoreWithBreakdown } = require('../../../src/services/scoring/scoring.service');
const { buildCandidate } = require('../../../src/services/signals/signal.service');

function makeRaw(overrides = {}) {
  return {
    symbol: 'RELIANCE.NS',
    date: '2026-03-24',
    entry_price: 2500,
    stop_loss: 2400,
    target_price: 2700,
    risk_reward: 2.0,
    strategy: 'trend_pullback',
    reasons: ['ema_pullback'],
    direction: 'LONG',
    ...overrides,
  };
}

function makeFeature(overrides = {}) {
  return {
    is_ranging: 0,
    is_uptrend: 0,
    is_breakout: 0,
    rvol: 1.0,
    ema50_slope: 0.0,
    vwap_distance_pct: '0.5',
    is_near_vwap: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  calculateScoreWithBreakdown.mockResolvedValue({
    score: 80,
    breakdown: { trend: 30, rsi: 20, volume: 30, breakout: 0 },
    feature: {},
    indicator: {},
  });
});


describe('VWAP Filter — LONG direction', () => {
  test('hard reject when price > 5% above VWAP', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '5.5' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'VWAP_FILTER' })
    );
  });

  test('no penalty with breakout override (2-5% above + confirmed breakout)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '3.0', is_breakout: 1, rvol: 2.0 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(80);
  });

  test('no penalty with strong uptrend override (2-5% above + uptrend + slope)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '4.0', is_uptrend: 1, ema50_slope: 0.8 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(80);
  });

  test('penalty when > 3.5% without override (stretched)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '4.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(77);
  });

  test('penalty when 2-3.5% without override', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '2.5' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(77);
  });

  test('near VWAP bonus when within +/-2%', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '0.5' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(83);
  });

  test('mild penalty when below VWAP with strong uptrend (pullback entry)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0', is_uptrend: 1, ema50_slope: 0.8 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(77);
  });

  test('heavy penalty when below VWAP without uptrend (weak stock)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(72);
  });

  test('bonus capped at VWAP_MAX_BONUS_CAP', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '0.5' })
    );
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);
    expect(result.confidence).toBeLessThanOrEqual(80 + 10);
  });
});


describe('VWAP Filter — SHORT direction', () => {
  test('hard reject when price > 5% from VWAP (SHORT)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-6.0' })
    );

    const raw = makeRaw({ direction: 'SHORT', stop_loss: 2600, target_price: 2300 });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'VWAP_FILTER' })
    );
  });

  test('bonus when price above VWAP > threshold (good short entry)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '3.0' })
    );

    const raw = makeRaw({ direction: 'SHORT', stop_loss: 2600, target_price: 2300 });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(83);
  });

  test('no penalty when below VWAP with strong downtrend', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0', is_uptrend: 0, ema50_slope: -0.8 })
    );

    const raw = makeRaw({ direction: 'SHORT', stop_loss: 2600, target_price: 2300 });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(80);
  });

  test('penalty when below VWAP without strong downtrend (overextended)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0', ema50_slope: 0.1 })
    );

    const raw = makeRaw({ direction: 'SHORT', stop_loss: 2600, target_price: 2300 });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(72);
  });
});


describe('VWAP Filter — edge cases', () => {
  test('no VWAP data — no penalty or bonus applied', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: null })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(80);
  });

  test('no feature data — no penalty or bonus applied', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(null);

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(80);
  });

  test('exact boundary: vwap_dist == 5.0 — NOT hard rejected (> not >=)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '5.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
  });

  test('exact boundary: vwap_dist == 2.0 — gets penalty (> 2.0 is false, not in penalty zone)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '2.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(83);
  });

  test('breakout without sufficient RVOL does NOT get override', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '3.0', is_breakout: 1, rvol: 1.0 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(77);
  });

  test('uptrend without sufficient slope does NOT get override', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '3.0', is_uptrend: 1, ema50_slope: 0.3 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(77);
  });

  test('VWAP cap does NOT limit PCR penalty (isolation check)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0' })
    );

    const nifty_pcr = 1.5;
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeRaw()], [], nifty_pcr);

    // vwap_effect = -8 (below VWAP, weak stock), cap is 10 so -8 passes through
    // PCR penalty = -10 (PCR 1.5 in 1.4–1.8 range), NOT capped
    // total soft_penalty = -8 + -10 = -18
    // confidence = 80 - 18 = 62
    expect(result).not.toBeNull();
    expect(result.confidence).toBe(62);
  });
});


describe('VWAP Filter — BREAKDOWN strategy', () => {
  function makeBreakdownRaw(overrides = {}) {
    return {
      symbol: 'RELIANCE.NS',
      date: '2026-03-24',
      entry_price: 2500,
      stop_loss: 2600,
      target_price: 2300,
      risk_reward: 2.0,
      strategy: 'BREAKDOWN',
      reasons: ['breakdown_close_below_support'],
      direction: 'SHORT',
      ...overrides,
    };
  }

  test('BREAKDOWN: deep below VWAP (<= -5%) gets +10 momentum bonus', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-7.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = +10, capped at +10
    expect(result.confidence).toBe(90);
  });

  test('BREAKDOWN: moderate below VWAP (-2% to -5%) gets +5 bonus', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.5' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = +5
    expect(result.confidence).toBe(85);
  });

  test('BREAKDOWN: near/above VWAP gets -5 penalty (weak setup)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '0.5' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = -5
    expect(result.confidence).toBe(75);
  });

  test('BREAKDOWN: strongDowntrend + deep below VWAP gets extra +5 (capped at +10)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-7.0', is_uptrend: 0, ema50_slope: -0.8 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = +10 (deep) + 5 (strongDowntrend) = +15, capped at +10
    expect(result.confidence).toBe(90);
  });

  test('BREAKDOWN: strongDowntrend but only moderate below VWAP — no extra boost', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-3.0', is_uptrend: 0, ema50_slope: -0.8 })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = +5 (moderate), no extra (vwap_dist > -5), total = +5
    expect(result.confidence).toBe(85);
  });

  test('BREAKDOWN: data anomaly > 20% — still rejected', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-22.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'VWAP_FILTER' })
    );
  });

  test('BREAKDOWN: NOT hard-rejected at 5% (unlike TREND_PULLBACK_SHORT)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-8.0' })
    );

    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [makeBreakdownRaw()], []);

    expect(result).not.toBeNull();
    // vwap_effect = +10 (deep below)
    expect(result.confidence).toBe(90);
  });

  test('TREND_PULLBACK_SHORT: still hard-rejected at 5%', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-6.0' })
    );

    const raw = makeRaw({ direction: 'SHORT', stop_loss: 2600, target_price: 2300, strategy: 'TREND_PULLBACK_SHORT' });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'VWAP_FILTER' })
    );
  });

  test('BREAKDOWN+TREND_PULLBACK_SHORT merged: uses BREAKDOWN path', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue(
      makeFeature({ vwap_distance_pct: '-7.0' })
    );

    const raw = makeBreakdownRaw({ strategy: 'BREAKDOWN+TREND_PULLBACK_SHORT' });
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', [raw], []);

    expect(result).not.toBeNull();
    // primaryStrategy = 'BREAKDOWN' because strategy string includes 'BREAKDOWN'
    // vwap_effect = +10 (deep below)
    expect(result.confidence).toBe(90);
  });
});
