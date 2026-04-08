# TradeNeuron — Signal Pipeline Improvement Plan

**Date:** 2026-04-08  
**Scope:** `signal.service.js`, `strategy_config` table, position sizing block  
**Trigger:** 64.6% of signals rejected by VWAP filter; BREAKDOWN strategy generating 0 live signals despite being the best-performing strategy (Sharpe 4.77, Profit Factor 2.05x)

---

## Root Cause Summary

The VWAP hard-reject threshold (`> 5%`) was designed for LONG signals where price far from VWAP indicates overextension. It was applied symmetrically to SHORT/BREAKDOWN signals — where being deeply below VWAP is a *confirmation* of momentum, not a disqualifier. The system was rejecting its own best strategy at the highest rate.

---

## Change 1 — Fix VWAP Logic for BREAKDOWN (Priority 1)

**File:** `src/services/signals/signal.service.js` → `buildCandidate()`

### What to change

Replace the flat 5% hard reject for SHORT signals with strategy-aware logic. Before the VWAP block, extract the primary strategy:

```javascript
const primaryStrategy = signal.strategies.includes('BREAKDOWN')
    ? 'BREAKDOWN'
    : signal.strategies[0];
```

BREAKDOWN always takes priority over TREND_PULLBACK_SHORT if both are present. This resolves VWAP logic ambiguity when both strategies fire for the same symbol in a BEARISH regime.

Then replace the SHORT VWAP block with:

```javascript
if (primaryStrategy === 'BREAKDOWN') {
    // No hard reject based on distance — deep below VWAP = momentum confirmation
    // Safety ceiling: reject only on data anomaly
    if (Math.abs(vwap_dist) > 20) {
        logger.warn({ symbol, vwap_dist, reason: 'VWAP_ANOMALY_REJECT' });
        return null;
    }

    if (vwap_dist <= -5)      vwap_effect = +10;  // strong momentum
    else if (vwap_dist <= -2) vwap_effect = +5;   // moderate momentum
    else                       vwap_effect = -5;   // price near/above VWAP — weak setup

} else {
    // TREND_PULLBACK_SHORT: existing logic preserved
    if (Math.abs(vwap_dist) > VWAP_HARD_REJECT_SHORT) {
        // existing hard reject
    }
    // ... existing scoring
}
```

### Cap the vwap_effect

After all VWAP scoring, apply the cap before composing effects:

```javascript
vwap_effect = Math.max(-10, Math.min(10, vwap_effect));
```

This prevents the `+10` VWAP boost from combining with the `+5` downtrend boost (Change 2) to inflate confidence artificially.

### Why this matters

| Before | After |
|--------|-------|
| BREAKDOWN rejected if price > 5% below VWAP | BREAKDOWN rewarded if price > 5% below VWAP |
| VWAP acts as trade killer | VWAP acts as momentum detector |
| 64.6% of rejections from VWAP | Expected significant reduction |

---

## Change 2 — Fix strongDowntrend Override (Priority 1)

**File:** `src/services/signals/signal.service.js` → `buildCandidate()`

### What to change

Verify the downtrend override condition is checking the correct direction. The current code may be using the LONG version. It must be:

```javascript
const strongDowntrend =
    !features.is_uptrend &&
    features.ema50_slope < -MIN_EMA50_SLOPE;  // negative slope = falling EMA50
```

Then extend the override to reward momentum instead of just neutralising the penalty:

```javascript
if (primaryStrategy === 'BREAKDOWN' && strongDowntrend && vwap_dist <= -5) {
    vwap_effect += 5;  // extra boost: strong downtrend + deep below VWAP = high conviction
}
```

This combined with Change 1 means a confirmed breakdown in a strong downtrend scores up to `+15` from VWAP context, capped at `+10` by the cap in Change 1.

---

## Change 3 — Per-Strategy Confidence Threshold (Priority 2)

**File:** Migration `033_add_min_confidence_to_strategy_config.sql` + `buildCandidate()`

### Migration

```sql
ALTER TABLE strategy_config
    ADD COLUMN min_confidence INT NOT NULL DEFAULT 65;

UPDATE strategy_config SET min_confidence = 58 WHERE strategy_name = 'BREAKDOWN';
UPDATE strategy_config SET min_confidence = 65 WHERE strategy_name = 'TREND_PULLBACK_SHORT';
```

### Code change in buildCandidate()

```javascript
const strategyConfig = await getStrategyConfig(primaryStrategy);
const minConf = strategyConfig?.min_confidence ?? POOL_MIN_CONFIDENCE;

if (confidence < minConf) {
    logger.info({ symbol, confidence, minConf, strategy: primaryStrategy, reason: 'CONFIDENCE_GATE' });
    await insertRejectedSignal({ symbol, stage: 'CONFIDENCE_GATE', confidence });
    return null;
}
```

Do not hardcode the threshold in JS. The `strategy_config` table exists for this purpose — thresholds stay tunable without a redeploy.

### Rationale for 58 (not 55)

With limited capital, a lower floor increases trade frequency but also junk trade risk. 58 captures more BREAKDOWN setups while keeping a meaningful quality buffer.

---

## Change 4 — Position Sizing Floor (Priority 2)

**File:** `src/services/signals/signal.service.js` → position sizing block

### What to change

After the `FLOOR()` calculation, add a minimum guard:

```javascript
if (shares_to_buy < 1) {
    shares_to_buy = 1;
    logger.info({ symbol, strategy: primaryStrategy, reason: 'POSITION_SIZING_FLOOR_APPLIED' });
}
```

The log line is important here — it lets you track how often the floor fires so you can decide whether to adjust `RISK_PCT_PER_TRADE` or `TOTAL_CAPITAL_INR` instead.

### Context

Only 3 rejections (3.7%) in the 30-day window were POSITION_SIZING. This is a low-impact fix but a correct one — no valid signal should be rejected purely because `FLOOR()` rounds to zero.

---

## Change 5 — Verify Regime Routing (Verify Only, No Code Change)

**File:** `strategy_config` table

### What to check

Regime-based strategy routing already exists in `strategies/index.js`. BREAKDOWN and TREND_PULLBACK_SHORT only fire in BEARISH regime. Do not re-implement this.

Instead, run the following before deploying any of the above changes:

```sql
SELECT strategy_name, is_enabled, min_confidence
FROM strategy_config
WHERE strategy_name IN ('BREAKDOWN', 'TREND_PULLBACK_SHORT');
```

If `is_enabled = 0` for BREAKDOWN, the weekly auto-disable cron flagged it for low win rate. Re-enable it:

```sql
UPDATE strategy_config SET is_enabled = 1 WHERE strategy_name = 'BREAKDOWN';
```

This may be the only change needed if the auto-disable cron ran during a thin data period.

---

## Guardrail — Logging (Do Not Skip)

Add the following log line inside the VWAP evaluation block for BREAKDOWN. This is how you verify the fix is working after deploy without waiting for the next backtest run:

```javascript
logger.info({
    symbol,
    strategy: primaryStrategy,
    vwap_dist,
    vwap_effect,
    strongDowntrend,
    reason: 'VWAP_EVALUATION'
});
```

After the next pipeline run, search logs for `VWAP_EVALUATION` and confirm:

- BREAKDOWN signals are getting `vwap_effect > 0` when `vwap_dist < -5`
- No BREAKDOWN signals are being rejected at `VWAP_FILTER` stage (unless > 20%)
- TREND_PULLBACK_SHORT signals are still being rejected when stretched far from VWAP (that logic is correct and must not change)

---

## What Not to Touch

| Component | Reason |
|-----------|--------|
| R:R = 2:1 | Correct for current capital and holding period |
| SL logic | Working as intended in both strategies |
| Base scoring weights (scoring.service.js) | VWAP changes go in buildCandidate(), not the scoring engine |
| Duplicate filter | Preventing overtrading — keep as-is |
| Confidence scoring formula | Do not adjust weights; only the minimum threshold changes |
| TREND_PULLBACK_SHORT VWAP hard reject | The 5% limit is correct for this strategy; preserve it |
| BREAKOUT / RANGE strategies | Already gated to BULLISH/SIDEWAYS regime; no change needed |

---

## Implementation Order

1. **Before anything:** Run the `strategy_config` query above. If BREAKDOWN is disabled, re-enable it and monitor for one pipeline cycle before making code changes.
2. **Changes 1 + 2** together — single block in `buildCandidate()`, ~20 lines.
3. **Migration 033** + Change 3 — run migration, update `buildCandidate()` confidence gate.
4. **Change 4** — one-line fix with a log statement.
5. After the first pipeline run with changes live, search logs for `VWAP_EVALUATION` to confirm BREAKDOWN is receiving positive VWAP scores.
