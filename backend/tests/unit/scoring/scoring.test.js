jest.mock('../../../src/models/feature.model');
jest.mock('../../../src/models/indicator.model');

const { calculateScore } = require('../../../src/services/scoring/scoring.service');
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
      is_uptrend: 1, rsi_zone: 'NEUTRAL', is_volume_spike: 0, is_breakout: 0,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(30);
  });

  test('should score 100 when all factors are present', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_volume_spike: 1, is_breakout: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(100);
  });

  test('should score 70 for trend + RSI + breakout (meets min_confidence)', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_volume_spike: 0, is_breakout: 1,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 110, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(70);
  });

  test('should not score trend if ema_20 <= ema_50', async () => {
    featureModel.findBySymbolAndDate.mockResolvedValue({
      is_uptrend: 1, rsi_zone: 'PULLBACK', is_volume_spike: 1, is_breakout: 0,
    });
    indicatorModel.findBySymbolAndDate.mockResolvedValue({
      ema_20: 95, ema_50: 100,
    });

    const score = await calculateScore('RELIANCE.NS', '2026-03-23');
    expect(score).toBe(50); // RSI 20 + Volume 30
  });
});
