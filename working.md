# TradeNeuron — High-Level System Working

## What It Does

TradeNeuron is an AI-based swing trading signal generation system for NIFTY 50 stocks. It automatically fetches market data, computes technical indicators, evaluates multiple trading strategies, and produces actionable BUY/SELL signals with position sizing. It also paper-trades those signals and tracks performance over time.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND                            │
│   React 18 + TypeScript + Vite + Tailwind + shadcn/ui    │
│   Port 5173 (dev) / Nginx (prod)                         │
│                                                          │
│   Pages: Dashboard, Signals, Stock Detail, Paper Trading, │
│          Backtest, Watchlist, Settings                    │
│                                                          │
│   State: TanStack Query (server) + Zustand (client)      │
└──────────────────┬───────────────────────────────────────┘
                   │  HTTP (REST API)
                   │  X-API-Key auth header
                   ▼
┌──────────────────────────────────────────────────────────┐
│                      BACKEND                             │
│   Node.js + Express + MySQL                              │
│   Port 3000                                              │
│                                                          │
│   Routes: /api/v1/health, signals, stock, history,       │
│           backtest, favorites, paper-trading,             │
│           trade-decisions, strategies                     │
│                                                          │
│   Middleware: Helmet, CORS, Rate Limiter, API Key Auth,  │
│              Request Logger, Error Handler                │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│   MySQL DB   │    │  Yahoo Finance   │
│  16 tables   │    │  (data source)   │
│  via mysql2  │    │  via direct HTTP │
│              │    │  + Python yfinance│
└──────────────┘    └──────────────────┘
```

---

## Daily Pipeline (13 Steps)

The core of the system is a **daily automated pipeline** that runs via cron at **4:30 PM IST** (after Indian market close) on weekdays. It can also be triggered manually.

```
Step 1   Fetch Candles         Probe Yahoo API availability via lightweight spark
                               endpoint. If reachable, download OHLCV data for
                               all 50 NIFTY stocks + NIFTY index + India VIX.
                               If rate-limited, skip and use existing seeded data.

Step 2   Validate Data         Check for gaps, stale data, and anomalies

Step 3   Compute Indicators    EMA (20/50/200), RSI, MACD (line/signal/histogram),
                               ATR, Volume Change — stored per symbol per date

Step 4   Compute Features      Derived boolean/categorical features:
                               is_uptrend, rsi_zone, is_volume_spike, is_breakout,
                               close_position, ema50_slope, near_support, is_ranging,
                               z_score_20d, distance_from_52w_high,
                               relative_strength_vs_nifty, rvol, volume_tier,
                               vwap, vwap_distance_pct, is_near_vwap,
                               delivery_pct, is_high_delivery

Step 5   Adaptive Thresholds   Dynamically adjust VIX thresholds and strategy
                               parameters based on recent market conditions

Step 6   Market Regime Check   Classify market as BULLISH / SIDEWAYS / BEARISH /
                               HIGH_VOLATILITY based on NIFTY vs EMA200 + VIX
                               (HIGH_VOLATILITY → skip signal generation)

Step 7   Run Strategies        Execute regime-gated strategies per symbol
                               (only strategies enabled in strategy_config):
                               BULLISH  → Trend Pullback, Breakout,
                                          Range, Mean Reversion
                               SIDEWAYS → Range, Mean Reversion
                               BEARISH  → Trend Pullback Short, Breakdown

Step 8   Fundamental Filter    Remove signals for stocks with poor fundamentals
                               (high debt/equity, declining EPS, pledged promoter holdings)

Step 9   Sentiment Filter      Remove signals contradicted by negative news sentiment
                               (RSS feeds + optional Finnhub integration)

Step 10  Score & Generate      Score remaining signals by confidence (0-100)
                               with soft filters (breakout strength, EMA50 slope).
                               Assign confidence tier (HIGH/NORMAL/LOW).
                               Deduplicate per symbol/direction, apply gates
                               (VWAP, PCR, sector cap, active cap), compute
                               position sizing (shares, capital risk, position value)

Step 11  Store Signals         Persist new signals to DB + auto-create paper trades

Step 12  Update Statuses       Check active signals: TARGET_HIT / SL_HIT / EXPIRED
                               (EXPIRED with negligible movement → EXPIRED_PENALIZED)

Step 13  Update Paper Trades   Mark paper trades as CLOSED with PnL when their
                               corresponding signal exits. Uses actual_entry_price
                               (next-day open) for realistic PnL calculations
```

---

## Trading Strategies

| Strategy | Regime | Direction | Core Logic |
|---|---|---|---|
| Trend Pullback | BULLISH | LONG | Price pulls back to EMA20 in an established uptrend, RSI recovers from pullback zone |
| Breakout | BULLISH | LONG | Price breaks above resistance with volume confirmation |
| Range | BULLISH / SIDEWAYS | LONG | Price bounces off range support in a consolidating market |
| Mean Reversion | BULLISH / SIDEWAYS | LONG | Z-score indicates oversold mean-reversion opportunity |
| Trend Pullback Short | BEARISH | SHORT | Price rallies into EMA20 resistance in a downtrend |
| Breakdown | BEARISH | SHORT | Price breaks below support with volume confirmation |

Each strategy produces: entry price, stop loss, target price, risk-reward ratio, confidence score, and reasoning.

---

## Position Sizing

Every signal includes calculated position sizing based on:
- **Total capital**: configurable (default ₹10,00,000)
- **Risk per trade**: 1% of capital
- **Max position**: 10% of capital (5% for shorts)
- **Shares to buy**: `capital_risk / (entry - stop_loss)`
- **Position value**: `shares × entry_price`

---

## Signal Lifecycle

```
ACTIVE  ──┬── price hits target ──────→  TARGET_HIT        (win)
           ├── price hits stop loss ───→  SL_HIT            (loss)
           └── holding period expires ─┬→ EXPIRED            (neutral, meaningful movement)
                                       └→ EXPIRED_PENALIZED  (neutral, negligible movement — penalty applied)
```

Paper trades mirror this lifecycle automatically. PnL uses the next-day open as the realistic entry price (`actual_entry_price`), not the signal day's close.

---

## Weekly Jobs

### Fundamentals Refresh
Runs every **Saturday at 6 PM IST**. Fetches Yahoo Finance quote summaries for fundamental data (debt/equity, EPS growth, revenue growth, promoter pledging). This data is used by Step 8 of the daily pipeline to filter out fundamentally weak stocks.

### Weight Calibration + Strategy Feedback
Runs every **Sunday at 2 AM IST**. Two-phase job:
1. **Weight calibration** — adjusts scoring weights based on signal outcome win rates per feature (gradual blend for 15-29 outcomes, full adjustment for 30+)
2. **Strategy performance evaluation** — queries per-strategy paper trade results (last 90 days). Auto-disables strategies with win rate < 40% (15+ trades), auto-re-enables at >= 50% (20+ trades). Sends Telegram alerts on state changes.

---

## Frontend Pages

| Page | What It Shows |
|---|---|
| **Dashboard** | Active signal count, market regime, paper trading PnL, watchlist, equity curve |
| **Signals** | Filterable/sortable table of all signals with status badges, confidence bars, detail drawer |
| **Stock Detail** | Candlestick chart with indicator overlays, full indicator grid, feature grid, active signal |
| **Paper Trading** | Summary stats (win rate, total PnL, drawdown), trade table, PnL curve chart |
| **Backtest** | Strategy comparison table, walk-forward charts, per-strategy result cards |
| **Watchlist** | Favorited symbols with quick-add dialog, linked to signal data |
| **Settings** | API key management, theme toggle, feature flags |

---

## Authentication

- API key-based (not user accounts)
- Frontend stores API key + auto-generated UUID in localStorage via Zustand
- Backend validates `X-API-Key` header on all routes except `/health`
- On 401, frontend dispatches `tn:auth-failure` event → shows re-entry modal

---

## Tech Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui, TanStack Query 5, Zustand 4, Lightweight Charts, Recharts, Axios |
| **Backend** | Node.js, Express 4, MySQL 8, mysql2, Axios (direct Yahoo API), technicalindicators, node-cron, Winston, Joi, Helmet |
| **Data Seeding** | Python 3 + yfinance (for reliable historical data download) |
| **Testing** | Frontend: Vitest + Testing Library + MSW (54 tests). Backend: Jest + Supertest (20 tests) |
| **Deployment** | Vite build (code-split), Nginx reverse proxy, .env-based config |

---

## Data Flow Summary

```
Yahoo Finance  ──→  Candles (OHLCV)  ──→  Indicators  ──→  Features
  (direct HTTP       (seeded via Python
  or Python yfinance) yfinance + JSON)
                                                              │
                   Fundamentals (weekly) ──────────────┐      │
                   Sentiment (daily) ──────────────┐   │      │
                                                   │   │      ▼
                                                   ▼   ▼   Strategies
                                                   Filter ← (regime-gated)
                                                      │
                                                      ▼
                                                   Scoring → Signals → Paper Trades
                                                                │
                                                                ▼
                                                   Frontend Dashboard (real-time)
```
