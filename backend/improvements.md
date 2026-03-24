# Backend Improvements Log

## Phase 2 — Five Feature Improvements (Migrations 023–025)

### Feature 1: Explainability Layer

Signals now include a human-readable `explanation` array that describes why the signal was generated, using the same data that the scoring engine evaluates.

**Files changed:**

- `src/services/scoring/scoring.service.js` — Added `buildExplanations(feature, indicator, regime, sentiment)` function that produces an array of plain-English sentences covering trend alignment, RSI zone, volume tier, breakout status, delivery quality, and news sentiment.
- `src/services/signals/signal.service.js` — Calls `buildExplanations` after scoring and attaches the `explanation` array to the signal object before storage.
- `src/models/signal.model.js` — `explanation` column added to INSERT (stored as JSON).
- `src/routes/signal.routes.js` — Parses `explanation` from JSON string when returning signals via API.

**Migration:** `023_add_explanation_and_breakdown.sql` — Adds `explanation JSON DEFAULT NULL` to `signals` table.

**API impact:** `GET /signals` and `GET /signals/active` now include `explanation: string[] | null` on each signal.

---

### Feature 2: Confidence Breakdown

The confidence score is now decomposed into four buckets: Technical, Momentum, Volume, and Quality.

**Files changed:**

- `src/services/scoring/scoring.service.js` — Internal scoring logic refactored into `_scoreInternal()` which returns `{ score, breakdown, feature, indicator }`. New export `calculateScoreWithBreakdown(symbol, date)` returns the full breakdown. Existing `calculateScore()` remains backward-compatible.
- `src/services/signals/signal.service.js` — Switched from `calculateScore` to `calculateScoreWithBreakdown`. Attaches `confidence_breakdown` to the signal object.
- `src/models/signal.model.js` — `confidence_breakdown` column added to INSERT (stored as JSON).
- `src/routes/signal.routes.js` — Parses `confidence_breakdown` from JSON string.

**Migration:** `023_add_explanation_and_breakdown.sql` — Adds `confidence_breakdown JSON DEFAULT NULL` to `signals` table.

**API impact:** `GET /signals` and `GET /signals/active` now include `confidence_breakdown: { technical, momentum, volume, quality } | null`.

---

### Feature 3: Trade Checklist

Pure frontend feature — no backend changes required. See `frontend/improvements.md`.

---

### Feature 4: Rejected Signals Log

Every signal rejection in `deduplicateAndGenerate` is now persisted to a new `rejected_signals` table for full transparency.

**Files created:**

- `src/models/rejected_signal.model.js` — `insertRejected(entry)` and `findByDate(date)` functions.
- `migrations/024_create_rejected_signals.sql` — Creates `rejected_signals` table with columns: `id`, `symbol`, `date`, `strategy_source`, `reject_stage` (ENUM), `reject_reason`, `raw_confidence`, `raw_rr`, `created_at`. Indexed on `symbol`, `date`, `reject_stage`.

**Files changed:**

- `src/services/signals/signal.service.js` — Added `rejectedSignalModel.insertRejected(...)` calls at every rejection point:
  - `MERGED_RISK_ZERO` — non-positive risk after SL merge
  - `LIQUIDITY_GATE` — is_liquid = false
  - `VWAP_FILTER` — price stretched beyond ±2% from VWAP
  - `PCR_FILTER` — PCR > 1.5 for LONG signals
  - `CONFIDENCE_GATE` — confidence below minimum
  - `RR_GATE` — risk:reward below minimum
  - `ACTIVE_CAP` — active signal cap reached
  - `SECTOR_GATE` — sector cap reached
  - `POSITION_SIZING` — position sizing resulted in 0 shares
- `src/routes/signal.routes.js` — Added `GET /signals/rejected?date=YYYY-MM-DD` route (placed before `/signals` to avoid route conflicts).

**API endpoints added:**

- `GET /api/v1/signals/rejected` — Returns rejected signals, optionally filtered by date. Response: `{ success, data: { rejected: [...] }, error }`.

---

### Feature 5: Manual Decision Log (Trade Override)

Traders can record whether they took, skipped, or modified a signal, with optional notes and actual entry/qty overrides.

**Files created:**

- `src/models/trade_decision.model.js` — `upsertDecision(...)`, `getDecisionForSignal(signal_id, user_identifier)`, `getDecisionHistory(user_identifier, limit)`.
- `src/routes/tradeDecision.routes.js` — Three endpoints:
  - `POST /api/v1/signals/:id/decision` — Upsert a trade decision (TAKEN/SKIPPED/MODIFIED)
  - `GET /api/v1/signals/:id/decision` — Get decision for a signal
  - `GET /api/v1/decisions` — Decision history (joined with signals)
- `migrations/025_create_trade_decisions.sql` — Creates `trade_decisions` table with unique index on `(signal_id, user_identifier)`.

**Files changed:**

- `src/validations/signal.validation.js` — Added `decisionSchema` Joi validation (decision enum, notes, actual_entry, actual_qty).
- `server.js` — Registered `tradeDecisionRoutes` with `app.use('/api/v1', tradeDecisionRoutes)`.

**API endpoints added:**

- `POST /api/v1/signals/:id/decision` — Body: `{ decision, notes?, actual_entry?, actual_qty? }`
- `GET /api/v1/signals/:id/decision`
- `GET /api/v1/decisions?limit=N`
