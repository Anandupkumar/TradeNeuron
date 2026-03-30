# TradeNeuron — System Improvement Plan

**Version:** 2.0 Upgrade  
**Prepared:** March 2026  
**Scope:** Backend pipeline improvements — no new strategies, no new indicators

---

## Overview

This document is the implementation plan for upgrading TradeNeuron from a rule-based filtering system to a probabilistic scoring + adaptive execution system. All 5 improvements are prioritised by impact and ordered for safe sequential implementation.

---

## Priority 1 — Convert Hard Filters to Soft Scoring — **IMPLEMENTED**

**Impact:** Critical  
**Overfitting Risk:** Zero  
**Files:** `sentiment.service.js`, `signal.service.js`, `scoring.service.js`, `fno.service.js`

### Problem

The current pipeline hard-rejects signals at multiple stages. A signal that fails any single gate is eliminated entirely, regardless of strength in all other dimensions. This causes low trade frequency and binary decision errors where strong setups are discarded for minor filter violations.

### Changes

**Sentiment Filter** — `sentiment.service.js`

Before:
```
NEGATIVE → reject signal
```

After:
```
STRONGLY_NEGATIVE → reject (keep hard gate)
NEGATIVE          → raw_confidence -= 12
NEUTRAL           → no change
POSITIVE          → raw_confidence += 5
```

**VWAP Distance Filter** — `signal.service.js`

Before:
```
distance > threshold → reject
```

After:
```
distance 2–4%   → score penalty: -10
distance > 5%   → reject (keep hard gate)
```

**PCR Filter** — `fno.service.js`

Before:
```
PCR > threshold → reject
```

After:
```
PCR > 1.8       → reject (extreme bearish — keep hard gate)
PCR 1.4–1.8     → score penalty: -10
PCR < 0.7       → score penalty: -10 (bull trap risk)
PCR 0.7–1.4     → no change
```

### Acceptance Criteria

- [ ] `NEGATIVE` sentiment no longer appears as `reject_reason` in `rejected_signals`
- [ ] `VWAP_DISTANCE` rejections drop by at least 30% week-over-week
- [ ] Trade frequency increases to target range of 5–15 trades/week
- [ ] No regression in backtest win rate (±3% tolerance)

---

## Priority 2 — Fix Backtest Reality Gap (Slippage Model) — **IMPLEMENTED**

**Impact:** High — corrects misleading performance metrics  
**Overfitting Risk:** Zero  
**Files:** `backtest.service.js`

### Problem

The backtester assumes clean entry and exit at the exact candle close/open price. Paper trading already models `actual_entry_price`, but backtests do not. This produces an optimistic performance gap between backtest metrics and real-world results.

### Changes

**Add slippage constants** — top of `backtest.service.js`:
```javascript
const SLIPPAGE_PCT = 0.0015; // 0.15% per side
```

**Apply slippage on entry:**
```javascript
// LONG entry
const entry_price = rawEntry * (1 + SLIPPAGE_PCT);

// SHORT entry
const entry_price = rawEntry * (1 - SLIPPAGE_PCT);
```

**Apply slippage on exit:**
```javascript
// LONG exit
const exit_price = rawExit * (1 - SLIPPAGE_PCT);

// SHORT exit
const exit_price = rawExit * (1 + SLIPPAGE_PCT);
```

**Brokerage:** Already configured in env — confirm it is applied after slippage, not before.

### Acceptance Criteria

- [ ] Backtest win rate decreases slightly (expected: -2% to -5%) — this is a correctness fix
- [ ] Backtest Sharpe ratio decreases slightly — expected and correct
- [ ] No change to signal generation logic
- [ ] Paper trade PnL and backtest PnL now diverge by <2% on same signal set

---

## Priority 3 — Regime-Based Position Sizing — **IMPLEMENTED**

**Impact:** High — reduces drawdown, improves capital efficiency  
**Overfitting Risk:** None (market-structure driven)  
**Files:** `signal.service.js`, `signal.model.js`, `strategies/index.js`

### Problem

`is_ranging` is correctly detected and logged in features, but position sizing does not act on it. Full-size positions are taken in ranging markets, exposing capital to choppy, low-probability conditions.

### Changes

**In `signal.service.js`**, after `shares_to_buy` is computed, apply regime multiplier:

```javascript
// Regime-based position size scaling
let regimeMultiplier = 1.0;

if (features.is_ranging) {
  regimeMultiplier = 0.5;            // Ranging market — half size
} else if (marketRegime === 'HIGH_VOLATILITY' || vix > 20) {
  regimeMultiplier = 0.7;            // Elevated VIX — reduced size
} else {
  regimeMultiplier = 1.0;            // Trending — full size
}

shares_to_buy = Math.floor(shares_to_buy * regimeMultiplier);
```

**Log multiplier in signal record** for auditability — add `regime_size_multiplier` column to `signals` table (migration `033_add_regime_size_multiplier.sql`).

### Regime Multiplier Reference

| Regime | Multiplier | Risk % |
|--------|-----------|--------|
| Trending (default) | 1.0× | 1% |
| Ranging (`is_ranging = true`) | 0.5× | 0.5% |
| High VIX (VIX > 20) | 0.7× | 0.7% |

### Acceptance Criteria

- [ ] Signals in ranging conditions show `shares_to_buy` at 50% of non-ranging equivalent
- [ ] `regime_size_multiplier` is logged correctly in all signals
- [ ] No change to signal direction, SL, or target values

---

## Priority 4 — Rejected Signal Distribution Analysis — **IMPLEMENTED**

**Impact:** Medium — ongoing tuning feedback loop  
**Overfitting Risk:** Zero (analysis only, not automatic threshold changes)  
**Files:** `signal.routes.js`, `rejected_signal.model.js`

### Problem

`rejected_signals` table is populated but not actively analyzed. Without this, it is impossible to know which filter is dominating rejections and whether any single gate is too strict.

### Changes

**Add analytics endpoint** — `GET /api/signals/rejected/distribution`

Response shape:
```json
{
  "period_days": 30,
  "total_rejected": 312,
  "by_stage": [
    { "reject_stage": "VWAP", "count": 140, "pct": 44.9 },
    { "reject_stage": "RR", "count": 94, "pct": 30.1 },
    { "reject_stage": "CONFIDENCE", "count": 52, "pct": 16.7 },
    { "reject_stage": "SENTIMENT", "count": 26, "pct": 8.3 }
  ],
  "by_symbol": [...],
  "avg_raw_confidence_at_rejection": 61.4,
  "avg_raw_rr_at_rejection": 1.3
}
```

**Interpretation rules (manual action required — do NOT automate):**

| Dominant Stage | % Threshold | Action |
|----------------|-------------|--------|
| Any single stage | > 40% | Review that filter threshold |
| VWAP | > 35% | Consider softening to penalty (Priority 1 already addresses this) |
| RR | > 40% | Review min RR constant in `constants.js` |
| CONFIDENCE | > 35% | Review confidence gate threshold |

### Acceptance Criteria

- [ ] Endpoint returns correct distribution from `rejected_signals` table
- [ ] Dashboard (frontend) shows rejection breakdown chart
- [ ] Weekly review cadence established — no automatic threshold updates

---

## Priority 5 — Confidence Calibration — **IMPLEMENTED**

**Impact:** Medium-High — turns confidence score into probability estimate  
**Overfitting Risk:** Low if done on sufficient data (minimum 100 resolved signals)  
**Files:** `signal_outcomes` table, `confidence_calibration.model.js`, `weekly_weight_calibration.job.js`, `signal.routes.js`

### Problem

`raw_confidence` is a scoring artifact, not a calibrated probability. A confidence of 75 does not reliably predict a 75% win rate. Uncalibrated confidence leads to poor position sizing decisions.

### Changes

**Add calibration query** — run inside `weekly_weight_calibration.job.js`:

```sql
SELECT
  FLOOR(raw_confidence / 5) * 5 AS confidence_bucket,
  COUNT(*) AS total,
  SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) AS wins,
  ROUND(100.0 * SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) / COUNT(*), 1) AS actual_win_rate
FROM signal_outcomes
WHERE resolved_at IS NOT NULL
GROUP BY confidence_bucket
ORDER BY confidence_bucket;
```

**Calibration table** — store results in new table `confidence_calibration` (migration `034_create_confidence_calibration.sql`):

| Column | Type | Description |
|--------|------|-------------|
| `confidence_bucket` | INT | e.g., 70, 75, 80 |
| `total_signals` | INT | Signals in this bucket |
| `actual_win_rate` | DECIMAL | Observed win rate |
| `computed_at` | TIMESTAMP | Last calibration date |

**Minimum data gate:** Do not calibrate until `signal_outcomes` has at least 100 resolved entries per bucket. Use raw confidence until then.

**Do NOT auto-adjust scoring weights based on calibration** — use calibration as a display metric only until 6 months of data is available.

### Acceptance Criteria

- [ ] Calibration runs weekly alongside existing weight calibration
- [ ] `confidence_calibration` table is populated after first 100 resolved signals
- [ ] Frontend signal card shows "Historical win rate at this confidence: X%" when bucket has ≥ 20 entries
- [ ] No automatic scoring weight changes triggered by calibration data

---

## Database Migrations Required

| Migration | Description |
|-----------|-------------|
| `033_add_regime_size_multiplier.sql` | Add `regime_size_multiplier DECIMAL(4,2)` to `signals` table |
| `034_create_confidence_calibration.sql` | New table for weekly confidence calibration results |

---

## Implementation Order

```
Week 1:  Priority 1 — Soft filters (sentiment, VWAP, PCR)
Week 1:  Priority 2 — Slippage model in backtest
Week 2:  Priority 3 — Regime-based position sizing + migration 033
Week 2:  Priority 4 — Rejected signal distribution endpoint
Week 3:  Priority 5 — Confidence calibration + migration 034
```

Each priority must pass its acceptance criteria before the next begins.

---

## What NOT to Do

These are explicitly out of scope for this upgrade cycle. Adding any of the following risks overfitting and system complexity without proportional benefit:

- Do not add new indicators (EMA, RSI variants, etc.)
- Do not add new hard filters
- Do not add candle pattern libraries
- Do not auto-tune any threshold based on recent performance
- Do not increase the weight calibration frequency beyond weekly
- Do not change strategy logic in any `.strategy.js` file

---

## Target System State After All 5 Priorities

| Metric | Before | Target After |
|--------|--------|-------------|
| Trade frequency | 0–3 trades/week | 5–15 trades/week |
| Backtest accuracy | Optimistic (no slippage) | Realistic |
| Ranging market drawdown | Uncontrolled | Reduced by ~40% |
| Rejection visibility | Logged, not analyzed | Analyzed weekly |
| Confidence meaning | Internal score | Calibrated probability |

---

## Priority 6: Signal Pool and Frequency Controller — IMPLEMENTED

**Goal:** Maintain 5–15 trades/week without breaking strategy logic, overfitting thresholds, or manual tweaking.

**Core change:** Introduced a two-phase Step 10 with a "Candidate Pool + Top-N Frequency Controller" between scoring/filtering and final signal storage.

### Changes Made

| File | Change |
|------|--------|
| `src/config/env.js` | Added 5 new config vars: `FREQUENCY_CONTROLLER_ENABLED`, `TARGET_WEEKLY_SIGNALS`, `MAX_SIGNALS_PER_DAY`, `POOL_MIN_CONFIDENCE`, `POOL_MIN_RISK_REWARD` |
| `.env.example` | Added the 5 new vars with defaults and comments |
| `migrations/035_add_frequency_cap_reject_stage.sql` | Added `FREQUENCY_CAP` to `rejected_signals` ENUM |
| `src/models/signal.model.js` | Added `countByWeek(date)` — counts signals in the same ISO week |
| `src/services/signals/signal.service.js` | Renamed `deduplicateAndGenerate` logic to `buildCandidate` (uses pool floor thresholds when frequency controller is enabled). Added `selectTopSignals(candidates, date)` for Top-N ranking. Preserved `deduplicateAndGenerate` as backward-compatible wrapper. |
| `src/jobs/daily_pipeline.job.js` | Step 10 now runs in two phases: Phase 1 builds candidate pool via `buildCandidate`, Phase 2 applies `selectTopSignals` when frequency controller is enabled |
| `frontend/src/pages/Funnel.tsx` | Added `FREQUENCY_CAP` to `GATE_LABELS` and `GATE_COLORS` |

### Key Decisions

- **Pool floor thresholds** (`POOL_MIN_CONFIDENCE=65`, `POOL_MIN_RISK_REWARD=1.5`) are intentionally lower than strict thresholds (`MIN_CONFIDENCE=70`, `MIN_RISK_REWARD=2.0`). This widens the candidate pool for ranking without accepting junk trades.
- **Top-N selection** ranks candidates by `confidence DESC, risk_reward DESC` and selects `min(MAX_SIGNALS_PER_DAY, TARGET_WEEKLY_SIGNALS - weekly_count)` per day.
- **Feature flag** `FREQUENCY_CONTROLLER_ENABLED=false` reverts to exact pre-controller behavior — strict thresholds, no daily/weekly caps.
- **Deferred candidates** are logged to `rejected_signals` with stage `FREQUENCY_CAP` for full Funnel page transparency.
- **No strategy logic changes** — all 6 strategies remain untouched.

---
