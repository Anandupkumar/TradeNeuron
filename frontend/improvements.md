# TradeNeuron Frontend — Improvement Plan

Frontend changes required to support the 5 backend scoring improvements.
Improvement 4 (Adaptive Learning) has no frontend impact — it is backend-only.

---

## 1. Soft Breakout Confirmation — UI Changes

### What the Backend Adds

A new `close_position` field (0.0 – 1.0) on each stock's features, representing where the candle closed relative to its daily range.

### Frontend Changes

| File | Change |
|------|--------|
| `src/types/stock.types.ts` | Add `close_position: number \| null` to the `Features` interface |
| `src/components/stocks/FeatureGrid.tsx` | Display `close_position` as "Breakout Strength" with a visual indicator |

### Display Rules

- `close_position >= 0.75` — green badge: "Strong"
- `close_position 0.6 – 0.74` — amber badge: "Moderate"
- `close_position < 0.6` — grey badge: "Weak"
- `null` — not shown (no data)

### Where It Appears

- **StockDetail page** — FeatureGrid section, alongside existing features like `is_breakout`, `is_volume_spike`

---

## 2. Confidence Tier System — UI Changes

### What the Backend Adds

A new `confidence_tier` field (`'HIGH' | 'NORMAL' | 'LOW'`) on each signal, computed from the confidence score.

### Frontend Changes

| File | Change |
|------|--------|
| `src/types/signal.types.ts` | Add `confidence_tier: 'HIGH' \| 'NORMAL' \| 'LOW' \| null` to the `Signal` interface |
| `src/types/signal.types.ts` | Add `confidence_tier?: 'HIGH' \| 'NORMAL' \| 'LOW' \| 'all'` to `SignalFilters` |
| `src/components/common/ConfidenceBar.tsx` | Show tier label next to the bar (e.g., "High Priority") |
| `src/components/signals/SignalCard.tsx` | Add tier badge with distinct color treatment |
| `src/components/signals/SignalBadge.tsx` | Support rendering a tier badge variant |
| `src/components/signals/SignalFilters.tsx` | Add a "Priority" dropdown filter: All / High / Normal / Low |
| `src/hooks/useSignals.ts` | Pass `confidence_tier` filter to API call |
| `src/pages/Signals.tsx` | Include tier filter in filter bar; support sorting by tier |

### Display Rules

| Tier | Badge Color | Label |
|------|-------------|-------|
| HIGH | Green | "High Priority" |
| NORMAL | Blue | "Normal" |
| LOW | Amber | "Low Priority" |
| null (legacy) | Grey | "—" |

### ConfidenceBar Enhancement

The existing `ConfidenceBar` uses color thresholds (70-79 amber, 80-89 light green, 90-100 green). These remain unchanged. The tier label is appended as a small text badge to the right of the bar.

### Where It Appears

- **Dashboard** — SignalCard tiles show tier badge
- **Signals page** — SignalTable column, filter dropdown, sort option
- **SignalDetailDrawer** — Tier label in the confidence section

---

## 3. Trend Slope — UI Changes

### What the Backend Adds

A new `ema50_slope` field (positive = rising, negative = falling) on each stock's features.

### Frontend Changes

| File | Change |
|------|--------|
| `src/types/stock.types.ts` | Add `ema50_slope: number \| null` to the `Features` interface |
| `src/components/stocks/FeatureGrid.tsx` | Display `ema50_slope` as "EMA50 Trend" with directional arrow |
| `src/components/stocks/IndicatorGrid.tsx` | Show slope value in the EMA section with up/down visual |

### Display Rules

- `ema50_slope > 0` — green up-arrow + value (e.g., "↑ +12.45")
- `ema50_slope <= 0` — red down-arrow + value (e.g., "↓ -3.20")
- `null` — dash ("—")

### Where It Appears

- **StockDetail page** — FeatureGrid and IndicatorGrid sections

---

## 4. Adaptive Learning — No Frontend Changes

Improvement 4 is entirely backend (calibration job logic). No types, components, or hooks are affected.

---

## 5. Smart Expiry Handling — UI Changes

### What the Backend Adds

Expired trades with negligible price movement receive an opportunity cost penalty (-0.1% to -0.2%). The `exit_reason` value can now be `'EXPIRED_PENALIZED'` in addition to the existing `'EXPIRED'`.

### Frontend Changes

| File | Change |
|------|--------|
| `src/types/signal.types.ts` | Add `'EXPIRED_PENALIZED'` to `SignalStatus` type |
| `src/types/paperTrade.types.ts` | Add `'EXPIRED_PENALIZED'` to exit_reason union if it exists |
| `src/components/paper_trading/PaperTradeTable.tsx` | Render `EXPIRED_PENALIZED` rows with a tooltip explaining the penalty |
| `src/components/signals/SignalBadge.tsx` | Map `EXPIRED_PENALIZED` to the same visual as `EXPIRED` but with a penalty indicator |
| `src/utils/format.ts` | Add `formatExitReason()` helper: maps `EXPIRED_PENALIZED` to "Expired (penalized)" |

### Display Rules

- `EXPIRED_PENALIZED` shows the same amber/grey color as `EXPIRED`
- A small info icon with tooltip: "Opportunity cost penalty applied due to negligible price movement"
- PnL column for these rows shows the penalized value (already adjusted by backend)

### Where It Appears

- **Paper Trading page** — PaperTradeTable exit_reason column
- **Signals page** — Signal status badge (if signal was expired with penalty)

---

## New Types Summary

```typescript
// signal.types.ts additions
export type SignalStatus = 'ACTIVE' | 'TARGET_HIT' | 'SL_HIT' | 'EXPIRED' | 'EXPIRED_PENALIZED';
export type ConfidenceTier = 'HIGH' | 'NORMAL' | 'LOW';

// Signal interface additions
confidence_tier: ConfidenceTier | null;

// SignalFilters additions
confidence_tier?: ConfidenceTier | 'all';

// stock.types.ts additions (Features interface)
close_position: number | null;
ema50_slope: number | null;
```

---

## Implementation Order

1. **Types first** — Update `signal.types.ts` and `stock.types.ts` with new fields
2. **Improvement 1 + 3** — FeatureGrid / IndicatorGrid display for `close_position` and `ema50_slope`
3. **Improvement 2** — ConfidenceBar tier badge, SignalCard tier badge, SignalFilters tier dropdown
4. **Improvement 5** — SignalBadge and PaperTradeTable penalty display

This order matches the backend implementation sequence and ensures types are available before components consume them.

---

## 6. Entry Price Fix — Frontend Type Update

**Status: IMPLEMENTED**

### What the Backend Adds

Paper trades now have an `actual_entry_price` field — the next-day open price used as the realistic entry for PnL calculations.

### Frontend Changes

| File | Change |
|------|--------|
| `src/types/paperTrade.types.ts` | Added `actual_entry_price: number \| null` to `PaperTrade` interface |

The field is returned by the `GET /api/v1/paper-trading/trades` endpoint. It may be `null` for trades created before the fix or where next-day data isn't available yet.

---

## 7. Remove Liquidity Gate — Frontend Cleanup

**Status: IMPLEMENTED**

### Frontend Changes

| File | Change |
|------|--------|
| `src/components/stocks/FeatureGrid.tsx` | Removed `is_liquid` pill from the feature grid |
| `src/types/rejectedSignal.types.ts` | Removed `LIQUIDITY_GATE` from `RejectStage` union type |

The `is_liquid` field remains on `StockFeatures` type for backward compatibility but is no longer displayed.

---

## 8. Paper Trade Feedback Loop — No Direct Frontend Impact

**Status: IMPLEMENTED (backend only)**

A new `GET /api/v1/strategies` endpoint returns strategy enable/disable status. No frontend components currently consume this endpoint, but it is available for future use (e.g., a strategy status panel on the Settings or Dashboard page).
