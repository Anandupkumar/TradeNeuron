# 📈 AI Swing Trading System (NIFTY 50)

## Overview

An advanced rule-based swing trading system that analyzes NIFTY 50 stocks and generates high-quality trading signals (entry, stop loss, target, position size) with a confidence score.

The system uses **multi-strategy logic, market regime detection, adaptive thresholds, and risk management** to improve consistency across different market conditions.

> ⚠️ This is a decision-support tool, not an automated trading bot.

---

## 🚀 Key Features

### 🧠 Multi-Strategy Engine
Supports multiple trading strategies based on market conditions:

- Trend Pullback (Long)
- Breakout (Long)
- Range Trading (Sideways markets)
- Mean Reversion
- Trend Pullback (Short)
- Breakdown (Short)

---

### 📊 Market Regime Detection

Automatically detects market conditions and adapts strategy selection:

- **BULLISH** → Trend & breakout strategies  
- **SIDEWAYS** → Range & mean reversion  
- **BEARISH** → Short strategies  
- **HIGH VOLATILITY** → No trading (risk avoidance)

---

### ⚙️ Adaptive Thresholds

Dynamic indicator thresholds based on market behavior:

- RSI (adaptive zones)
- Volume (rolling percentiles)
- Volatility (VIX-based filtering)

---

### 💰 Risk & Position Management

- Risk per trade (configurable % of capital)
- ATR-based stop loss
- Minimum Risk:Reward (≥ 1:2)
- Max position size caps
- Separate allocation for long/short trades

---

### 📰 Sentiment Analysis

- News-based filtering
- Negation-aware keyword logic
- Optional external sentiment API integration
- Confidence scoring for sentiment

---

### 🏗️ Robust Data Pipeline

- Primary: Yahoo Finance
- Fallback: NSE Bhavcopy (CSV)
- Data validation & retry handling
- Missing data safeguards

---

### 🧪 Backtesting & Validation

- Walk-forward backtesting
- Paper trading support
- Cost model (brokerage + slippage)

---

## 📦 Example Signal

```json
{
  "stock": "RELIANCE",
  "signal": "BUY",
  "confidence": 78,
  "entry": 2450,
  "stopLoss": 2380,
  "target": 2600,
  "positionSize": 12
}
