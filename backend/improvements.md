# TradeNeuron — Execution Improvement Plan

## Guiding Principles
- Fix data integrity & bias first
- Avoid double-counting signals
- Prefer soft scoring over hard rejects
- Maintain backward compatibility

---

# 🔴 Phase 1 — Critical Fixes (Before Next Live Signals)

## 1. Fix Quality Scoring (SHORT branch)
**File:** `scoring.service.js`
```js
if (direction === 'SHORT') {
  if (features.is_high_delivery) quality += 6
  if (features.ema50_slope < -0.5) quality += 3
  if (features.is_near_vwap) quality += 3
  quality = Math.min(quality, 12)
}
```

---

## 2. Expand RSI Logic for SHORT
**File:** `trend_pullback_short.strategy.js`
```js
const nearResistance = close >= highest(high, 10) * 0.97

const validShort =
  (rsi_zone === 'OVERBOUGHT') ||
  (
    rsi_zone === 'NEUTRAL' &&
    features.ema50_slope < 0 &&
    nearResistance &&
    features.relative_strength_vs_nifty < 0
  )
```

---

## 3. Earnings Blackout Window
**File:** `daily_pipeline.job.js`
```js
const daysTo = tradingDaysUntil(today, earningsDate)
const daysSince = tradingDaysBetween(earningsDate, today)

if ((daysTo >= 1 && daysTo <= 2) || (daysSince >= 0 && daysSince <= 1)) {
  rejectSignal('EARNINGS_BLACKOUT')
}
```

---

## 4. Confidence Calibration (Bayesian Adjustment)
**File:** `signal.service.js`
```js
const cal = await getCalibration(strategy, raw_confidence)

if (cal && cal.sample_size >= 20) {
  const priorWeight = 20

  const adjusted =
    (raw_confidence * priorWeight + cal.win_rate * 100 * cal.sample_size) /
    (priorWeight + cal.sample_size)

  signal.confidence = Math.round(adjusted)
  signal.calibrated = true
}
```

---

## 5. Backtesting Regime Correction
**File:** `backtest.service.js`
```js
const histRegime = computeHistoricalRegime(signal.date)

if (isShortStrategy(signal)) {
  if (histRegime !== 'BEARISH') {
    signal.confidence *= 0.7
  }
}
```

---

# 🟠 Phase 2 — Signal Quality Improvements

## 6. Stock EMA200 Confirmation
```sql
ALTER TABLE features ADD COLUMN is_below_ema200 BOOLEAN;
```
- Use as score boost (+5), not hard filter

---

## 7. Sector Confirmation
```js
if (sectorTrend !== stockDirection) {
  confidence -= 10
}
```

---

## 8. Sentiment Entity Mapping
```js
const SYMBOL_SEARCH_NAMES = {
  'TCS.NS': 'Tata Consultancy Services'
}
```

---

## 9. ATR Stop-Loss Cap
```js
const maxSL = entry * 0.06
stopLoss = Math.min(calculatedSL, maxSL)
```

---

## 10. Rename VWAP → VWMA
```sql
ALTER TABLE features CHANGE vwap vwma DECIMAL(10,2);
ALTER TABLE features CHANGE vwap_distance_pct vwma_distance_pct DECIMAL(5,2);
```

---

## 11. Futures SL Buffer
```js
if (execution_type === 'FUTURES') {
  stopLoss *= 1.003
}
```

---

# 🟢 Phase 3 — Portfolio & Risk Engine

## 12. Correlation-Based Position Scaling
```js
const sameSectorCount = getActiveSignals(symbol, sector)
adjustedRisk = baseRisk / (sameSectorCount + 1)
```

---

## 13. Dynamic Signal Frequency
```js
const multiplier = {
  BULLISH: 1.0,
  BEARISH: 0.7,
  SIDEWAYS: 0.6
}

maxSignals = BASE_MAX * multiplier[regime]
```

---

## 14. Drawdown-Based Risk Scaling
```js
if (drawdown > 0.15) riskScale = 0.5
else if (drawdown > 0.08) riskScale = 0.75
else riskScale = 1.0
```

---

## 15. Signal Freshness / Gap Handling
```js
const drift = Math.abs(actual - entry) / entry

if (drift > 0.02 && gapAgainstTrade) {
  signal.entry_degraded = true
}
```

---

## 16. Portfolio Risk Cap
```js
if (totalCapitalRisk > 0.05 * capital) {
  rejectSignal('PORTFOLIO_RISK_CAP')
}
```

---

## 17. Directional Exposure Control
```js
if (shortExposure > 0.7 * totalExposure) {
  reducePositionSize()
}
```

---

# 📅 Execution Timeline

## Week 1
- Complete Phase 1

## Week 2
- EMA200
- Sentiment fix
- SL cap
- VWMA rename

## Week 3
- Sector confirmation
- Futures adjustment

## Week 4+
- Portfolio risk engine
- Correlation control
- Drawdown scaling
- Signal freshness

---

# 🎯 Final Outcome

### After Phase 1
Accurate, bias-free signals

### After Phase 2
Higher-quality signals

### After Phase 3
Portfolio-safe, capital-protected system

---

# 🧠 Summary

This plan upgrades TradeNeuron from:

**Signal Generator → Risk-Aware Trading System**

