# AI-Based Swing Trading System (NIFTY 50) – Requirements Document

## 1. Objective
Build a system that automatically analyzes NIFTY 50 stocks using historical data and rule-based scoring to generate high-probability swing trading signals (entry, stop loss, target).

---

## 2. Scope
The system will:
- Fetch and store historical market data (stocks + NIFTY index)
- Perform technical analysis using indicators
- Generate trading signals using rule-based scoring
- Provide probability-style confidence (derived from backtesting)
- Expose APIs for frontend

The system will NOT:
- Guarantee profits
- Fully automate execution
- Use ML in MVP

---

## 3. System Architecture
DATA SOURCE → STORAGE → INDICATORS → FEATURES → SCORING → SIGNALS → API → FRONTEND

---

## 4. Functional Requirements

### 4.1 Data Source (FINALIZED)

Primary (MVP):
- Yahoo Finance (unofficial API wrappers)

Fallback (MANDATORY):
- NSE Bhavcopy (daily EOD CSV import)

Future:
- Zerodha Kite API (paid, production)

#### Notes:
- Yahoo uses symbols like RELIANCE.NS
- May return incomplete/delayed data
- Must NOT be single point of failure

#### Mitigation:
- Daily validation check (missing candles)
- Fallback ingestion from NSE bhavcopy
- Store all fetched data (no repeated calls)

#### Data Requirements:
- OHLCV
- Daily timeframe only
- Historical: 2–3 years minimum

---

### 4.2 Data Ingestion
- Fetch all NIFTY 50 stocks + NIFTY index
- Daily cron (after market close)

---

### 4.3 Data Storage (MySQL)

#### candles
- id
- symbol
- date
- open
- high
- low
- close
- volume

#### indicators
- id
- symbol
- date
- ema20
- ema50
- ema200
- rsi
- macd
- atr
- volume_change

#### signals
- id
- symbol
- date
- signal
- confidence
- entry
- stop_loss
- target
- strategy_source

---

### 4.4 Indicator Engine
- EMA (20, 50, 200)
- RSI
- MACD
- ATR
- Volume % change

---

### 4.5 Feature Engineering

Features:
- Trend: close > EMA50
- RSI zones
- Volume spike
- Breakout detection
- Distance from 52-week high
- Relative strength vs NIFTY

---

### 4.6 Labeling Logic

SUCCESS:
- Target hit before stop loss

FAILURE:
- Stop loss hit at any time

NEUTRAL:
- Neither hit within holding period (5–10 days)

---

### 4.7 Strategy Engine

#### Strategy 1: Trend Pullback
Conditions:
- Price > EMA50
- RSI 40–60
- Near support

#### Support Definition (FINALIZED):
Use hybrid approach:
- Recent swing low (last 10–15 candles)
- OR within 2% of EMA50

---

#### Strategy 2: Breakout
- Close above recent resistance (last 20 candles high)
- Volume spike (>1.5x avg volume)

---

### 4.8 Scoring Engine

Initial weights (to be validated):
- Trend → +30
- RSI pullback → +20
- Volume spike → +30
- Breakout → +20

#### IMPORTANT:
- These are NOT final
- Must be tuned via backtesting

---

### 4.9 Signal Deduplication Logic

If multiple strategies trigger:

Option Selected:
- Merge into single signal
- Combine scores
- Increase confidence
- Add multiple reasons

---

### 4.10 Signal Generation

Output:
{
  "stock": "RELIANCE",
  "signal": "BUY",
  "confidence": 78,
  "entry": 2450,
  "stopLoss": 2380,
  "target": 2600,
  "reason": ["Trend", "Breakout"]
}

Rules:
- RR ≥ 1:2
- Confidence > 70

---

### 4.11 Backtesting (MVP CRITICAL)

Run strategies on historical data

Metrics:
- Win rate
- Avg return
- Max drawdown

#### Feedback Loop:
- Adjust scoring weights based on results
- Improve strategy conditions

---

### 4.12 Scheduler
- Simple cron
- Daily execution

---

### 4.13 API Layer
- GET /signals
- GET /stock/:symbol
- GET /history/:symbol

---

## 5. Non-Functional Requirements

Performance:
- Process 50 stocks quickly

Reliability:
- Handle API failures
- Use fallback data

---

## 6. Tech Stack

Backend:
- Node.js (ES6)
- Express

DB:
- MySQL

Libraries:
- technicalindicators
- axios

---

## 7. Data Flow

Fetch → Store → Indicators → Features → Score → Signals → API

---

## 8. Risks

- Yahoo data inconsistency
- Strategy overfitting
- Market unpredictability

---

## 9. Future Enhancements

- ML models
- Real-time alerts
- Portfolio tracking

---

## 10. Success Metrics

- Win rate 55–65%
- RR ≥ 1:2

---

## 11. Development Phases

Phase 1:
- Data ingestion (Yahoo + fallback)
- Indicators

Phase 2:
- Strategies
- Backtesting
- Signal generation

Phase 3:
- Scoring optimization (manual tuning based on backtest results)

---

## 12. Conclusion

This system is a rule-based, backtested trading assistant designed to reduce manual analysis and improve decision quality through structured probability-based signals.

