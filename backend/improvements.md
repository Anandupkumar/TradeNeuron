# TradeNeuron Backend — Improvement Plan

Five targeted improvements to shift from hard binary filters to soft, penalty-based scoring.
Each improvement preserves trade frequency while improving signal quality.

---

## 1. Soft Breakout Confirmation

### Current Behavior

- `src/services/features/feature.service.js` — `isBreakout()` (line 35-38) is a hard boolean:
  ```js
  function isBreakout(adjusted_close, recent_highs) {
    if (recent_highs.length === 0) return false;
    const max_high = Math.max(...recent_highs);
    return adjusted_close > max_high;
  }
  ```
- `src/services/strategies/breakout.strategy.js` — `if (!is_breakout) return null` (line 11): hard reject.
- No `close_position` concept exists in the codebase.

### Proposed Change

Compute `close_position` — where the candle closed relative to its own range — and use it as a soft filter in scoring instead of discarding weak breakouts outright.

```
close_position = (adjusted_close - candle_low) / (candle_high - candle_low)
```

Scoring rules (applied in `src/services/scoring/scoring.service.js`):

| close_position | Action |
|----------------|--------|
| < 0.6 | No breakout points awarded (0) |
| 0.6 – 0.74 | Breakout points reduced by 10 |
| >= 0.75 | Full breakout points (current behavior) |

The breakout strategy still requires `is_breakout` for entry eligibility. The soft filter only affects the confidence score, not whether the strategy fires.

### Affected Files

| File | Change |
|------|--------|
| `src/services/features/feature.service.js` | Compute `close_position` per candle and include in features object |
| `src/services/scoring/scoring.service.js` | Read `close_position` from feature; apply tiered breakout score |
| `src/models/feature.model.js` | Include `close_position` in INSERT/UPDATE |
| `src/config/constants.js` | Add `BREAKOUT_CLOSE_POSITION_HARD = 0.6`, `BREAKOUT_CLOSE_POSITION_SOFT = 0.75`, `BREAKOUT_SOFT_PENALTY = 10` |

### New Migration

`migrations/027_add_soft_filter_columns.sql`:
```sql
ALTER TABLE features
  ADD COLUMN close_position DECIMAL(5,4) DEFAULT NULL AFTER is_breakout,
  ADD COLUMN ema50_slope DECIMAL(12,4) DEFAULT NULL AFTER close_position;
```

(Combined with Improvement 3 — both columns in one migration.)

### Risk Notes

- `is_breakout` remains a boolean feature flag. Strategies that check it are unaffected.
- Only the scoring path changes. If `close_position` is NULL (historical data), full breakout points are awarded (fail-open).

---

## 2. Confidence Tier System

### Current Behavior

- `.env` — `MIN_CONFIDENCE=20` (hard cutoff).
- `src/services/signals/signal.service.js` (line 127-131) — binary pass/fail:
  ```js
  if (confidence < config.min_confidence) {
    // reject signal
    return null;
  }
  ```
- Signal is stored with a numeric `confidence` field. No tier or priority concept.

### Proposed Change

Replace the single hard cutoff with a tiered system. The floor stays (prevents junk signals) but signals above the floor are classified into priority tiers.

| Confidence | Tier | Meaning |
|------------|------|---------|
| 85+ | HIGH | High priority — strong conviction |
| 75 – 84 | NORMAL | Standard signal |
| 70 – 74 | LOW | Low priority — weaker conviction, still valid |
| < 70 | REJECTED | Below floor — discarded (logged to rejected_signals) |

### New Environment Variables

```
CONFIDENCE_TIER_HIGH=85
CONFIDENCE_TIER_NORMAL=75
CONFIDENCE_TIER_LOW=70
```

`MIN_CONFIDENCE` in `.env` should be set to match `CONFIDENCE_TIER_LOW` (70). The tier thresholds are read from env.js.

### Affected Files

| File | Change |
|------|--------|
| `src/config/env.js` | Add `confidence_tier_high`, `confidence_tier_normal`, `confidence_tier_low` |
| `.env.example` | Add the three new env vars with defaults |
| `src/services/signals/signal.service.js` | After confidence passes floor, compute `confidence_tier`; store on signal |
| `src/models/signal.model.js` | Include `confidence_tier` in INSERT |
| `src/routes/signal.routes.js` | Expose `confidence_tier` in API responses; support filter by tier |
| `src/validations/signal.validation.js` | Add `confidence_tier` to allowed filter values |

### New Migration

`migrations/028_add_confidence_tier.sql`:
```sql
ALTER TABLE signals
  ADD COLUMN confidence_tier ENUM('HIGH', 'NORMAL', 'LOW') DEFAULT NULL AFTER confidence;
```

### Risk Notes

- Existing signals with NULL tier are treated as NORMAL in API responses.
- The MIN_CONFIDENCE gate remains — the tier is computed after the gate passes. This is additive, not replacing.

---

## 3. Trend Slope (Soft Filter)

### Current Behavior

- `src/services/features/feature.service.js` (line 126):
  ```js
  const is_uptrend = ema_50 != null && adjusted_close > ema_50;
  ```
  Level-based only. No slope computation.
- `src/services/strategies/trend_pullback.strategy.js` (line 13): `if (!is_uptrend) return null` — hard reject.
- No EMA slope check exists anywhere in the codebase.

### Proposed Change

Compute `ema50_slope` — the difference between today's EMA50 and 5 trading days ago. Use it as a soft penalty in scoring rather than a hard reject.

```
ema50_slope = ema50_today - ema50_5d_ago
```

Scoring rules (applied in `src/services/scoring/scoring.service.js`):

| ema50_slope | Action |
|-------------|--------|
| > 0 | Full trend points (current behavior) |
| <= 0 | Reduce trend score by 15 points |

The strategy entry condition (`is_uptrend`) is unchanged. A stock can still be in an uptrend (close > EMA50) but with a flattening EMA50 — the penalty reduces confidence without killing the signal.

### Affected Files

| File | Change |
|------|--------|
| `src/services/features/feature.service.js` | Look back 5 candles for EMA50; compute `ema50_slope`; include in features |
| `src/services/scoring/scoring.service.js` | Read `ema50_slope` from feature; if <= 0, subtract 15 from trend weight |
| `src/models/feature.model.js` | Include `ema50_slope` in INSERT/UPDATE |
| `src/config/constants.js` | Add `TREND_SLOPE_PENALTY = 15` |

### New Migration

Included in `migrations/027_add_soft_filter_columns.sql` (same migration as Improvement 1):
```sql
ALTER TABLE features
  ADD COLUMN ema50_slope DECIMAL(12,4) DEFAULT NULL AFTER close_position;
```

### Risk Notes

- If indicator data for 5 days ago is unavailable (e.g., new stock, insufficient history), `ema50_slope` is NULL and no penalty is applied (fail-open).
- The penalty is subtractive from the trend weight (default 30). A 15-point reduction makes trend contribution 15 instead of 30 — significant but not zero.

---

## 4. Adaptive Learning (Gradual)

### Current Behavior

- `src/jobs/weekly_weight_calibration.job.js` (line 16): requires 30 outcomes minimum, skips entirely if fewer:
  ```js
  if (outcomes.length < 30) {
    logger.info(`Insufficient outcomes (${outcomes.length}/30 required) — skipping calibration`);
    return;
  }
  ```
- Lines 63-66: Full weight replacement:
  ```js
  const weight_trend = computeAdaptiveWeight(SCORING_WEIGHTS.TREND, win_rates.trend);
  // computeAdaptiveWeight = base_weight * (0.5 + win_rate)
  ```
- No gradual blending or learning rate.

### Proposed Change

Introduce a two-stage calibration with a blending factor for early data.

| Outcome Count | Action |
|---------------|--------|
| < 15 | Skip calibration entirely (insufficient data) |
| 15 – 29 | Apply 30% blended adjustment: `new = base * 0.7 + adaptive * 0.3` |
| >= 30 | Apply full adjustment (current behavior) |

### New Environment Variables

```
ADAPTIVE_MIN_TRADES_PARTIAL=15
ADAPTIVE_MIN_TRADES_FULL=30
ADAPTIVE_PARTIAL_BLEND=0.3
```

### Affected Files

| File | Change |
|------|--------|
| `src/jobs/weekly_weight_calibration.job.js` | Add partial blend logic; use env thresholds instead of hardcoded 30 |
| `src/config/env.js` | Add the three new env vars |
| `.env.example` | Add the three new env vars with defaults |

### No Migration Required

This is purely a runtime logic change. No schema modifications needed.

### Risk Notes

- The partial blend (30%) is conservative by design. With only 15-29 data points, win rates are noisy — a 30% influence limits damage from statistical noise.
- Logging must clearly indicate which blend mode was used for each calibration run.
- The `computeAdaptiveWeight` function itself is unchanged. The blending happens after it computes the adaptive value.

---

## 5. Smart Expiry Handling

### Current Behavior

- `src/services/paper_trading/paper_trade.service.js` (lines 91-101): expired trades close at `adjusted_close` with standard net PnL formula. No extra penalty:
  ```js
  if (days_held >= config.holding_period_days) {
    exit_price = close;
    exit_reason = 'EXPIRED';
  }
  ```
- `src/services/signals/signal.service.js` (lines 230-240): signal status set to EXPIRED; outcome recorded as-is.
- In weekly calibration: EXPIRED is treated as a non-win (same as SL_HIT) — no distinction between "expired with profit" and "expired with no movement".

### Proposed Change

Apply a small opportunity cost penalty when expired trades showed negligible movement. Trades that moved meaningfully (even if they didn't hit target/SL) keep their actual PnL.

| Scenario | Penalty |
|----------|---------|
| `abs(pnl_pct) < MOVEMENT_THRESHOLD` (negligible) | Apply penalty: -0.1% to -0.2% |
| `abs(pnl_pct) >= MOVEMENT_THRESHOLD` (meaningful) | Use actual PnL, no extra penalty |

Penalty formula for negligible-movement expiries:
```
penalty = EXPIRED_MIN_PENALTY + (EXPIRED_MAX_PENALTY - EXPIRED_MIN_PENALTY)
          * (1 - abs(pnl_pct) / MOVEMENT_THRESHOLD)
```
This scales: zero movement gets the full -0.2% penalty; movement near the threshold gets -0.1%.

### New Environment Variables

```
EXPIRED_MIN_PENALTY=-0.1
EXPIRED_MAX_PENALTY=-0.2
EXPIRED_MOVEMENT_THRESHOLD=1.0
```

### Affected Files

| File | Change |
|------|--------|
| `src/services/paper_trading/paper_trade.service.js` | After computing PnL for EXPIRED trades, check movement threshold and apply penalty |
| `src/services/signals/signal.service.js` | Record outcome as `EXPIRED_PENALIZED` when penalty applied (vs plain `EXPIRED`) |
| `src/config/env.js` | Add the three new env vars |
| `.env.example` | Add the three new env vars with defaults |

### No Migration Required

The `signal_outcomes.outcome` column is VARCHAR — `EXPIRED_PENALIZED` fits without schema change. The `paper_trades.exit_reason` column stores the string as-is.

### Risk Notes

- The penalty range (-0.1% to -0.2%) is intentionally mild. It accounts for opportunity cost without over-penalizing slow-moving trades.
- The calibration job (`weekly_weight_calibration.job.js`) should be updated to treat `EXPIRED_PENALIZED` as non-win (same as `SL_HIT` and `EXPIRED`). The `is_win` check only passes `TARGET_HIT`, so this works automatically.
- Logging must include: symbol, actual PnL, penalty applied, final adjusted PnL.

---

## Migration Summary

| Migration | Columns Added | Table |
|-----------|---------------|-------|
| `027_add_soft_filter_columns.sql` | `close_position DECIMAL(5,4)`, `ema50_slope DECIMAL(12,4)` | features |
| `028_add_confidence_tier.sql` | `confidence_tier ENUM('HIGH','NORMAL','LOW')` | signals |

---

## New Environment Variables Summary

| Variable | Default | Used By |
|----------|---------|---------|
| `CONFIDENCE_TIER_HIGH` | 85 | signal.service.js |
| `CONFIDENCE_TIER_NORMAL` | 75 | signal.service.js |
| `CONFIDENCE_TIER_LOW` | 70 | signal.service.js |
| `ADAPTIVE_MIN_TRADES_PARTIAL` | 15 | weekly_weight_calibration.job.js |
| `ADAPTIVE_MIN_TRADES_FULL` | 30 | weekly_weight_calibration.job.js |
| `ADAPTIVE_PARTIAL_BLEND` | 0.3 | weekly_weight_calibration.job.js |
| `EXPIRED_MIN_PENALTY` | -0.1 | paper_trade.service.js |
| `EXPIRED_MAX_PENALTY` | -0.2 | paper_trade.service.js |
| `EXPIRED_MOVEMENT_THRESHOLD` | 1.0 | paper_trade.service.js |

---

## Implementation Order

1. **Improvement 1 + 3** — Combined migration 027, feature computation, scoring penalties
2. **Improvement 2** — Migration 028, tier assignment, API exposure
3. **Improvement 4** — Calibration job logic change (no migration)
4. **Improvement 5** — Expiry penalty logic (no migration)

This order minimizes risk: feature-level changes first (no signal flow impact), then signal metadata, then runtime-only changes.

---

## 6. Entry Price Fix — Next-Day Open (Look-Ahead Bias)

**Status: IMPLEMENTED** (migration 029)

### Problem

Both the backtester and paper trading used `signal.entry_price` (= adjusted_close on signal date) as the trade entry. In reality you can only enter at the next trading day's open. This inflated all win rate metrics.

### Changes Made

| File | Change |
|------|--------|
| `src/services/backtesting/backtest.service.js` | `evaluateOutcome()` now uses `future_candles[0].open` as `realistic_entry`; gap-open guard returns immediate SL_HIT if next-day open gaps past SL; all `calculateNetReturn()` calls use `outcome.realistic_entry` |
| `src/models/candle.model.js` | Added `findNextCandle(symbol, date)` — `SELECT * FROM candles WHERE symbol = ? AND date > ? ORDER BY date ASC LIMIT 1` |
| `src/models/paper_trade.model.js` | `create()` now includes `actual_entry_price`; added `updateActualEntry(id, price)` |
| `src/services/paper_trading/paper_trade.service.js` | `createPaperTrades()` looks up next-day candle and populates `actual_entry_price` at creation; `updatePaperTrades()` fills `actual_entry_price` if NULL for existing trades; uses it for all PnL calculations |

### Migration

`migrations/029_add_actual_entry_to_paper_trades.sql`:
```sql
ALTER TABLE paper_trades
  ADD COLUMN actual_entry_price DECIMAL(12,2) DEFAULT NULL AFTER entry_price;
```

### Impact

Backtest win rates reflect realistic execution. Expect 2–5pp lower than previous figures — that's accurate, not worse.

---

## 7. Remove Liquidity Gate

**Status: IMPLEMENTED**

### Problem

All NIFTY 50 stocks are inherently liquid. The `is_liquid` check in `deduplicateAndGenerate()` never triggered — dead code.

### Changes Made

| File | Change |
|------|--------|
| `src/services/signals/signal.service.js` | Removed the `is_liquid` gate block from `deduplicateAndGenerate()` |
| `src/config/env.js` | Removed `MIN_LIQUIDITY_VOLUME` from `REQUIRED_VARS` (kept as optional with default) |
| `frontend/src/components/stocks/FeatureGrid.tsx` | Removed `is_liquid` pill from the feature grid |
| `frontend/src/types/rejectedSignal.types.ts` | Removed `LIQUIDITY_GATE` from `RejectStage` type |

### No Migration Required

The `is_liquid` column and feature computation remain for backward compatibility — only the gate was removed.

---

## 8. Paper Trade Feedback Loop — Strategy Auto-Disable

**Status: IMPLEMENTED** (migration 030)

### Problem

The weekly calibration job adjusted scoring weights but didn't distinguish between strategy-level performance. Underperforming strategies kept running indefinitely.

### Changes Made

| File | Change |
|------|--------|
| `migrations/030_create_strategy_config.sql` | Created `strategy_config` table; seeded all 6 strategies as enabled |
| `src/models/strategy_config.model.js` | New model: `getEnabled()`, `getAll()`, `setEnabled(strategy_name, is_enabled, reason)` |
| `src/jobs/weekly_weight_calibration.job.js` | Added `evaluateStrategyPerformance()`: queries per-strategy paper trade stats (last 90 days), auto-disables (win rate < 40%, >= 15 trades), auto-re-enables (win rate >= 50%, >= 20 trades), sends Telegram alerts |
| `src/services/strategies/index.js` | `runStrategies()` checks `strategy_config` before executing each strategy (fail-open if table missing) |
| `src/config/env.js` | Added `strategy_disable_win_rate`, `strategy_disable_min_trades`, `strategy_reenable_win_rate`, `strategy_reenable_min_trades` |
| `src/routes/strategy.routes.js` | New `GET /api/v1/strategies` endpoint |
| `server.js` | Registered strategy routes |

### New Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `STRATEGY_DISABLE_WIN_RATE` | 0.40 | Disable strategy below this win rate |
| `STRATEGY_DISABLE_MIN_TRADES` | 15 | Minimum trades before auto-disabling |
| `STRATEGY_REENABLE_WIN_RATE` | 0.50 | Re-enable strategy above this win rate |
| `STRATEGY_REENABLE_MIN_TRADES` | 20 | Minimum trades before auto-re-enabling |

### Migration

`migrations/030_create_strategy_config.sql`:
```sql
CREATE TABLE IF NOT EXISTS strategy_config (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  strategy_name   VARCHAR(100) NOT NULL UNIQUE,
  is_enabled      TINYINT(1)   NOT NULL DEFAULT 1,
  disabled_at     TIMESTAMP    NULL,
  disabled_reason VARCHAR(500) NULL,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO strategy_config (strategy_name) VALUES
  ('TREND_PULLBACK'), ('BREAKOUT'), ('RANGE'),
  ('MEAN_REVERSION'), ('TREND_PULLBACK_SHORT'), ('BREAKDOWN');
```

### Self-Improvement Loop

Paper trades resolve → calibration job reads per-strategy results → underperforming strategies auto-disabled → Telegram alert fires → you decide whether to override.

---

## 9. Fix SHORT Signal Scoring (Direction-Aware Scoring)

### Problem

The scoring engine (`scoring.service.js`) was LONG-only. It evaluated features like `is_uptrend`, `rsi_zone === 'PULLBACK'`, and `is_breakout` — all bullish indicators. In a BEARISH market regime, SHORT signals from `trend_pullback_short` and `breakdown` strategies always received confidence = 0 because none of these bullish features were true, causing every SHORT signal to be rejected.

### Changes Made

**`src/config/constants.js`:**
- Added `SHORT_SCORING_WEIGHTS` with identical initial values (`TREND: 30`, `RSI_OVERBOUGHT: 20`, `BREAKDOWN: 20`) — allows future independent tuning
- Added `SOFT_FILTER.BREAKDOWN_CLOSE_POSITION_THRESHOLD = 0.4` — candle closing in the lower 40% confirms breakdown

**`src/services/scoring/scoring.service.js`:**
- Added `direction` parameter (default `'LONG'`) to `_scoreInternal`, `calculateScore`, `calculateScoreWithBreakdown`
- SHORT scoring branch mirrors LONG logic with bearish features:
  - Downtrend: NOT `is_uptrend` AND `ema_20 < ema_50` (mirror of uptrend check)
  - RSI: `rsi_zone === 'OVERBOUGHT'` (mirror of PULLBACK)
  - Breakdown: NOT `is_breakout` AND `close_position < 0.4` (candle closed near low)
  - Quality: `is_high_delivery` AND breakdown (institutional selling pressure)
  - Trend slope penalty: rising EMA50 slope penalizes SHORT (weakening downtrend)
- Volume scoring unchanged — volume confirms both directions
- Added `direction` parameter to `buildExplanations` with SHORT-specific plain-English sentences

**`src/services/signals/signal.service.js`:**
- `deduplicateAndGenerate` now passes `direction` to `calculateScoreWithBreakdown(symbol, date, direction)`
- `buildExplanations` call now includes `direction`

### SHORT Scoring Factors (Mirror of LONG)

| Factor              | LONG scoring                         | SHORT scoring                                          |
| ------------------- | ------------------------------------ | ------------------------------------------------------ |
| Trend (+30)         | `is_uptrend` AND `ema_20 > ema_50`   | NOT `is_uptrend` AND `ema_20 < ema_50`                 |
| Momentum (+20)      | `rsi_zone === 'PULLBACK'`            | `rsi_zone === 'OVERBOUGHT'`                            |
| Volume (+30)        | `volume_tier` scoring                | Same `volume_tier` scoring                             |
| Breakout/down (+20) | `is_breakout` with close_position    | NOT `is_breakout` AND `close_position < 0.4`           |
| Quality (+10)       | `is_high_delivery` AND `is_breakout` | `is_high_delivery` AND breakdown                       |
| Slope penalty       | `ema50_slope <= 0` penalizes LONG    | `ema50_slope >= 0` penalizes SHORT                     |

### What This Does NOT Change

- No new features, DB columns, tables, or migrations
- No changes to strategy entry logic
- No changes to signal lifecycle or paper trading
- Volume scoring identical for both directions
- Adaptive weight calibration remains global (regime-specific is a separate future improvement)

---

## 10. Execution Type Flag (Phantom Paper Win Prevention)

**Status: IMPLEMENTED** (migration 031)

### Problem

SHORT signals were generating paper trades in equity-only accounts where short selling is structurally impossible. These phantom paper trades could produce wins that corrupted the weekly weight calibration job's per-strategy performance calculations, leading to artificially inflated win rates for short strategies.

### Changes Made

| File | Change |
|------|--------|
| `migrations/031_add_execution_type_to_signals.sql` | Added `execution_type ENUM('EQUITY','FUTURES','OPTIONS','NONE')` and `is_executable TINYINT(1)` to `signals`; added `execution_type` to `paper_trades` |
| `src/config/env.js` | Added `account_type` (from `ACCOUNT_TYPE` env var, default `'EQUITY'`) |
| `.env.example` / `.env` | Added `ACCOUNT_TYPE=EQUITY` with documentation |
| `src/services/signals/signal.service.js` | Added `resolveExecutionType(direction, accountType)` function; integrated into `deduplicateAndGenerate()` return object; `updateSignalStatuses()` skips `recordOutcome()` for non-executable signals |
| `src/services/paper_trading/paper_trade.service.js` | Added `is_executable` guard in `createPaperTrades()` — non-executable signals are skipped; added `execution_type` to INSERT |
| `src/models/signal.model.js` | Added `execution_type, is_executable` to `create()` INSERT |
| `src/models/paper_trade.model.js` | Added `execution_type` to `create()` INSERT |
| `frontend/src/types/signal.types.ts` | Added `ExecutionType` union and `execution_type, is_executable` to `Signal` interface |
| `frontend/src/types/paperTrade.types.ts` | Added `execution_type` to `PaperTrade` interface |

### Execution Type Resolution

| Direction | Account Type | execution_type | is_executable |
|-----------|-------------|----------------|---------------|
| LONG | EQUITY or FNO | EQUITY | true |
| SHORT | FNO | FUTURES | true |
| SHORT | EQUITY | NONE | false |

### Data Integrity Protection

- Non-executable signals are **still generated and stored** for analysis and display
- Paper trades are **NOT created** for non-executable signals
- Signal outcomes are **NOT recorded** for non-executable signals (status is updated for display but `recordOutcome()` is skipped)
- This prevents calibration data pollution: the weekly weight calibration job only sees outcomes from signals that were actually executable

---

## 11. Yahoo Health Check (Candle Source Quality)

**Status: IMPLEMENTED**

### Problem

When Yahoo Finance is unavailable, the system falls back to NSE Bhavcopy data which uses unadjusted close prices. Computing EMA, RSI, and other indicators on unadjusted prices produces unreliable values that can generate incorrect signals.

### Changes Made

| File | Change |
|------|--------|
| `src/services/data_ingestion/validation.service.js` | Added `checkCandleSourceQuality(date)` function — checks what proportion of NIFTY 50 candles came from Bhavcopy (unadjusted) vs Yahoo (adjusted), and detects suspicious adjusted_close/close gaps > 20% |
| `src/jobs/daily_pipeline.job.js` | Added Step 2b between Step 2 and Step 3; builds `suspect_symbols` Set from quality report; sends Telegram alert if quality is POOR (>20% Bhavcopy); Steps 3, 4, and 7 skip suspect symbols |

### Quality Assessment

| Metric | Threshold | Action |
|--------|-----------|--------|
| Bhavcopy ratio > 20% | POOR quality | Telegram alert + all Bhavcopy symbols added to suspect set |
| adjusted_close/close gap > 20% | Suspicious | Symbol added to suspect set (possible data anomaly) |

### Downstream Impact

Suspect symbols are excluded from:
- **Step 3:** Indicator computation (stale indicators from previous day are retained)
- **Step 4:** Feature extraction
- **Step 7:** Strategy execution (no signals generated for these symbols)

This is fail-safe: if the quality check itself fails, no symbols are excluded (empty suspect set).

---

## 12. Gate Funnel Audit API

**Status: IMPLEMENTED**

### Problem

No visibility into which pipeline gates were killing the most signals. Traders and developers had no way to assess if thresholds were too strict or too lenient.

### Changes Made

| File | Change |
|------|--------|
| `src/routes/signal.routes.js` | Added `GET /api/v1/signals/funnel?date=YYYY-MM-DD` endpoint — queries `rejected_signals` for per-gate rejection counts, `signals` for final count, computes per-gate pass rates, flags over-strict gates |

### Endpoint Details

**`GET /api/v1/signals/funnel?date=2026-03-24`**

Returns:
- `total_candidates` — approximate pipeline input (rejected + final signals)
- `final_signals` — how many signals survived all gates
- `overall_conversion_pct` — final / total as percentage
- `funnel[]` — per-gate breakdown: gate name, input count, rejected count, passed count, pass rate
- `warnings[]` — gates with pass rate below 40% (with 5+ inputs) flagged as potentially over-strict

### No Schema Changes

Uses existing `rejected_signals` and `signals` tables. Read-only endpoint.

---

## 13. Per-Strategy VWAP Thresholds

**Status: IMPLEMENTED**

### Problem

A flat ±2% VWAP distance filter was applied to all signals regardless of strategy type. Breakout signals naturally move away from the volume-weighted average — a 2.1% distance above VWAP is expected behavior for a breakout, not a rejection criterion.

### Changes Made

| File | Change |
|------|--------|
| `src/config/env.js` | Added `vwap_distance_long_default` (2.0%), `vwap_distance_breakout_long` (3.5%), `vwap_distance_short_default` (2.0%) |
| `.env.example` / `.env` | Added `VWAP_DISTANCE_LONG_DEFAULT`, `VWAP_DISTANCE_BREAKOUT_LONG`, `VWAP_DISTANCE_SHORT_DEFAULT` |
| `src/services/signals/signal.service.js` | VWAP filter now checks if strategy includes 'BREAKOUT' to select the wider band; uses config values instead of hardcoded 2.0 |

### VWAP Thresholds

| Strategy | Direction | Threshold |
|----------|-----------|-----------|
| Trend Pullback, Range, Mean Reversion | LONG | 2.0% (default) |
| Breakout | LONG | 3.5% (wider band) |
| All short strategies | SHORT | 2.0% (default) |

### New Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `VWAP_DISTANCE_LONG_DEFAULT` | 2.0 | VWAP distance threshold for non-breakout LONG signals |
| `VWAP_DISTANCE_BREAKOUT_LONG` | 3.5 | VWAP distance threshold for breakout LONG signals |
| `VWAP_DISTANCE_SHORT_DEFAULT` | 2.0 | VWAP distance threshold for SHORT signals |

---

## 14. Fix: Missing DUPLICATE in rejected_signals ENUM (migration 032)

**Status: IMPLEMENTED**

### Problem

The `DUPLICATE` reject stage was added to the code in `signal.service.js` (for duplicate active signal detection) without a matching database migration. The `reject_stage` ENUM in the `rejected_signals` table did not include `'DUPLICATE'`, causing MySQL to throw "Data truncated for column 'reject_stage'" errors whenever a duplicate signal rejection was logged.

### Changes Made

| File | Change |
|------|--------|
| `migrations/032_add_duplicate_reject_stage.sql` | ALTERs `reject_stage` ENUM to add `'DUPLICATE'` |

### Key Decision

The ENUM was extended (not recreated) via `MODIFY COLUMN`. Existing data is unaffected since all previously stored values remain valid ENUM members.

---

## 15. Fix: Yahoo Finance 429 Rate Limiting in Weekly Fundamentals

**Status: IMPLEMENTED**

### Problem

The weekly fundamentals job used a 500ms throttle between Yahoo Finance `quoteSummary` API calls. Yahoo's undocumented API endpoints aggressively rate-limit raw HTTP requests, returning HTTP 429. The catch block in the loop made no distinction between 429 errors and other errors, and immediately continued to the next symbol with only a 500ms delay — causing cascading 429s across all symbols.

### Root Cause (Two Layers)

1. **Inner retry (`withRetry`):** Correctly backs off on 429 (30s+ per attempt), but after 3 failed attempts, throws and returns control to the outer loop.
2. **Outer loop:** Logged the error and continued with only 500ms delay. No inter-symbol 429 cooldown existed.

### Solution: Python-first with Node.js Fallback

The Python `yfinance` library handles Yahoo's cookie/crumb authentication more robustly and is not subject to the same rate-limiting. The job now uses a two-tier approach:

1. **Primary:** Spawn `python3 scripts/refresh_fundamentals.py` — fetches fundamentals via `yfinance`, upserts directly into MySQL via `mysql-connector-python`, outputs a JSON summary to stdout.
2. **Fallback:** If Python fails (not installed, script error, etc.), fall back to the Node.js loop with hardened 429 handling:
   - Base throttle raised from 500ms to 2000ms with ±500ms jitter
   - Single 429: 60-second cooldown before next symbol
   - 3 consecutive 429s: 10-minute full stop, then counter reset
   - `consecutive_429s` counter resets on any successful fetch

### Changes Made

| File | Change |
|------|--------|
| `scripts/refresh_fundamentals.py` | New Python script: fetches fundamentals via `yfinance`, computes health flag, upserts into MySQL |
| `src/jobs/weekly_fundamentals.job.js` | Rewritten: spawns Python script first, falls back to hardened Node.js loop with 429-aware cooldowns |

### Python Script Design

- Uses `yfinance.Ticker(symbol).info` for fundamental data (same fields as Node.js `fetchQuoteSummary`)
- Applies identical `computeHealthFlag()` logic (D/E ratio, EPS growth, revenue growth, promoter pledge)
- 2-second throttle with ±0.5s jitter between symbols
- Outputs `SUMMARY:{json}` on final line for Node.js caller to parse
- Exits with code 1 if more than half the symbols fail (triggers Node.js fallback)
