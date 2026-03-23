# TradeNeuron — Cursor Development Workflow
## How to build this system efficiently with Cursor AI

---

## PART 1: SETUP (Do this once before writing any code)

### 1.1 File placement

```
backend/
  .cursorrules                        ← the rules file (already created)
  backend_technical_document.md       ← copy your doc here too
  CURSOR_WORKFLOW.md                  ← this file
```

Cursor reads `.cursorrules` automatically from the project root.
Keeping the technical document in the same repo means you can tell Cursor
"read the doc" and it will find it immediately.

### 1.2 Create a PROGRESS.md file at the root

This is your single source of truth for what's done, in progress, and blocked.
Update it at the end of every Cursor session — even a 30-minute one.

```markdown
# TradeNeuron — Build Progress

## Status Key
✅ Complete | 🔄 In Progress | ⬜ Not Started | ❌ Blocked

## Phase 1: Foundation
- ✅ Project scaffold (package.json, folder structure)
- ✅ 001_create_candles.sql
- ✅ 002_create_indicators.sql
- ✅ 003_create_features.sql
- ✅ 004_create_signals.sql
- ✅ 005_create_backtest_results.sql
- ✅ 006_create_favorites.sql
- ✅ 007_create_fundamentals.sql
- ✅ 008_create_sentiment_flags.sql
- ✅ 009_create_paper_trades.sql
- ✅ 010_add_is_liquid_to_features.sql
- ✅ scripts/migrate.js
- ✅ src/config/env.js
- ✅ src/config/db.js
- ✅ src/config/constants.js
- ✅ src/utils/errors.js
- ✅ src/utils/date.util.js
- ✅ src/utils/math.util.js
- ✅ src/utils/retry.util.js
- ✅ src/utils/symbols.util.js
- ✅ src/middlewares/auth.middleware.js
- ✅ src/middlewares/error_handler.middleware.js
- ✅ src/middlewares/logger.middleware.js
- ✅ src/middlewares/rate_limiter.middleware.js
- ✅ server.js

## Phase 2: Data Layer
- ⬜ src/services/data_ingestion/yahoo.service.js
- ⬜ src/services/data_ingestion/bhavcopy.service.js
- ⬜ src/services/data_ingestion/validation.service.js
- ⬜ src/models/candle.model.js

## Phase 3: Indicator Engine
- ⬜ src/services/indicators/ema.service.js
- ⬜ src/services/indicators/rsi.service.js
- ⬜ src/services/indicators/macd.service.js
- ⬜ src/services/indicators/atr.service.js
- ⬜ src/services/indicators/volume.service.js
- ⬜ src/services/indicators/index.js
- ⬜ src/models/indicator.model.js

## Phase 4: Feature Engineering + Adaptive Thresholds
- ⬜ src/services/features/feature.service.js
- ⬜ src/services/features/adaptive_threshold.service.js
- ⬜ src/models/feature.model.js
- ⬜ src/models/adaptive_threshold.model.js

## Phase 5: Strategy + Regime
- ⬜ src/services/strategies/trend_pullback.strategy.js
- ⬜ src/services/strategies/breakout.strategy.js
- ⬜ src/services/strategies/range.strategy.js
- ⬜ src/services/strategies/mean_reversion.strategy.js
- ⬜ src/services/strategies/trend_pullback_short.strategy.js
- ⬜ src/services/strategies/breakdown.strategy.js
- ⬜ src/services/strategies/index.js

## Phase 6: Filters
- ⬜ src/services/fundamentals/fundamental.service.js
- ⬜ src/services/fundamentals/fundamental.filter.js
- ⬜ src/services/sentiment/news.service.js
- ⬜ src/services/sentiment/sentiment.service.js
- ⬜ src/models/fundamental.model.js
- ⬜ src/models/sentiment_flag.model.js

## Phase 7: Signal Generation
- ⬜ src/services/scoring/scoring.service.js
- ⬜ src/services/signals/signal.service.js
- ⬜ src/models/signal.model.js

## Phase 8: Paper Trading
- ⬜ src/services/paper_trading/paper_trade.service.js
- ⬜ src/models/paper_trade.model.js

## Phase 9: Backtesting
- ⬜ src/services/backtesting/backtest.service.js
- ⬜ src/services/backtesting/metrics.service.js
- ⬜ src/models/backtest_result.model.js

## Phase 10: Favorites
- ⬜ src/services/favorites/favorite.service.js
- ⬜ src/models/favorite.model.js

## Phase 11: Pipeline + Jobs
- ⬜ src/jobs/daily_pipeline.job.js
- ⬜ src/jobs/weekly_fundamentals.job.js

## Phase 12: API Routes + Validations
- ⬜ src/validations/signal.validation.js
- ⬜ src/validations/stock.validation.js
- ⬜ src/validations/favorite.validation.js
- ⬜ src/routes/health.routes.js
- ⬜ src/routes/signal.routes.js
- ⬜ src/routes/stock.routes.js
- ⬜ src/routes/history.routes.js
- ⬜ src/routes/backtest.routes.js
- ⬜ src/routes/favorite.routes.js
- ⬜ src/routes/paper_trade.routes.js

## Phase 13: Scripts
- ⬜ scripts/seed_historical.js
- ⬜ scripts/run_backtest.js

## Phase 14: Tests
- ⬜ tests/fixtures/ (candles, fundamentals, rss)
- ⬜ tests/unit/indicators/
- ⬜ tests/unit/features/
- ⬜ tests/unit/scoring/
- ⬜ tests/unit/strategies/
- ⬜ tests/unit/fundamentals/
- ⬜ tests/unit/sentiment/
- ⬜ tests/unit/paper_trading/
- ⬜ tests/integration/pipeline.test.js
- ⬜ tests/integration/api.test.js

## Phase 15: Upgrade Migrations
- ⬜ 011_add_position_sizing_to_signals.sql
- ⬜ 012_add_position_sizing_to_paper_trades.sql
- ⬜ 013_create_adaptive_thresholds.sql
- ⬜ 014_add_is_ranging_to_features.sql
- ⬜ 015_add_z_score_to_features.sql
- ⬜ 016_add_sentiment_upgrade_columns.sql
- ⬜ 017_add_sell_signals_and_direction.sql

## Known Issues / Blockers
<!-- Add anything that's broken or needs decision -->

## Document Sync Log
[2026-03-23] — Major upgrade: Added 5 enhancements (Position Sizing, Adaptive Thresholds, Range+MeanReversion strategies, Negation-aware Sentiment, SELL Signals). Pipeline expanded from 12 to 13 steps. Migrations 011-017 added.
```

---

## PART 2: HOW TO PROMPT CURSOR EFFECTIVELY

### 2.1 The Golden Rule for every prompt

Always start your prompt with context. Cursor does not remember between sessions.

**Template:**
```
Context: I'm building TradeNeuron, a Node.js/Express stock signal backend.
The rules are in .cursorrules. The full spec is in backend_technical_document.md.
Current progress is in PROGRESS.md.

Task: [specific thing you want]

Constraints:
- [any specific constraint for this task]
- Follow .cursorrules exactly
```

### 2.2 Start-of-session prompt (use this every time you open Cursor)

```
Read .cursorrules and PROGRESS.md.
Summarise what's been completed and what the next incomplete item is.
Do not write any code yet — just confirm your understanding.
```

This prevents Cursor from jumping ahead or making assumptions about state.

### 2.3 Good prompt patterns for each phase

**For creating a new service file:**
```
Context: TradeNeuron backend. Rules in .cursorrules. Spec in backend_technical_document.md.

Create src/services/indicators/ema.service.js

Requirements (from Section 7.1 of the spec):
- Input: array of adjusted_close values (oldest first)
- Periods: 20, 50, 200
- Library: technicalindicators.EMA
- Return: { ema_20, ema_50, ema_200 } aligned by date index
- NULLs for leading values when period > available data
- No hardcoded values — read periods from constants.js

After writing the file, tell me what test cases I should write for it.
```

**For creating a model file:**
```
Context: TradeNeuron. Rules in .cursorrules.

Create src/models/candle.model.js

This is a DB query wrapper. Business logic lives in services, not here.
Methods needed:
- upsertCandle(candleData) — INSERT ... ON DUPLICATE KEY UPDATE
- getCandlesBySymbol(symbol, startDate, endDate) — sorted by date ASC
- getLatestCandle(symbol)
- getLatestDate(symbol) — returns most recent date for a symbol (used to determine fetch start)

Use parameterised queries. Import pool from src/config/db.js.
Follow the table schema from Section 4.1 of backend_technical_document.md.
```

**For creating a pipeline step:**
```
Context: TradeNeuron. Rules in .cursorrules. Spec Section 18.

I'm working on daily_pipeline.job.js — specifically Step 7 (Fundamental Filter).

The pipeline step:
- Iterates over raw_signals (object keyed by symbol)
- For each symbol, queries fundamentals table for latest row
- If is_healthy = false: removes symbol from raw_signals, increments rejected_fundamental
- If no row exists: logs warn and continues (fail-open)
- Logs total rejected count at end

Do not write the whole pipeline file yet. Just write the filterByFundamentals(rawSignals)
helper function that Step 7 will call. Return the filtered rawSignals and the count.
```

**For writing tests:**
```
Context: TradeNeuron. Rules in .cursorrules — mocking rules in Section 15.

Write unit tests for src/services/fundamentals/fundamental.filter.js

Test cases required (from Section 20 of spec):
1. Symbol with D/E > 2.0 → is_healthy = false, signal rejected
2. Symbol with EPS negative for 2 quarters → rejected
3. Symbol with promoter pledge > 50% → rejected
4. Symbol with no fundamentals row → fail-open, signal allowed
5. Symbol with all metrics within thresholds → is_healthy = true, signal passes
6. Edge case: D/E exactly at 2.0 → passes (threshold is strictly greater than)

Mock the DB query. Do not call a real database.
Use fixtures from tests/fixtures/fundamentals/ for mock data.
```

### 2.4 When Cursor goes off-spec

If Cursor writes something that contradicts the technical document:

```
This doesn't match the spec. In backend_technical_document.md, Section [X], it says:
[paste the exact spec text]

Please rewrite [function/file] to match the spec exactly.
Specifically: [what's wrong]
```

### 2.5 Asking Cursor to check its own work

After any significant file is written:
```
Review the file you just wrote against .cursorrules and Section [X] of
backend_technical_document.md.

Check:
1. Does it use adjusted_close (not close) where prices are involved?
2. Are all config values from env.js (no hardcoded numbers)?
3. Is the risk <= 0 guard present (if this is strategy/signal code)?
4. Are all DB queries parameterised?
5. Are all errors thrown using custom classes from errors.js?
6. Is the IST timezone used correctly?

List any violations found.
```

---

## PART 3: DEVELOPMENT PHASES — RECOMMENDED ORDER

Build in this order. Each phase depends on the previous one being complete and tested.

### Phase 1 — Foundation (Day 1)
**Goal:** Project boots, connects to DB, env validation works.

Files to create in order:
1. `package.json` with all approved dependencies
2. `.env.example` (copy from spec Section 3)
3. `src/config/env.js` — loads + validates all required vars, exports frozen config
4. `src/config/db.js` — pool setup, startup ping, error handler, graceful shutdown
5. `src/config/constants.js` — symbol list, sector map, NSE holidays, scoring weights
6. `src/utils/errors.js` — all 7 custom error classes
7. `src/utils/date.util.js` — IST helpers, isTradingDay, countTradingDays
8. `src/utils/math.util.js` — rounding helpers
9. `src/utils/retry.util.js` — exponential backoff wrapper
10. `src/utils/symbols.util.js` — exports nifty_50_symbols, sector_map, index symbols
11. All 4 middleware files
12. `server.js` — minimal: DB ping, middleware, placeholder routes, cron placeholder
13. All 10 migration SQL files
14. `scripts/migrate.js`

**Done when:** `node server.js` starts without errors. `node scripts/migrate.js` creates all tables.

### Phase 2 — Data Layer (Day 2)
**Goal:** Candles flow into the database from Yahoo Finance.

1. `src/models/candle.model.js`
2. `src/utils/retry.util.js` (if not done)
3. `src/services/data_ingestion/yahoo.service.js`
4. `src/services/data_ingestion/bhavcopy.service.js`
5. `src/services/data_ingestion/validation.service.js`
6. Unit tests for validation service (with fixture data)

**Done when:** You can call `fetchAndStoreCandles('RELIANCE.NS')` and a candle row appears in the DB.

### Phase 3 — Indicators (Day 2–3)
**Goal:** All 5 indicators computed and stored.

1. Each indicator service (ema, rsi, macd, atr, volume)
2. `src/services/indicators/index.js` orchestrator
3. `src/models/indicator.model.js`
4. Unit tests comparing output against known reference values (e.g. from TradingView)

**Critical test:** Calculate EMA(20) on a known dataset and compare to TradingView.
If they match, your indicator engine is correct.

### Phase 4 — Features (Day 3)
**Goal:** All 8 features computed per symbol per day.

1. `src/services/features/feature.service.js`
2. `src/models/feature.model.js`
3. Unit tests for each feature boolean with controlled inputs

**Critical tests:**
- `is_liquid` below and above MIN_LIQUIDITY_VOLUME
- `near_support` with price at exactly swing_low * 1.01 (boundary)
- `relative_strength_vs_nifty` when NIFTY candles are missing

### Phase 5 — Strategies (Day 4)
**Goal:** Raw signals generated for test symbols.

1. `src/services/strategies/trend_pullback.strategy.js`
2. `src/services/strategies/breakout.strategy.js`
3. `src/services/strategies/index.js` (market regime check here)
4. Unit tests for every entry condition boundary

**Critical tests:**
- risk exactly = 0 → discard
- risk < 0 (SL > entry in breakout) → discard with log
- NIFTY below EMA200 → no signals
- VIX > 20 → no signals
- VIX exactly = 20 → no signals (threshold is strictly less than)

### Phase 6 — Filters (Day 4–5)
**Goal:** Fundamental and sentiment gates working correctly.

1. `src/services/fundamentals/fundamental.service.js` (quoteSummary fetch + store)
2. `src/services/fundamentals/fundamental.filter.js` (health computation + gate)
3. `src/services/sentiment/news.service.js` (RSS fetch)
4. `src/services/sentiment/sentiment.service.js` (keyword scoring)
5. Models for both
6. `src/jobs/weekly_fundamentals.job.js`
7. Tests for all rejection criteria + fail-open behaviour + RSS mock

### Phase 7 — Signal Generation (Day 5)
**Goal:** Complete signal objects emitted and stored.

1. `src/services/scoring/scoring.service.js`
2. `src/services/signals/signal.service.js` (deduplication + all gates)
3. `src/models/signal.model.js`
4. Tests for:
   - All 4 scoring weights
   - All gate conditions (confidence, R:R, active cap, sector cap)
   - Merged signal with risk <= 0 after merge → discard
   - Same-candle SL/target → SL wins

### Phase 8 — Pipeline + Paper Trading (Day 6)
**Goal:** Full 12-step pipeline runs end-to-end.

1. `src/services/paper_trading/paper_trade.service.js`
2. `src/models/paper_trade.model.js`
3. `src/jobs/daily_pipeline.job.js` — wire all 12 steps together
4. Integration test: seed fixture data, run full pipeline, verify signals and paper trades created

### Phase 9 — Backtesting (Day 7)
**Goal:** Walk-forward backtest produces stored results.

1. `src/services/backtesting/backtest.service.js`
2. `src/services/backtesting/metrics.service.js`
3. `src/models/backtest_result.model.js`
4. `scripts/run_backtest.js`
5. `scripts/seed_historical.js`

### Phase 10 — Favorites + All Routes (Day 8)
**Goal:** All API endpoints working.

1. `src/services/favorites/favorite.service.js`
2. All 7 route files
3. All 3 validation schemas (Joi)
4. Integration test: hit every endpoint with supertest

### Phase 11 — Full Test Suite + Hardening (Day 9–10)
**Goal:** 80%+ coverage, all edge cases covered.

1. Complete all missing unit tests
2. All integration tests (pipeline, API, filter, regime)
3. Backtest regression baseline
4. Final review against .cursorrules

---

## PART 4: DOCUMENT SYNC WORKFLOW

### When to update `backend_technical_document.md`

Update it **in the same Cursor session** whenever you change any of these:

| Change | Section to update |
|--------|------------------|
| New/modified DB column | Section 4 (schema) + migration file |
| New/renamed env var | Section 3 (.env.example) + env.js required list |
| Pipeline step added/changed | Section 18 (pipeline sequence + step table) |
| API endpoint changed | Section 17 (relevant endpoint) |
| Scoring weight changed | Section 12 (weight table + gate implication note) |
| Strategy condition changed | Section 9 (entry conditions table) |
| New error class | Section 19 (error class table) |
| New package | Section 2 (dependencies table) |

### Cursor prompt for document sync

After making a code change that affects the document:
```
I just changed [what you changed] in [file].
Specifically: [brief description of the change]

Update backend_technical_document.md Section [N] to reflect this change.
Keep the same document style and format.
Show me only the changed section.
```

### Document sync log

Every time you update the document, add an entry to the sync log in PROGRESS.md:
```
## Document Sync Log
[2026-03-25] — Added `neutral_count` column to paper_trades table (Section 4.9, migration 011)
[2026-03-26] — Changed VIX_THRESHOLD default to 18 after backtesting (Section 3, Section 9.1)
```

This creates a changelog that makes it easy to see how the spec evolved.

---

## PART 5: COMMON CURSOR PITFALLS AND HOW TO AVOID THEM

### Pitfall 1: Cursor forgets context between sessions
**Symptom:** Cursor uses `close` instead of `adjusted_close`, or reads `process.env` directly.
**Fix:** Start every session with the "Start-of-session prompt" (Section 2.2). The `.cursorrules` file mitigates this but doesn't eliminate it.

### Pitfall 2: Cursor writes a giant file in one shot
**Symptom:** Cursor writes all of `daily_pipeline.job.js` at once — it's too long and likely has errors.
**Fix:** Ask for one function at a time. For pipeline files, ask for each step as a separate helper function, then ask Cursor to wire them together.

### Pitfall 3: Cursor invents a package or uses the wrong one
**Symptom:** Cursor imports `moment-timezone` for date handling instead of using `date.util.js`.
**Fix:** `.cursorrules` lists approved packages. If Cursor still does this, say: "Do not use [package]. Use [correct approach] instead as specified in .cursorrules."

### Pitfall 4: Cursor writes tests that call real APIs
**Symptom:** A test imports `yahoo.service.js` and actually fetches from Yahoo Finance.
**Fix:** The `.cursorrules` testing section explicitly forbids this. If it happens anyway: "This test calls a real API. Rewrite it to mock `yahoo-finance2` using fixture data from `tests/fixtures/candles/`."

### Pitfall 5: Cursor creates a new file in the wrong location
**Symptom:** Creates `src/utils/indicator.js` instead of `src/services/indicators/ema.service.js`.
**Fix:** The project structure in `.cursorrules` is explicit. Say: "Wrong location. According to .cursorrules Section 3, this file belongs at [correct path]. Move it."

### Pitfall 6: Cursor changes the spec while trying to fix code
**Symptom:** Cursor decides `risk_reward = 1.5` is "good enough" and changes the MIN_RISK_REWARD.
**Fix:** Never let Cursor change thresholds or business logic without your explicit instruction. Add "Do not change any threshold or business rule values — only fix the implementation" to sensitive prompts.

### Pitfall 7: Cursor adds a new column without a migration file
**Symptom:** Cursor adds `last_signal_date` to the `fundamentals` table schema but doesn't create a migration.
**Fix:** Remind it: "Never add a DB column without creating a numbered migration SQL file in migrations/. Create migration 011_add_last_signal_date_to_fundamentals.sql."

---

## PART 6: QUICK REFERENCE

### Key file responsibilities (what lives where)

| What | Where |
|------|-------|
| All config values | `src/config/env.js` (exported) |
| Symbol list + sector map | `src/utils/symbols.util.js` |
| NSE holidays + date utils | `src/utils/date.util.js` |
| Scoring weights | `src/config/constants.js` |
| Custom error classes | `src/utils/errors.js` |
| DB pool | `src/config/db.js` |
| Business logic | `src/services/**` |
| DB query wrappers | `src/models/**` |
| Route handlers (thin) | `src/routes/**` |
| Pipeline orchestration | `src/jobs/daily_pipeline.job.js` |
| Fixture data for tests | `tests/fixtures/**` |

### Commands

```bash
# Start dev server
npm run dev

# Run migrations
node scripts/migrate.js

# Unit tests
npm test

# Integration tests (need test DB)
npm run test:integration

# Coverage
npm run test:coverage

# Seed historical data (one-time)
node scripts/seed_historical.js

# Manual backtest
node scripts/run_backtest.js
```

### Pipeline step reference (13 steps)

| Step | Action | Symbols |
|------|--------|---------|
| 1 | Fetch candles | NIFTY50 + ^NSEI + ^INDIAVIX |
| 2 | Validate data | NIFTY50 + ^NSEI + ^INDIAVIX |
| 3 | Compute indicators | NIFTY50 + ^NSEI only |
| 4 | Extract features (is_ranging, z_score_20d, adaptive) | NIFTY50 only |
| 5 | Compute adaptive thresholds | NIFTY50 + ^INDIAVIX |
| 6 | Market regime check (BULLISH/SIDEWAYS/BEARISH/HIGH_VOL) | ^NSEI + ^INDIAVIX |
| 7 | Run strategies (4 long + 2 short, regime-gated) | NIFTY50 |
| 8 | Fundamental filter | Only symbols with raw signals |
| 9 | Sentiment filter (negation-aware + optional Finnhub) | Only symbols still in raw_signals |
| 10 | Score + generate + position sizing | Only symbols still in raw_signals |
| 11 | Store + paper trades | final_signals only |
| 12 | Update signal statuses | All ACTIVE signals |
| 13 | Update paper trade statuses | All OPEN trades |

### Signal gate order (must be in this sequence)
1. Merge strategies → risk guard (risk <= 0 → null)
2. is_liquid check
3. Confidence gate (< MIN_CONFIDENCE → null)
4. Risk/reward gate (< MIN_RISK_REWARD → null)
5. Active signal cap (BUY and SELL counted independently)
6. Sector cap (BUY and SELL counted independently)
7. Position sizing (ATR-based, MAX_POSITION_PCT cap, SHORT gets half limit)

### Market regime routing
| Regime | Long strategies | Short strategies | Notes |
|--------|----------------|-----------------|-------|
| BULLISH | Trend Pullback, Breakout, Range, Mean Reversion | None | All 4 fire |
| SIDEWAYS | Range, Mean Reversion | None | Trending strategies skipped |
| BEARISH | None | Trend Pullback SHORT, Breakdown | Only short strategies |
| HIGH_VOLATILITY | None | None | Pipeline skips to status updates |
