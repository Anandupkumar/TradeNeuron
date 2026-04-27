jest.mock('../../../src/models/signal.model', () => ({
  findActiveBySymbol: jest.fn().mockResolvedValue([]),
  countAllActive: jest.fn().mockResolvedValue(0),
  countActiveBySector: jest.fn().mockResolvedValue(0),
  countByWeek: jest.fn().mockResolvedValue(0),
  sumActiveCapitalRisk: jest.fn().mockResolvedValue(0),
  sumActiveCapitalRiskByDirection: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../../src/models/fundamental.model', () => ({
  findLatestBySymbol: jest.fn().mockResolvedValue({ next_earnings_date: null }),
}));

jest.mock('../../../src/models/confidence_calibration.model', () => ({
  findLatestForBucket: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/models/paper_trade.model', () => ({
  getPortfolioDrawdownFraction: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../../src/services/fundamentals/sector_context.service', () => ({
  getSectorAverageRelativeStrength: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../src/models/candle.model', () => ({
  findBySymbolAndDate: jest.fn().mockResolvedValue({ adjusted_close: '2500', open: '2500' }),
}));

jest.mock('../../../src/models/feature.model', () => ({
  findBySymbolAndDate: jest.fn().mockResolvedValue({ is_ranging: 0, vwma_distance_pct: '0.5' }),
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

const signalModel = require('../../../src/models/signal.model');
const rejectedSignalModel = require('../../../src/models/rejected_signal.model');
const { calculateScoreWithBreakdown } = require('../../../src/services/scoring/scoring.service');
const { buildCandidate, selectTopSignals } = require('../../../src/services/signals/signal.service');

function makeRawSignal(overrides = {}) {
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

describe('buildCandidate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signalModel.findActiveBySymbol.mockResolvedValue([]);
    signalModel.countAllActive.mockResolvedValue(0);
    signalModel.countActiveBySector.mockResolvedValue(0);
    calculateScoreWithBreakdown.mockResolvedValue({
      score: 80,
      breakdown: { trend: 30, rsi: 20, volume: 30, breakout: 0 },
      feature: {},
      indicator: {},
    });
  });

  test('should return a candidate when all gates pass', async () => {
    const raw = [makeRawSignal()];
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', raw, []);

    expect(result).not.toBeNull();
    expect(result.symbol).toBe('RELIANCE.NS');
    expect(result.confidence).toBe(83);
    expect(result.direction).toBe('LONG');
    expect(result.signal_type).toBe('BUY');
    expect(result.status).toBe('ACTIVE');
  });

  test('should reject duplicate active signal', async () => {
    signalModel.findActiveBySymbol.mockResolvedValue([{ direction: 'LONG' }]);
    const raw = [makeRawSignal()];
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', raw, []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'DUPLICATE' })
    );
  });

  test('should use pool floor thresholds when frequency controller is enabled', async () => {
    calculateScoreWithBreakdown.mockResolvedValue({
      score: 67,
      breakdown: { trend: 30, rsi: 0, volume: 30, breakout: 7 },
      feature: {},
      indicator: {},
    });

    const raw = [makeRawSignal({ risk_reward: 1.8 })];
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', raw, []);

    expect(result).not.toBeNull();
    expect(result.confidence).toBe(70);
  });

  test('should reject below pool floor confidence (60)', async () => {
    calculateScoreWithBreakdown.mockResolvedValue({
      score: 53,
      breakdown: { trend: 0, rsi: 20, volume: 30, breakout: 3 },
      feature: {},
      indicator: {},
    });

    const raw = [makeRawSignal()];
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', raw, []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'CONFIDENCE_GATE' })
    );
  });

  test('should reject below pool floor R:R (1.5)', async () => {
    const raw = [makeRawSignal({
      strategy: 'RANGE',
      risk_reward: 1.2,
      target_price: 2620,
      stop_loss: 2400,
    })];
    const result = await buildCandidate('RELIANCE.NS', '2026-03-24', raw, []);

    expect(result).toBeNull();
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'RR_GATE' })
    );
  });
});

describe('selectTopSignals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signalModel.countByWeek.mockResolvedValue(0);
  });

  function makeCandidate(symbol, confidence, risk_reward, ranking_score = null) {
    return {
      symbol,
      date: '2026-03-24',
      signal_type: 'BUY',
      direction: 'LONG',
      execution_type: 'EQUITY',
      is_executable: true,
      confidence,
      ranking_score,
      confidence_tier: confidence >= 85 ? 'HIGH' : confidence >= 75 ? 'NORMAL' : 'LOW',
      entry_price: 2500,
      stop_loss: 2400,
      target_price: 2700,
      risk_reward,
      reasons: ['test'],
      status: 'ACTIVE',
      strategy_source: 'trend_pullback',
      shares_to_buy: 100,
      position_value: 250000,
      capital_risk_inr: 10000,
      regime_size_multiplier: 1.0,
      confidence_breakdown: {},
      explanation: 'test',
    };
  }

  test('should select top N candidates by confidence DESC, risk_reward DESC', async () => {
    const candidates = [
      makeCandidate('TCS.NS', 70, 2.0),
      makeCandidate('RELIANCE.NS', 85, 2.5),
      makeCandidate('INFY.NS', 80, 3.0),
      makeCandidate('HDFCBANK.NS', 75, 2.2),
      makeCandidate('ICICIBANK.NS', 90, 1.8),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(3);
    expect(result[0].symbol).toBe('ICICIBANK.NS');
    expect(result[1].symbol).toBe('RELIANCE.NS');
    expect(result[2].symbol).toBe('INFY.NS');
  });

  // Phase A / Fix 2: Dynamic threshold raises the confidence floor as the week fills.
  // floor = MIN_CONFIDENCE + (weekly/target) * DYNAMIC_FLOOR_SLOPE_POINTS
  // With defaults (MIN_CONFIDENCE=70, target=10, slope=10): week=8 → floor=78, week=10 → floor=80, week=15 → floor=85.
  test('dynamic floor: raises floor when week is ~80% filled (weekly=8/10)', async () => {
    signalModel.countByWeek.mockResolvedValue(8);

    const candidates = [
      makeCandidate('TCS.NS', 90, 2.5),        // passes floor 78
      makeCandidate('RELIANCE.NS', 85, 2.0),   // passes
      makeCandidate('INFY.NS', 77, 3.0),       // fails floor 78
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.symbol)).toEqual(expect.arrayContaining(['TCS.NS', 'RELIANCE.NS']));
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'INFY.NS', reject_stage: 'FREQUENCY_DYNAMIC_FLOOR' })
    );
  });

  test('dynamic floor: at weekly target (10/10), floor=80 blocks sub-80 confidence', async () => {
    signalModel.countByWeek.mockResolvedValue(10);

    const candidates = [
      makeCandidate('TCS.NS', 90, 2.5),  // passes
      makeCandidate('ABC.NS', 78, 2.5),  // blocked by floor=80
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TCS.NS');
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ABC.NS', reject_stage: 'FREQUENCY_DYNAMIC_FLOOR' })
    );
  });

  test('should return empty array when no candidates', async () => {
    const result = await selectTopSignals([], '2026-03-24');
    expect(result).toHaveLength(0);
  });

  // Phase A / Fix 2: absolute daily cap still wins when many candidates pass the dynamic floor.
  test('dynamic mode still respects absolute daily cap (MAX_SIGNALS_PER_DAY)', async () => {
    // weekly=0 → floor = MIN_CONFIDENCE (70). All 5 candidates pass floor,
    // but MAX_SIGNALS_PER_DAY=3 caps the result.
    const candidates = [
      makeCandidate('A.NS', 90, 3.0),
      makeCandidate('B.NS', 85, 2.5),
      makeCandidate('C.NS', 80, 2.0),
      makeCandidate('D.NS', 75, 1.8),
      makeCandidate('E.NS', 72, 1.5),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(3);
    const rejected_calls = rejectedSignalModel.insertRejected.mock.calls.map((c) => c[0]);
    const daily_cap_hits = rejected_calls.filter((r) => r.reject_stage === 'FREQUENCY_CAP');
    expect(daily_cap_hits.map((r) => r.symbol).sort()).toEqual(['D.NS', 'E.NS']);
  });

  test('should sort by confidence first, then risk_reward as tiebreaker when ranking_score is absent', async () => {
    const candidates = [
      makeCandidate('A.NS', 80, 3.0),
      makeCandidate('B.NS', 80, 2.0),
      makeCandidate('C.NS', 80, 4.0),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(3);
    expect(result[0].symbol).toBe('C.NS');
    expect(result[1].symbol).toBe('A.NS');
    expect(result[2].symbol).toBe('B.NS');
  });

  test('should prioritize ranking_score over raw confidence', async () => {
    const candidates = [
      makeCandidate('A.NS', 90, 2.0, 70),
      makeCandidate('B.NS', 82, 2.0, 88),
      makeCandidate('C.NS', 80, 2.0, 84),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result[0].symbol).toBe('B.NS');
    expect(result[1].symbol).toBe('C.NS');
    expect(result[2].symbol).toBe('A.NS');
  });

  test('dynamic floor: caps at DYNAMIC_FLOOR_MAX when weekly count far exceeds target', async () => {
    signalModel.countByWeek.mockResolvedValue(15);

    // At weekly=15, week_fill clamps to 1.5 → floor = min(85, 70 + 1.5*10) = 85.
    const candidates = [
      makeCandidate('TCS.NS', 95, 3.0),   // passes floor=85
      makeCandidate('ABC.NS', 82, 3.0),   // fails
    ];
    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('TCS.NS');
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ABC.NS', reject_stage: 'FREQUENCY_DYNAMIC_FLOOR' })
    );
  });
});
