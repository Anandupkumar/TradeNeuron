# 📈 AI-Based Swing Trading System (NIFTY 50)

## 🚀 Overview

This project is a **rule-based, AI-assisted swing trading system** designed to analyze NIFTY 50 stocks and generate **high-probability trade signals**.

The system automates technical analysis and provides:

* Entry points
* Stop loss levels
* Target prices
* Confidence scores (based on backtested logic)

> ⚠️ This is a **decision-support system**, not an automated trading bot.

---

## 🧠 Core Idea

Instead of predicting markets, the system:

* Scans historical data
* Identifies trading setups
* Assigns probability (confidence)
* Suggests trades with risk management

```
DATA → INDICATORS → FEATURES → SCORING → SIGNAL
```

---

## 🏗️ Features

### ✅ Data Ingestion

* Fetches OHLCV data for NIFTY 50 stocks
* Uses:

  * Yahoo Finance (primary)
  * NSE Bhavcopy (fallback)

### ✅ Technical Analysis

* EMA (20, 50, 200)
* RSI
* MACD
* ATR
* Volume analysis

### ✅ Strategy Engine

* Trend Pullback Strategy
* Breakout Strategy

### ✅ Scoring Engine

* Rule-based weighted scoring
* Generates confidence (0–100)

### ✅ Signal Generation

Outputs:

* Buy/Sell signal
* Entry price
* Stop loss
* Target
* Trade reasoning

### ✅ Backtesting (MVP)

* Validates strategies on historical data
* Provides:

  * Win rate
  * Drawdown
  * Profitability

---

## 📊 Example Output

```json
{
  "stock": "RELIANCE",
  "signal": "BUY",
  "confidence": 78,
  "entry": 2450,
  "stopLoss": 2380,
  "target": 2600,
  "reason": ["Trend", "Breakout"]
}
```

---

## ⚙️ Tech Stack

### Backend

* Node.js (ES6)
* Express.js

### Database

* MySQL

### Libraries

* axios
* technicalindicators

---

## 📂 Project Structure (Suggested)

```
/src
  /services
    dataService.js
    indicatorService.js
    strategyService.js
    scoringService.js

  /strategies
    trendPullback.js
    breakout.js

  /jobs
    dailyJob.js

  /models
    candle.model.js
    indicator.model.js
    signal.model.js

  /utils
    logger.js
    helpers.js
```

---

## 🔄 Workflow

1. Fetch market data
2. Store in database
3. Calculate indicators
4. Generate features
5. Apply strategies
6. Score trades
7. Generate signals
8. Serve via API

---

## 🧪 Backtesting Logic

Trade outcome:

* ✅ Success → Target hit before stop loss
* ❌ Failure → Stop loss hit
* ⚪ Neutral → Neither hit within timeframe

Used to:

* Validate strategies
* Tune scoring weights

---

## ⚠️ Limitations

* Relies on Yahoo Finance (unofficial API)
* Market is unpredictable
* Not suitable for high-frequency trading

---

## 🛣️ Roadmap

### Phase 1

* Data ingestion
* Indicator engine

### Phase 2

* Strategy engine
* Backtesting

### Phase 3

* Scoring optimization

### Future

* ML models
* Real-time alerts
* Portfolio tracking

---

## 📌 Disclaimer

This system is for **educational and research purposes only**.

It does NOT guarantee profits. Always validate signals before trading.

---

## 🙌 Contribution

Feel free to contribute by:

* Improving strategies
* Optimizing scoring
* Adding new features

---

## ⭐ Final Note

This project aims to act as your **personal trading assistant**, helping you:

* Reduce manual analysis
* Improve consistency
* Make data-driven decisions
