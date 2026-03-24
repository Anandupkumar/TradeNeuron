# Frontend Improvements Log

## Phase 2 — Five Feature Improvements

### Feature 1: Explainability Panel

Replaces the plain "Reasons" badge pills in the Signal Detail Drawer with rich, human-readable explanation sentences.

**Files created:**

- `src/components/signals/ExplainabilityPanel.tsx` — Renders `explanation` array as a checklist with checkmark icons. Falls back to `reasons` badge pills if `explanation` is null (backward compatible with older signals).

**Files changed:**

- `src/types/signal.types.ts` — Added `explanation: string[] | null` to `Signal` interface.
- `src/components/signals/SignalDetailDrawer.tsx` — Replaced inline reasons section with `<ExplainabilityPanel>`.

---

### Feature 2: Confidence Breakdown Bar

Replaces the single-color confidence bar with a segmented, multi-color bar showing how the score is composed.

**Files created:**

- `src/components/signals/ConfidenceBreakdownBar.tsx` — Segmented bar with 4 colored sections:
  - Technical (blue)
  - Momentum (green)
  - Volume (amber)
  - Quality (purple)
  - Includes a legend grid showing individual point values. Falls back to simple confidence bar if breakdown is null.

**Files changed:**

- `src/types/signal.types.ts` — Added `ConfidenceBreakdown` interface and `confidence_breakdown: ConfidenceBreakdown | null` to `Signal`.
- `src/types/index.ts` — Exported `ConfidenceBreakdown`.
- `src/components/signals/SignalDetailDrawer.tsx` — Replaced inline confidence bar with `<ConfidenceBreakdownBar>`.

---

### Feature 3: Trade Checklist

A grid of pass/warn/fail check items derived from signal data. No backend changes needed.

**Files created:**

- `src/components/signals/TradeChecklist.tsx` — Grid of 6 check items (Confidence, R:R, Direction, Status, Position Size, Volume) each with pass/warn/fail icons. All data derived from the existing `Signal` object and `confidence_breakdown`.

**Files changed:**

- `src/components/signals/SignalDetailDrawer.tsx` — Added `<TradeChecklist>` between position sizing and explanation panels.

---

### Feature 4: Rejected Signals Log

Adds a collapsible section on the Signals page showing which symbols were rejected by the pipeline and why.

**Files created:**

- `src/types/rejectedSignal.types.ts` — `RejectStage` union type, `RejectedSignal` interface, `RejectedSignalsResponse`.

**Files changed:**

- `src/types/index.ts` — Exported `RejectStage`, `RejectedSignal`, `RejectedSignalsResponse`.
- `src/api/signals.api.ts` — Added `rejected(date?: string)` method.
- `src/pages/Signals.tsx` — Added `RejectedSignalsSection` component: collapsible "Show rejected signals" toggle with lazy-loaded table showing symbol, strategy, reject stage (colored pill), reason text, confidence, and R:R.

---

### Feature 5: Manual Decision Log (Trade Override)

Traders can record their decision (Taken/Skipped/Modified) for any signal, with optional notes and actual entry/qty.

**Files created:**

- `src/types/tradeDecision.types.ts` — `DecisionType`, `TradeDecision`, `DecisionHistoryItem`, `DecisionHistoryResponse` types.
- `src/api/tradeDecision.api.ts` — `get`, `upsert`, `history` API methods.
- `src/hooks/useTradeDecisions.ts` — `useDecision(signalId)` query and `useUpsertDecision(signalId)` mutation with toast notifications.
- `src/components/signals/DecisionOverridePanel.tsx` — Three decision buttons (Taken/Skipped/Modified), notes textarea, optional actual entry/qty fields (shown for "Modified"), save button with loading state, last-updated timestamp.

**Files changed:**

- `src/types/index.ts` — Exported `DecisionType`, `TradeDecision`, `DecisionHistoryItem`, `DecisionHistoryResponse`.
- `src/components/signals/SignalDetailDrawer.tsx` — Added `<DecisionOverridePanel>` as the last section in the drawer.

---

## SignalDetailDrawer Layout (updated)

The Signal Detail Drawer now contains the following sections in order:

1. Symbol + Date header
2. Signal type + Status badges
3. **Confidence Breakdown Bar** (new)
4. Price rows (Entry, Target, Stop Loss)
5. Position sizing details (R:R, Shares, Value, Capital at Risk)
6. Strategy details (Strategy, Direction, Date)
7. **Trade Checklist** (new)
8. **Explainability Panel** (new — replaces Reasons)
9. **Decision Override Panel** (new)
