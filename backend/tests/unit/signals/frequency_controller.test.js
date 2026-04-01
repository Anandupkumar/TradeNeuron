jest.mock('../../../src/models/signal.model', () => ({
  findActiveBySymbol: jest.fn().mockResolvedValue([]),
  countAllActive: jest.fn().mockResolvedValue(0),
  countActiveBySector: jest.fn().mockResolvedValue(0),
  countByWeek: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../../src/models/feature.model', () => ({
  findBySymbolAndDate: jest.fn().mockResolvedValue({ is_ranging: 0, vwap_distance_pct: '0.5' }),
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
    const raw = [makeRawSignal({ risk_reward: 1.2, target_price: 2620, stop_loss: 2400 })];
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

  function makeCandidate(symbol, confidence, risk_reward) {
    return {
      symbol,
      date: '2026-03-24',
      signal_type: 'BUY',
      direction: 'LONG',
      execution_type: 'EQUITY',
      is_executable: true,
      confidence,
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

  test('should respect weekly target — reduce daily limit when weekly count is high', async () => {
    signalModel.countByWeek.mockResolvedValue(8);

    const candidates = [
      makeCandidate('TCS.NS', 90, 2.5),
      makeCandidate('RELIANCE.NS', 85, 2.0),
      makeCandidate('INFY.NS', 80, 3.0),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(2);
    expect(result[0].symbol).toBe('TCS.NS');
    expect(result[1].symbol).toBe('RELIANCE.NS');
  });

  test('should return empty array when weekly target is reached', async () => {
    signalModel.countByWeek.mockResolvedValue(10);

    const candidates = [
      makeCandidate('TCS.NS', 90, 2.5),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(0);
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({ reject_stage: 'FREQUENCY_CAP' })
    );
  });

  test('should return empty array when no candidates', async () => {
    const result = await selectTopSignals([], '2026-03-24');
    expect(result).toHaveLength(0);
  });

  test('should log deferred candidates as FREQUENCY_CAP', async () => {
    const candidates = [
      makeCandidate('A.NS', 90, 3.0),
      makeCandidate('B.NS', 85, 2.5),
      makeCandidate('C.NS', 80, 2.0),
      makeCandidate('D.NS', 75, 1.8),
      makeCandidate('E.NS', 70, 1.5),
    ];

    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(3);
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledTimes(2);
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'D.NS',
        reject_stage: 'FREQUENCY_CAP',
      })
    );
    expect(rejectedSignalModel.insertRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'E.NS',
        reject_stage: 'FREQUENCY_CAP',
      })
    );
  });

  test('should sort by confidence first, then risk_reward as tiebreaker', async () => {
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

  test('should handle weekly count exceeding target gracefully', async () => {
    signalModel.countByWeek.mockResolvedValue(15);

    const candidates = [makeCandidate('TCS.NS', 95, 3.0)];
    const result = await selectTopSignals(candidates, '2026-03-24');

    expect(result).toHaveLength(0);
  });
});
