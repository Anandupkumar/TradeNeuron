const request = require('supertest');

jest.mock('../../src/config/db', () => ({
  pool: { query: jest.fn().mockResolvedValue([[{ 1: 1 }]]) },
  testConnection: jest.fn().mockResolvedValue(),
  gracefulShutdown: jest.fn().mockResolvedValue(),
}));

jest.mock('../../src/jobs/cron', () => ({
  startCronJobs: jest.fn(),
}));

jest.mock('../../src/models/signal.model', () => ({
  findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }),
  findActive: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/models/candle.model', () => ({
  findLatestBySymbol: jest.fn().mockResolvedValue(null),
  findBySymbolAndDateRange: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/models/indicator.model', () => ({
  findLatestBySymbol: jest.fn().mockResolvedValue(null),
  findBySymbolAndDateRange: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../src/models/feature.model', () => ({
  findLatestBySymbol: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../src/models/backtest_result.model', () => ({
  findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }),
}));

jest.mock('../../src/models/paper_trade.model', () => ({
  findAll: jest.fn().mockResolvedValue({ rows: [], total: 0, page: 1, limit: 20 }),
  getSummary: jest.fn().mockResolvedValue({
    total_trades: 0, open_trades: 0, closed_trades: 0,
    winning_trades: 0, losing_trades: 0,
    avg_pnl_pct: null, best_trade_pct: null, worst_trade_pct: null, total_pnl_pct: 0,
  }),
}));

jest.mock('../../src/models/favorite.model', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findByUser: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue({ id: 1, user_identifier: 'test', symbol: 'RELIANCE.NS' }),
  remove: jest.fn().mockResolvedValue(true),
}));

const app = require('../../server');

describe('API Integration Tests', () => {
  const api_key = 'test-api-key';

  describe('GET /api/v1/health', () => {
    test('should return 200 with health status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });

  describe('GET /api/v1/signals', () => {
    test('should require API key', async () => {
      const res = await request(app).get('/api/v1/signals');
      expect(res.status).toBe(401);
    });

    test('should return signals with valid API key', async () => {
      const res = await request(app)
        .get('/api/v1/signals')
        .set('X-API-Key', api_key);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signals).toEqual([]);
    });
  });

  describe('GET /api/v1/signals/active', () => {
    test('should return active signals', async () => {
      const res = await request(app)
        .get('/api/v1/signals/active')
        .set('X-API-Key', api_key);
      expect(res.status).toBe(200);
      expect(res.body.data.signals).toEqual([]);
    });
  });

  describe('GET /api/v1/stock/:symbol', () => {
    test('should return 404 for unknown symbol', async () => {
      const res = await request(app)
        .get('/api/v1/stock/RELIANCE.NS')
        .set('X-API-Key', api_key);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/backtest/results', () => {
    test('should return backtest results', async () => {
      const res = await request(app)
        .get('/api/v1/backtest/results')
        .set('X-API-Key', api_key);
      expect(res.status).toBe(200);
      expect(res.body.data.results).toEqual([]);
    });
  });

  describe('GET /api/v1/paper-trading/summary', () => {
    test('should return paper trading summary', async () => {
      const res = await request(app)
        .get('/api/v1/paper-trading/summary')
        .set('X-API-Key', api_key);
      expect(res.status).toBe(200);
      expect(res.body.data.total_trades).toBe(0);
    });
  });

  describe('POST /api/v1/favorites', () => {
    test('should require X-User-Id header', async () => {
      const res = await request(app)
        .post('/api/v1/favorites')
        .set('X-API-Key', api_key)
        .send({ symbol: 'RELIANCE.NS' });
      expect(res.status).toBe(401);
    });

    test('should add favorite with valid headers', async () => {
      const res = await request(app)
        .post('/api/v1/favorites')
        .set('X-API-Key', api_key)
        .set('X-User-Id', 'test-user-123')
        .send({ symbol: 'RELIANCE.NS' });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid symbol', async () => {
      const res = await request(app)
        .post('/api/v1/favorites')
        .set('X-API-Key', api_key)
        .set('X-User-Id', 'test-user-123')
        .send({ symbol: 'INVALID.NS' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/favorites', () => {
    test('should return favorites for user', async () => {
      const res = await request(app)
        .get('/api/v1/favorites')
        .set('X-API-Key', api_key)
        .set('X-User-Id', 'test-user-123');
      expect(res.status).toBe(200);
      expect(res.body.data.favorites).toEqual([]);
    });
  });
});
