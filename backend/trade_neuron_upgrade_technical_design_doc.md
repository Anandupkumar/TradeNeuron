# TradeNeuron — Upgrade Technical Design Document

## Objective

This document defines the technical upgrade roadmap for the TradeNeuron swing trading engine based on:

- Live paper trading outcome analysis
- Strategy performance diagnostics
- Architecture review
- Portfolio behavior analysis
- Trade lifecycle analysis

The objective is NOT to add more indicators.

The objective is to:

1. Improve realized expectancy
2. Reduce expiry-driven capital inefficiency
3. Improve portfolio-level capital allocation
4. Improve probability calibration accuracy
5. Improve trade lifecycle management
6. Improve regime adaptation
7. Improve deployability and robustness

---

# Section 1 — Current System Assessment

## Existing Strengths

The current architecture already contains:

- Multi-layer signal filtering
- Regime-aware routing
- Adaptive weight calibration
- Bayesian confidence calibration
- Portfolio risk caps
- Sector exposure management
- Directional exposure controls
- Realistic execution modeling
- ATR trailing exits (partial strategies)
- Closed-loop performance feedback
- Strategy auto-disable framework

The system is NOT a beginner-level retail engine.

The current bottleneck is:

> Trade monetization efficiency, not signal generation.

---

# Section 2 — Core Problems Identified

## Problem A — Expiry Drain

### Observed Metrics

- Expiry rate: 55%
- Target hit rate: 6.9%
- Win rate: 48.28%
- Total PnL: -10.39%

### Root Cause

Trades correctly predict direction frequently enough.

However:

- movement magnitude is insufficient
- stale trades consume capital
- targets are not reached within hold windows
- static exits leak expectancy

### Impact

- Opportunity suppression
- Reduced capital turnover
- Negative realized expectancy
- Artificial signal scarcity

---

## Problem B — Hard Lifecycle Model

Current model:

```text
ACTIVE → TARGET / SL / EXPIRED
```

This is too simplistic.

Trades behave differently under:

- compression
- expansion
- trend persistence
- low-volatility drift

The engine currently does not model those states.

---

## Problem C — Portfolio Throughput Inefficiency

The system currently tracks:

- generated signals
- rejected signals
- accepted signals

But does NOT track:

- blocked high-confidence signals
- opportunity cost
- stale capital suppression

This prevents optimization of:

- signal caps
- sector caps
- active trade management

---

## Problem D — Coarse Probability Calibration

Current calibration:

```text
global confidence buckets
```

This causes:

- strategy contamination
- direction contamination
- regime contamination

Example:

```text
BREAKDOWN_SHORT in BEARISH
!=
MEAN_REVERSION_LONG in SIDEWAYS
```

Yet they influence the same probability buckets.

---

## Problem E — Static Regime Labels

Current:

```text
BULLISH
BEARISH
SIDEWAYS
HIGH_VOL
```

Markets are continuous.

This causes:

- delayed transitions
- abrupt strategy suppression
- late activation
- missed transition alpha

---

# Section 3 — Upgrade Architecture

---

# PHASE 1 — Expectancy Recovery Layer

## Objective

Convert existing predictive edge into positive realized expectancy.

Expected impact:

- Major expectancy improvement
- Lower expiry rate
- Higher capital efficiency
- Better portfolio turnover

---

# Upgrade 1 — Partial Profit Framework

## Objective

Improve realized RR while protecting against stale reversals.

---

## Required Schema Changes

### Table: `paper_trades`

Add:

```sql
ALTER TABLE paper_trades
ADD COLUMN partial_exit_1_done BOOLEAN DEFAULT FALSE,
ADD COLUMN partial_exit_1_price DECIMAL(12,4) NULL,
ADD COLUMN partial_exit_1_qty_pct DECIMAL(5,2) NULL,
ADD COLUMN remaining_position_pct DECIMAL(5,2) DEFAULT 100,
ADD COLUMN realized_pnl_partial DECIMAL(12,4) DEFAULT 0;
```

---

## Required Logic Changes

### File

```text
paper_trade.service.js
```

### New Trade Lifecycle

```text
ACTIVE
PARTIAL_EXITED
TRAILING
STALE
COMPRESSING
EXITED
```

---

## Strategy Policies

### TREND_PULLBACK / TREND_PULLBACK_SHORT

```javascript
{
  partial_exit_enabled: true,
  partial_exit_trigger_r: 1.0,
  partial_exit_pct: 50,
  move_sl_to_breakeven: true,
  trailing_after_partial: true,
  trailing_mode: 'ATR'
}
```

---

### BREAKOUT / BREAKDOWN

```javascript
{
  partial_exit_enabled: true,
  partial_exit_trigger_r: 1.5,
  partial_exit_pct: 25,
  trailing_after_partial: true,
  trailing_mode: 'ATR_AGGRESSIVE'
}
```

---

### RANGE / MEAN_REVERSION

```javascript
{
  partial_exit_enabled: true,
  partial_exit_trigger_r: 0.8,
  partial_exit_pct: 70,
  move_sl_to_breakeven: true,
  trailing_after_partial: false,
  fixed_exit_after_partial: true
}
```

---

## Required Methods

### New Method

```javascript
maybeExecutePartialExit(trade, currentPrice)
```

Responsibilities:

- Check R multiple reached
- Book partial quantity
- Update remaining quantity
- Move SL to breakeven if configured
- Activate trailing if configured
- Log lifecycle event

---

# Upgrade 2 — Dynamic Trade Lifecycle Engine

## Objective

Replace static expiry with contextual lifecycle management.

---

## New Trade States

### ACTIVE
Normal trade progression.

### TRENDING
Momentum expansion detected.

### STALE
Price movement insufficient after elapsed time.

### COMPRESSING
ATR + Bollinger bandwidth compression.

### FAILED
Directional thesis invalidated.

---

## Required Indicators

### ATR Percentile

```javascript
atr_percentile_20d
```

### Bollinger Bandwidth

```javascript
bb_width_pct
```

### Movement Efficiency Ratio

```javascript
movement_efficiency =
abs(current_price - entry_price) /
rolling_price_distance
```

---

## Lifecycle Rules

### Stale Trade Detection

```javascript
if (
  hold_elapsed_pct >= 0.6 &&
  unrealized_r < 0.3 &&
  movement_efficiency < threshold
) {
  trade.state = 'STALE';
}
```

---

### Compression Exit

```javascript
if (
  bb_width_pct < threshold &&
  atr_percentile_20d < threshold
) {
  exit_trade('VOLATILITY_COMPRESSION');
}
```

---

### Trend Extension

```javascript
if (
  rv_volume_persistence &&
  atr_expansion &&
  directional_strength
) {
  extend_hold_period();
}
```

---

# Upgrade 3 — Opportunity Cost Telemetry

## Objective

Measure alpha suppressed by stale capital.

---

## Required Schema

### Table: `blocked_signal_events`

```sql
CREATE TABLE blocked_signal_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  signal_id BIGINT,
  blocked_signal_id BIGINT,
  blocked_reason VARCHAR(64),
  blocked_confidence DECIMAL(5,2),
  active_trade_id BIGINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Track Reasons

```text
MAX_SIGNALS_PER_DAY
MAX_ACTIVE_TRADES
SECTOR_CAP
DIRECTIONAL_CAP
STALE_CAPITAL
```

---

## Required Metrics

### Opportunity Cost Score

```text
sum(blocked_signal_expected_value)
```

### Stale Capital Suppression Rate

```text
blocked_by_stale / total_blocked
```

---

# Upgrade 4 — Dynamic Frequency Threshold

## Objective

Replace hard signal caps with adaptive confidence thresholds.

---

## Current Problem

Strong early-week clusters suppress later higher-quality setups.

---

## New Logic

Instead of:

```javascript
TARGET_WEEKLY_SIGNALS = 10
```

Use:

```javascript
required_confidence =
base_confidence +
weekly_signal_pressure_multiplier
```

---

## Example

```javascript
if (weekly_signals >= 8) {
  min_confidence += 3;
}

if (weekly_signals >= 12) {
  min_confidence += 5;
}
```

---

# PHASE 2 — Probability & Regime Intelligence Layer

## Objective

Improve calibration quality and regime responsiveness.

---

# Upgrade 5 — Partitioned Probability Calibration

## Objective

Prevent cross-strategy probability contamination.

---

## Current Model

```text
global confidence buckets
```

---

## New Partition Model

Partition by:

```text
strategy
+ direction
+ regime
```

Example:

```text
BREAKDOWN_SHORT_BEARISH
BREAKDOWN_SHORT_HIGH_VOL
TREND_PULLBACK_LONG_BULLISH
```

---

## Required Schema Changes

### Table: `confidence_calibration`

Add:

```sql
ALTER TABLE confidence_calibration
ADD COLUMN strategy_source VARCHAR(64),
ADD COLUMN direction VARCHAR(16),
ADD COLUMN regime VARCHAR(32);
```

---

## Required Logic

Fallback hierarchy:

```text
strategy+direction+regime
→ strategy+direction
→ strategy
→ global
```

---

# Upgrade 6 — Probability-Based Regime Engine

## Objective

Replace hard regime switching with continuous regime weighting.

---

## Current Problem

Discrete regimes cause:

- late transitions
- abrupt strategy suppression
- unstable allocation

---

## New Regime Model

Instead of:

```text
BEARISH
```

Use:

```javascript
{
  bullish_probability: 0.18,
  bearish_probability: 0.72,
  sideways_probability: 0.10
}
```

---

## Required Features

### Breadth Momentum

```javascript
advance_decline_momentum
```

### Volatility State

```javascript
vix_regime_percentile
```

### Trend Persistence

```javascript
market_trend_strength
```

---

## Allocation Example

```javascript
breakout_weight = bullish_probability * breakout_base_weight;
mean_reversion_weight = sideways_probability * mr_base_weight;
```

---

# Upgrade 7 — Target Reachability Model

## Objective

Prevent structurally unreachable targets.

---

## New Logic

Target feasibility must consider:

- ATR
- volatility regime
- hold window
- momentum persistence

---

## Reachability Formula

```javascript
projected_move = atr * Math.sqrt(max_hold_days);
```

---

## Warning Condition

```javascript
if (target_distance > projected_move * 1.5) {
  signal.flags.push('TARGET_REACHABILITY_WARNING');
}
```

---

## Future Upgrade

Move from:

```text
fixed RR targets
```

To:

```text
probability-adjusted targets
```

---

# PHASE 3 — Portfolio Intelligence Layer

## Objective

Improve capital allocation efficiency.

---

# Upgrade 8 — Sector Expectancy Allocation

## Objective

Allocate more capital to empirically stronger sectors.

---

## Required Table

### `sector_performance_snapshots`

Track:

- expectancy
- win rate
- realized RR
- volatility-adjusted return

---

## Allocation Logic

```javascript
sector_risk_multiplier =
clamp(expectancy_score, 0.5, 1.5)
```

---

## Example

```text
IT → 1.2x
Insurance → 1.15x
FMCG → 0.75x
```

---

# Upgrade 9 — True Correlation Engine

## Objective

Replace sector proxy with statistical correlation.

---

## Current Limitation

```text
sector count != true diversification
```

---

## New Logic

Compute:

```javascript
rolling_20d_return_correlation
```

Across:

- active trades
- pending signals

---

## Correlation Risk Metric

```javascript
portfolio_correlation_score
```

---

## Position Size Adjustment

```javascript
adjusted_position_size =
base_size / (1 + correlation_score)
```

---

# Upgrade 10 — Dynamic Risk Budgeting

## Objective

Allocate risk based on empirical edge quality.

---

## Current Limitation

```text
global risk_pct_per_trade
```

---

## New Logic

```javascript
risk_pct =
base_risk_pct *
strategy_expectancy_multiplier *
regime_quality_multiplier *
sector_quality_multiplier
```

---

## Safety Bounds

```javascript
risk_pct = clamp(risk_pct, 0.25%, 1.5%)
```

---

# Upgrade 11 — Equity Curve Protection

## Objective

Reduce catastrophic drawdown risk.

---

## Global Risk Throttle

```javascript
if (rolling_drawdown > threshold) {
  global_risk_multiplier = 0.6;
}
```

---

## Recovery Logic

```javascript
if (rolling_equity_recovery > threshold) {
  gradually_restore_risk();
}
```

---

# Section 4 — Backtest Reliability Framework

## Objective

Ensure backtest predicts live behavior.

---

# Required Actions

## Align Exit Logic

Ensure:

```text
paper_trade.service.js
==
backtest.service.js
```

for:

- hold period
- trailing
- slippage
- partial exits
- stale exits
- compression exits

---

## Required Validation Metrics

### Compare

```text
paper WR vs backtest WR
paper expectancy vs backtest expectancy
paper expiry rate vs backtest expiry rate
```

---

## Acceptance Thresholds

```text
WR deviation < 8%
expectancy deviation < 15%
expiry deviation < 10%
```

---

# Section 5 — Metrics & Monitoring

## New Dashboard Metrics

Track:

### Lifecycle Metrics

- stale trade rate
- compression exit rate
- partial exit success rate
- trend extension rate

---

### Portfolio Metrics

- opportunity cost score
- blocked alpha score
- capital utilization efficiency
- average capital lock duration

---

### Probability Metrics

- calibration error
- strategy-level Brier score
- regime prediction accuracy

---

### Risk Metrics

- rolling drawdown
- portfolio correlation score
- risk concentration score

---

# Section 6 — Rollout Plan

---

# Stage 1 — Immediate

Implement first:

1. Partial profit framework
2. Dynamic trade lifecycle engine
3. Dynamic frequency threshold
4. Opportunity cost telemetry
5. Backtest/live parity fixes

Expected outcome:

- expiry reduction
- positive expectancy shift
- smoother equity curve

---

# Stage 2 — Intelligence Layer

Implement:

6. Partitioned calibration
7. Probability regime engine
8. Target reachability warnings

Expected outcome:

- better regime responsiveness
- improved allocation quality
- improved probability accuracy

---

# Stage 3 — Portfolio Layer

Implement:

9. Sector expectancy allocation
10. True correlation engine
11. Dynamic risk budgeting
12. Equity protection

Expected outcome:

- lower drawdowns
- improved scalability
- institutional-grade capital behavior

---

# Section 7 — Final Expected System State

After implementation:

## The system should become:

- regime-adaptive
- portfolio-aware
- lifecycle-aware
- probability-driven
- expectancy-optimized

---

## Target Improvements

| Metric | Current | Target |
|---|---|---|
| Expiry Rate | 55% | < 30% |
| Avg Trade Expectancy | Negative | Positive |
| Target Hit Rate | 6.9% | > 20% |
| Backtest vs Paper Drift | Large | Small |
| Portfolio Drawdown | 15.79% | < 10% |
| Capital Utilization Efficiency | Low | High |

---

# Final Conclusion

The current TradeNeuron system already demonstrates:

- predictive capability
- strong architecture
- advanced signal engineering
- realistic execution modeling

The remaining challenge is:

> converting predictive edge into efficient realized portfolio returns.

The upgrades in this document focus specifically on:

- expectancy extraction
- lifecycle optimization
- probability refinement
- portfolio intelligence
- capital efficiency

rather than adding more indicators or more strategies.

This is the correct direction for evolving the system from:

```text
advanced prototype
```

into:

```text
deployable systematic swing trading engine
```

