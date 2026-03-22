# 📈 AI Swing Trading System (NIFTY 50)

## Overview

A simple rule-based system that analyzes NIFTY 50 stocks and generates swing trading signals (entry, stop loss, target) with a confidence score.

> This is a decision-support tool, not an auto-trading bot.

---

## What it does

* Fetches daily OHLCV data
* Calculates indicators (EMA, RSI, MACD, ATR)
* Applies strategies (trend pullback, breakout)
* Scores setups and outputs signals
* Basic backtesting to validate logic

---

## Data Source

* Primary: Yahoo Finance (unofficial)
* Fallback: NSE bhavcopy (CSV)

---

## Example Signal

```json
{
  "stock": "RELIANCE",
  "signal": "BUY",
  "confidence": 78,
  "entry": 2450,
  "stopLoss": 2380,
  "target": 2600
}
```

---

## Tech Stack

* Node.js (ES6)
* Express
* MySQL
* axios, technicalindicators

---

## Flow

Fetch Data → Indicators → Strategies → Score → Signal

---

## Run (high level)

1. Setup DB
2. Configure env (API, DB)
3. Run data job
4. Run analysis job

---

## Disclaimer

For learning/research only. No profit guarantees.

