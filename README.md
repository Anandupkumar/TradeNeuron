# TradeNeuron — AI Swing Trading System (NIFTY 50)

An advanced rule-based swing trading system that analyzes NIFTY 50 stocks and generates high-quality trading signals with entry, stop loss, target, position sizing, and a confidence score.

The system uses **multi-strategy logic, market regime detection, adaptive scoring, fundamental + sentiment filtering, and self-improving strategy feedback** to maintain consistency across different market conditions.

> This is a decision-support tool, not an automated trading bot.

---

## Key Features

- **6 Trading Strategies** — Trend Pullback, Breakout, Range, Mean Reversion (Long) + Trend Pullback Short, Breakdown (Short)
- **Market Regime Detection** — BULLISH / SIDEWAYS / BEARISH / HIGH_VOLATILITY with automatic strategy routing
- **Adaptive Scoring** — Confidence tiers (HIGH / NORMAL / LOW) with soft filters for breakout strength and trend slope
- **Self-Improving** — Weekly calibration adjusts scoring weights; strategies that underperform are auto-disabled via paper trade feedback
- **Fundamental Filter** — Rejects stocks with high debt, declining EPS/revenue, or excessive promoter pledging
- **Sentiment Filter** — Google News RSS with negation-aware keyword matching
- **Paper Trading** — Automated simulated trades with realistic next-day-open entry pricing
- **Walk-Forward Backtesting** — Historical validation with cost model (slippage + brokerage)
- **Position Sizing** — ATR-based risk sizing with per-trade and per-sector caps
- **Full Dashboard** — React frontend with charts, filters, watchlist, and real-time pipeline status

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui, TanStack Query 5, Zustand 4, Lightweight Charts, Recharts |
| **Backend** | Node.js, Express 4, MySQL 8, mysql2, technicalindicators, node-cron, Winston, Joi, Helmet |
| **Data** | Yahoo Finance (direct HTTP), NSE Bhavcopy (fallback), Python yfinance (historical seeding) |
| **Testing** | Vitest + Testing Library + MSW (frontend), Jest + Supertest (backend) |

---

## Quick Start

### Prerequisites

- Node.js v18+
- MySQL 8
- Python 3 + pip (`yfinance` package)

### Setup

```bash
# Backend
cd backend
cp .env.example .env        # Edit with your DB credentials and API_KEY
npm install
node scripts/migrate.js     # Create database tables

# Frontend
cd ../frontend
cp .env.example .env        # Set VITE_API_KEY to match backend API_KEY
npm install
```

### Seed Historical Data

```bash
cd backend
pip3 install --user yfinance
npm run download             # Fetch 3 years of OHLCV data (~90 seconds)
npm run seed                 # Load into database
npm run pipeline             # Run analysis to generate first signals
```

### Run

```bash
# Terminal 1 — Backend
cd backend && npm start      # Runs on port 3000

# Terminal 2 — Frontend
cd frontend && npm run dev   # Runs on port 5173
```

Open **http://localhost:5173** and enter the API key to start.

---

## Daily Pipeline (13 Steps)

Runs automatically at **4:30 PM IST** on trading days via cron:

1. Fetch candles (50 stocks + NIFTY index + India VIX)
2. Validate data (gap detection, holiday calendar)
3. Compute indicators (EMA, RSI, MACD, ATR, Volume)
4. Extract features (uptrend, breakout, RVOL, VWAP, delivery %, etc.)
5. Compute adaptive thresholds
6. Market regime check (NIFTY EMA200 + VIX gate)
7. Run strategies (only enabled ones, regime-gated)
8. Fundamental filter
9. Sentiment filter
10. Score, deduplicate, apply gates, position sizing
11. Store signals + create paper trades
12. Update signal statuses (TARGET_HIT / SL_HIT / EXPIRED / EXPIRED_PENALIZED)
13. Update paper trades (uses next-day open for realistic PnL)

---

## Frontend Pages

| Page | Purpose |
|------|---------|
| **Dashboard** | Active signals, market regime, equity curve, pipeline status |
| **Signals** | Filterable signal table with detail drawer, confidence tiers |
| **Stock Detail** | Candlestick chart, indicator grid, feature grid |
| **Paper Trading** | Win rate, PnL, drawdown, trade table, equity curve |
| **Backtest** | Per-strategy metrics, walk-forward charts |
| **Watchlist** | Favorited stocks with active signal indicators |
| **Settings** | API key, theme, feature flags |

---

## API

Base URL: `/api/v1` — authenticated via `X-API-Key` header.

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Server health (no auth required) |
| `GET /signals` | List signals with filters |
| `GET /signals/rejected` | Rejected signal audit log |
| `GET /stock/:symbol` | Stock detail with indicators + features |
| `GET /history/:symbol` | OHLCV candle history |
| `GET /backtest` | Backtest results |
| `GET /paper-trading` | Paper trade list + summary |
| `GET /favorites` | User watchlist |
| `GET /strategies` | Strategy enable/disable status |
| `GET /trade-decisions/:symbol` | Trade decision audit log |

---

## Example Signal

```json
{
  "symbol": "RELIANCE.NS",
  "signal_type": "BUY",
  "direction": "LONG",
  "confidence": 82,
  "confidence_tier": "NORMAL",
  "entry_price": 2450.00,
  "stop_loss": 2380.00,
  "target_price": 2600.00,
  "risk_reward": 2.14,
  "shares_to_buy": 28,
  "position_value": 68600.00,
  "strategy_source": "TREND_PULLBACK"
}
```

---

## Documentation

| File | Description |
|------|-------------|
| `working.md` | High-level system architecture and data flow |
| `how-to-use.md` | Setup and usage guide for developers |
| `how-to-use-as-trader.md` | Daily workflow guide for traders |
| `backend/backend_technical_document.md` | Full backend specification |
| `frontend/frontend_technical_document.md` | Full frontend specification |
| `backend/improvements.md` | Backend improvement log |
| `frontend/improvements.md` | Frontend improvement log |

---

*TradeNeuron is a research and analysis tool. All trading involves risk. Past performance does not guarantee future results.*
