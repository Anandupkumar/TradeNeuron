# TradeNeuron -- Backend Technical Document

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack and Dependencies](#2-tech-stack-and-dependencies)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Design](#4-database-design)
5. [NIFTY 50 Symbol Registry](#5-nifty-50-symbol-registry)
6. [Data Ingestion Pipeline](#6-data-ingestion-pipeline)
7. [Indicator Engine](#7-indicator-engine)
8. [Feature Engineering](#8-feature-engineering)
9. [Strategy Engine](#9-strategy-engine)
10. [Fundamental Filter](#10-fundamental-filter)
11. [News Sentiment Layer](#11-news-sentiment-layer)
12. [Scoring Engine](#12-scoring-engine)
13. [Signal Generation and Deduplication](#13-signal-generation-and-deduplication)
14. [Backtesting Engine](#14-backtesting-engine)
15. [Favorites Module](#15-favorites-module)
16. [Paper Trading Module](#16-paper-trading-module)
17. [API Contracts](#17-api-contracts)
18. [Scheduler and Pipeline Orchestration](#18-scheduler-and-pipeline-orchestration)
19. [Error Handling, Logging, and Monitoring](#19-error-handling-logging-and-monitoring)
20. [Testing Strategy](#20-testing-strategy)

---

## 1. Project Structure

```
backend/
  src/
    config/
      db.js                   # MySQL connection pool
      env.js                  # Environment variable loader and validation
      constants.js            # App-wide constants (symbol list, thresholds, scoring weights)
      nse_holidays.json       # NSE trading holidays per year (2024-2027+)
    models/
      candle.model.js
      indicator.model.js
      feature.model.js
      signal.model.js
      backtest_result.model.js
      favorite.model.js
      fundamental.model.js
      sentiment_flag.model.js
      paper_trade.model.js
      adaptive_threshold.model.js
      signal_outcome.model.js       # Signal outcome snapshots for dynamic weight calibration
      nifty50_composition.model.js  # Historical NIFTY 50 index composition
      rejected_signal.model.js      # Stores rejected signal candidates with rejection reason
      trade_decision.model.js       # Manual trader decisions (TAKEN/SKIPPED/MODIFIED)
    services/
      data_ingestion/
        yahoo.service.js      # Yahoo Finance fetcher
        bhavcopy.service.js   # NSE Bhavcopy CSV (fallback + delivery %)
        fno.service.js        # NSE F&O option chain + PCR computation
        validation.service.js # Data completeness checks
      indicators/
        ema.service.js
        rsi.service.js
        macd.service.js
        atr.service.js
        volume.service.js
        index.js              # Orchestrator -- runs all indicators
      features/
        feature.service.js    # Computes all features from indicators
        adaptive_threshold.service.js   # Rolling percentile threshold computation
      strategies/
        trend_pullback.strategy.js
        breakout.strategy.js
        range.strategy.js
        mean_reversion.strategy.js
        trend_pullback_short.strategy.js
        breakdown.strategy.js
        index.js              # Runs all strategies, collects raw signals
      scoring/
        scoring.service.js    # Weight-based scoring + tiered RVOL + adaptive weights
      signals/
        signal.service.js     # Final signal generation + deduplication
      fundamentals/
        fundamental.service.js   # Fetches and stores fundamentals via quoteSummary()
        fundamental.filter.js    # Pass/fail gate logic
      sentiment/
        news.service.js          # Fetches RSS headlines per symbol
        sentiment.service.js     # FinBERT (primary) + keyword-based (fallback) sentiment scoring
      backtesting/
        backtest.service.js   # Walk-forward backtester
        metrics.service.js    # Win rate, Sharpe, drawdown calculations
      favorites/
        favorite.service.js   # Add/remove/list favorite stocks
      paper_trading/
        paper_trade.service.js   # Creates and tracks simulated trades
    routes/
      signal.routes.js              # Signal CRUD + rejected signals endpoint
      stock.routes.js
      history.routes.js
      backtest.routes.js
      favorite.routes.js
      paper_trade.routes.js
      health.routes.js
      tradeDecision.routes.js       # Manual trade decision CRUD
    middlewares/
      error_handler.middleware.js
      logger.middleware.js
      auth.middleware.js
      rate_limiter.middleware.js
    utils/
      date.util.js            # IST helpers, trading day checks (loads nse_holidays.json)
      math.util.js            # Rounding, percentage calculations
      retry.util.js           # Exponential backoff wrapper
      symbols.util.js         # Canonical symbol list + sector mapping
      notify.util.js          # Telegram pipeline alert notifications
      errors.js               # Custom error classes (AppError, DataFetchError, etc.)
    jobs/
      daily_pipeline.job.js   # Full daily pipeline orchestration (with Telegram alerts)
      weekly_fundamentals.job.js  # Weekly fundamental data refresh
      weekly_weight_calibration.job.js  # Sunday cron: recalibrates scoring weights from outcomes
      cron.js                 # Registers all cron jobs (daily pipeline, weekly fundamentals, weight calibration)
    validations/
      signal.validation.js
      stock.validation.js
      favorite.validation.js
  migrations/
    001_create_candles.sql
    002_create_indicators.sql
    003_create_features.sql
    004_create_signals.sql
    005_create_backtest_results.sql
    006_create_favorites.sql
    007_create_fundamentals.sql
    008_create_sentiment_flags.sql
    009_create_paper_trades.sql
    010_add_is_liquid_to_features.sql
    011_add_position_sizing_to_signals.sql
    012_add_position_sizing_to_paper_trades.sql
    013_create_adaptive_thresholds.sql
    014_add_is_ranging_to_features.sql
    015_add_z_score_to_features.sql
    016_add_sentiment_upgrade_columns.sql
    017_add_sell_signals_and_direction.sql
    018_add_rvol_to_features.sql
    019_add_vwap_to_features.sql
    020_add_delivery_pct.sql
    021_create_signal_outcomes.sql
    022_create_nifty50_composition.sql
    023_add_explanation_and_breakdown.sql
    024_create_rejected_signals.sql
    025_create_trade_decisions.sql
    026_add_direction_to_paper_trades.sql
    027_add_soft_filter_columns.sql
    028_add_confidence_tier.sql
    029_add_actual_entry_to_paper_trades.sql
    030_create_strategy_config.sql
    031_add_execution_type_to_signals.sql
    032_add_duplicate_reject_stage.sql
  tests/
    unit/
      indicators/
      features/
      scoring/
      strategies/
      fundamentals/
      sentiment/
      paper_trading/
    integration/
      pipeline.test.js
      api.test.js
    fixtures/
      candles/                  # OHLCV fixture data per symbol
      fundamentals/             # quoteSummary fixture responses
      rss/                      # RSS XML fixture responses
  scripts/
    download_yahoo_data.py    # Python script: downloads OHLCV data via yfinance
    refresh_fundamentals.py   # Python script: weekly fundamental refresh via yfinance (called by cron)
    seed_historical.js        # Reads yahoo_data.json and bulk-inserts into MySQL
    yahoo_data.json           # Downloaded data cache (gitignored)
    run_backtest.js           # Manual backtest trigger
    migrate.js                # Run SQL migrations
    sentiment_server.py       # FinBERT FastAPI microservice for sentiment analysis
    requirements.txt          # Python dependencies for sentiment_server.py
    seed_nifty50_composition.js  # Seeds historical NIFTY 50 composition table
  .env.example
  package.json
  server.js                   # Express entry point
```

---

## 2. Tech Stack and Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.x | HTTP server and routing |
| mysql2 | ^3.x | MySQL driver with promise API and connection pooling |
| axios | ^1.x | HTTP client for Yahoo Finance, NSE Bhavcopy, and FinBERT calls |
| technicalindicators | ^3.x | EMA, RSI, MACD, ATR calculations |
| node-cron | ^3.x | Cron scheduling for daily pipeline |
| dotenv | ^16.x | Environment variable management |
| winston | ^3.x | Structured JSON logging with rotation |
| express-rate-limit | ^7.x | API rate limiting |
| joi | ^17.x | Request/query parameter validation |
| csv-parse | ^5.x | NSE Bhavcopy CSV parsing |
| helmet | ^7.x | HTTP security headers |
| cors | ^2.x | Cross-origin resource sharing |
| uuid | ^9.x | Unique ID generation for favorites |
| rss-parser | ^3.x | Google News RSS feed parsing for sentiment layer |
| tough-cookie | ^6.x | Cookie jar for NSE session handling (F&O option chain) |
| axios-cookiejar-support | ^6.x | Axios adapter for tough-cookie integration |
| concurrently | ^9.x | Run Node.js and FinBERT servers in parallel during dev/deploy |

### Python Dependencies (FinBERT Microservice + Fundamentals)

| Package | Purpose |
|---------|---------|
| fastapi | HTTP server for FinBERT sentiment endpoint |
| uvicorn | ASGI server to run FastAPI |
| transformers | HuggingFace library for ProsusAI/finbert model |
| torch (CPU) | PyTorch backend for transformer inference |
| yfinance | Yahoo Finance data fetching (used by download_yahoo_data.py and refresh_fundamentals.py) |
| mysql-connector-python | MySQL driver for refresh_fundamentals.py |
| python-dotenv | .env file loading for Python scripts |

`scripts/requirements.txt` includes `--extra-index-url https://download.pytorch.org/whl/cpu` to install the CPU-only build of torch (~200 MB instead of the full GPU build at ~2 GB).

Install via:
```bash
pip3 install --user --break-system-packages -r scripts/requirements.txt
```

The `--break-system-packages` flag is required on Debian/Ubuntu systems with PEP 668 externally-managed Python. On systems with a virtual environment, use `pip install -r scripts/requirements.txt` instead.

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| jest | ^29.x | Test runner |
| supertest | ^6.x | HTTP assertion for API tests |
| nodemon | ^3.x | Auto-restart during development |

---

## 3. Environment Configuration

File: `.env.example`

```env
# ─── Server ───
PORT=3000
NODE_ENV=development
API_KEY=your_api_key_here

# ─── Database ───
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tradeneuron
DB_CONNECTION_LIMIT=10

# ─── Yahoo Finance ───
YAHOO_THROTTLE_MS=300
YAHOO_MAX_RETRIES=3
YAHOO_BACKOFF_BASE_MS=1000

# ─── Pipeline ───
CRON_SCHEDULE=30 16 * * 1-5
CRON_TIMEZONE=Asia/Kolkata
PIPELINE_TIMEOUT_MS=300000

# ─── Signals ───
MIN_CONFIDENCE=70
MIN_RISK_REWARD=2.0
MAX_ACTIVE_SIGNALS=10
MAX_SECTOR_SIGNALS=3
HOLDING_PERIOD_DAYS=10

# ─── Market Regime ───
VIX_THRESHOLD=20

# ─── Liquidity ───
MIN_LIQUIDITY_VOLUME=500000

# ─── Fundamentals ───
FUNDAMENTAL_CRON_SCHEDULE=0 18 * * 6
MAX_DEBT_TO_EQUITY=2.0
MIN_EPS_GROWTH_CONSECUTIVE_NEGATIVE=2
MIN_REVENUE_GROWTH_CONSECUTIVE_NEGATIVE=2
MAX_PROMOTER_PLEDGE_PCT=50

# ─── Sentiment ───
SENTIMENT_LOOKBACK_DAYS=7

# ─── Backtesting ───
SLIPPAGE_PCT=0.1
BROKERAGE_PCT=0.05

# ─── Position Sizing ───
TOTAL_CAPITAL_INR=1000000
RISK_PCT_PER_TRADE=1.0
MAX_POSITION_PCT=10

# ─── Adaptive Thresholds ───
ADAPTIVE_THRESHOLDS_ENABLED=true
ADAPTIVE_MIN_DATA_POINTS=30
ADAPTIVE_MIN_TRADES_PARTIAL=15
ADAPTIVE_MIN_TRADES_FULL=30
ADAPTIVE_PARTIAL_BLEND=0.3

# ─── Confidence Tiers ───
CONFIDENCE_TIER_HIGH=85
CONFIDENCE_TIER_NORMAL=75
CONFIDENCE_TIER_LOW=70

# ─── Smart Expiry ───
EXPIRED_MIN_PENALTY=-0.1
EXPIRED_MAX_PENALTY=-0.2
EXPIRED_MOVEMENT_THRESHOLD=1.0

# ─── Strategy Auto-Disable ───
STRATEGY_DISABLE_WIN_RATE=0.40
STRATEGY_DISABLE_MIN_TRADES=15
STRATEGY_REENABLE_WIN_RATE=0.50
STRATEGY_REENABLE_MIN_TRADES=20

# ─── Short Selling ───
MAX_POSITION_PCT_SHORT=5

# ─── Account Type ───
ACCOUNT_TYPE=EQUITY

# ─── VWAP Distance Thresholds ───
VWAP_DISTANCE_LONG_DEFAULT=2.0
VWAP_DISTANCE_BREAKOUT_LONG=3.5
VWAP_DISTANCE_SHORT_DEFAULT=2.0

# ─── Signal Frequency Controller ───
FREQUENCY_CONTROLLER_ENABLED=true
TARGET_WEEKLY_SIGNALS=10
MAX_SIGNALS_PER_DAY=3
POOL_MIN_CONFIDENCE=65
POOL_MIN_RISK_REWARD=1.5

# ─── Finnhub (Optional) ───
FINNHUB_API_KEY=

# ─── Telegram Pipeline Alerts (Optional, fail-open) ───
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ─── FinBERT Sentiment Microservice (Optional, falls back to keyword scoring) ───
FINBERT_URL=http://127.0.0.1:8765

# ─── Logging ───
LOG_LEVEL=info
LOG_DIR=./logs
```

### Config Loader (`src/config/env.js`)

Reads `.env` via dotenv, validates all required variables are present at startup, and exports a frozen config object. The app must fail fast if any required variable is missing.

**Required variables (validated at startup):** `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `API_KEY`, `CRON_SCHEDULE`, `CRON_TIMEZONE`, `FUNDAMENTAL_CRON_SCHEDULE`, `VIX_THRESHOLD`, `MIN_CONFIDENCE`, `MIN_RISK_REWARD`, `TOTAL_CAPITAL_INR`, `RISK_PCT_PER_TRADE`. All others have sensible defaults but are still recommended.

### Database Connection Pool (`src/config/db.js`)

Creates and exports a mysql2 promise-based connection pool:

```
pool = mysql2.createPool({
    host:            DB_HOST,
    port:            DB_PORT,
    user:            DB_USER,
    password:        DB_PASSWORD,
    database:        DB_NAME,
    connectionLimit: DB_CONNECTION_LIMIT,       // default 10
    waitForConnections: true,
    queueLimit:      0,                         // unlimited queue
    connectTimeout:  10000,                     // 10s connection timeout
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000
})
```

**Startup validation:** On app boot (`server.js`), execute a `SELECT 1` ping against the pool. If it fails, log the error and exit with code 1 (fail fast). Do not start the Express server or cron scheduler if the DB is unreachable.

```
TRY:
    await pool.query('SELECT 1')
    LOG info: "Database connected successfully"
CATCH error:
    LOG error: "Database connection failed: {error.message}"
    process.exit(1)
```

**Runtime pool errors:** Attach a listener for pool-level errors to handle unexpected disconnects:

```
pool.on('error', (err) => {
    LOG error: "Unexpected DB pool error: {err.message}"
    IF err.code == 'PROTOCOL_CONNECTION_LOST'
        LOG warn: "DB connection lost, pool will auto-reconnect"
    ELSE
        process.exit(1)
})
```

**Graceful shutdown:** On `SIGTERM` / `SIGINT`, call `pool.end()` before exiting to drain active connections cleanly.

---

## 4. Database Design

All tables use InnoDB engine. All prices use `DECIMAL(12,2)`. All timestamps are in IST.

### 4.1 candles

```sql
CREATE TABLE candles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    open            DECIMAL(12,2)   NOT NULL,
    high            DECIMAL(12,2)   NOT NULL,
    low             DECIMAL(12,2)   NOT NULL,
    close           DECIMAL(12,2)   NOT NULL,
    adjusted_close  DECIMAL(12,2)   NOT NULL,
    volume          BIGINT UNSIGNED NOT NULL,
    source          ENUM('YAHOO', 'BHAVCOPY') NOT NULL DEFAULT 'YAHOO',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `adjusted_close` stores the split/dividend-adjusted price from Yahoo's `adjClose` field. All indicator calculations use this column, not `close`.
- `source` tracks data provenance for audit and debugging.
- `UNIQUE(symbol, date)` prevents duplicates during re-ingestion or fallback recovery.
- `delivery_pct` (added in migration 020) stores NSE delivery percentage from Bhavcopy CSV. NULL if Bhavcopy data is unavailable for that date.

### 4.2 indicators

```sql
CREATE TABLE indicators (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    ema_20          DECIMAL(12,2),
    ema_50          DECIMAL(12,2),
    ema_200         DECIMAL(12,2),
    rsi             DECIMAL(8,4),
    macd_line       DECIMAL(12,4),
    macd_signal     DECIMAL(12,4),
    macd_histogram  DECIMAL(12,4),
    atr             DECIMAL(12,4),
    volume_sma_20   BIGINT UNSIGNED,
    volume_change   DECIMAL(8,4),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- MACD is split into three columns (line, signal, histogram) instead of a single value -- all three are needed for strategy logic.
- `volume_sma_20` stores the 20-day simple moving average of volume, used to calculate spike detection.
- `volume_change` = `(volume - volume_sma_20) / volume_sma_20` as a ratio.
- Nullable columns: indicators are NULL when insufficient historical data exists (e.g., EMA200 needs 200 candles).

### 4.3 features

```sql
CREATE TABLE features (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol                      VARCHAR(20)     NOT NULL,
    date                        DATE            NOT NULL,
    is_uptrend                  TINYINT(1)      NOT NULL DEFAULT 0,
    rsi_zone                    ENUM('OVERSOLD', 'PULLBACK', 'NEUTRAL', 'OVERBOUGHT') NOT NULL DEFAULT 'NEUTRAL',
    is_volume_spike             TINYINT(1)      NOT NULL DEFAULT 0,
    is_breakout                 TINYINT(1)      NOT NULL DEFAULT 0,
    close_position              DECIMAL(5,4)    DEFAULT NULL,
    ema50_slope                 DECIMAL(12,4)   DEFAULT NULL,
    near_support                TINYINT(1)      NOT NULL DEFAULT 0,
    distance_from_52w_high_pct  DECIMAL(8,4),
    relative_strength_vs_nifty  DECIMAL(8,4),
    created_at                  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- Boolean features stored as `TINYINT(1)` for MySQL compatibility.
- `rsi_zone` is an ENUM because the thresholds are fixed at calculation time and strategies query by zone name.
- Features are persisted (not ephemeral) so backtesting can replay exact historical feature state without recalculation.
- `rvol` and `volume_tier` (migration 018) provide continuous relative volume scoring replacing binary `is_volume_spike`.
- `close_position` (migration 027) = `(close - low) / (high - low)` — soft breakout confirmation metric.
- `ema50_slope` (migration 027) = `ema50_today - ema50_5d_ago` — trend slope for soft penalty scoring.
- `vwap`, `vwap_distance_pct`, `is_near_vwap` (migration 019) enable VWAP-based signal quality filtering.
- `is_high_delivery` (migration 020) flags high delivery percentage (>50%) from NSE Bhavcopy data.

### 4.4 signals

```sql
CREATE TABLE signals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    signal_type     ENUM('BUY')     NOT NULL,
    confidence      DECIMAL(5,2)    NOT NULL,
    confidence_tier ENUM('HIGH', 'NORMAL', 'LOW') DEFAULT NULL,
    entry_price     DECIMAL(12,2)   NOT NULL,
    stop_loss       DECIMAL(12,2)   NOT NULL,
    target_price    DECIMAL(12,2)   NOT NULL,
    risk_reward     DECIMAL(5,2)    NOT NULL,
    reasons         JSON            NOT NULL,
    status          ENUM('ACTIVE', 'TARGET_HIT', 'SL_HIT', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    strategy_source VARCHAR(100)    NOT NULL,
    closed_at       DATE,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_symbol (symbol),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_symbol_status (symbol, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `signal_type` is ENUM with only `BUY` for MVP. SELL can be added later.
- `reasons` is a JSON array (e.g., `["Trend Pullback", "Volume Spike"]`) capturing which strategy conditions triggered.
- `status` tracks the full signal lifecycle: ACTIVE on creation, transitions to TARGET_HIT / SL_HIT / EXPIRED during daily status checks.
- `closed_at` records when the signal was resolved.
- `risk_reward` is stored precomputed for fast filtering.
- `explanation` (migration 023) stores a JSON array of human-readable sentences explaining why the signal was generated (e.g., `["Stock is in an uptrend with EMA 20 above EMA 50", "RSI in pullback zone (38.5)"]`). Nullable for backward compatibility with older signals.
- `confidence_breakdown` (migration 023) stores a JSON object decomposing the confidence score into four categories: `{ "technical": 30, "momentum": 20, "volume": 20, "quality": 10 }`. Nullable for backward compatibility.

### 4.5 backtest_results

```sql
CREATE TABLE backtest_results (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    strategy_name       VARCHAR(50)     NOT NULL,
    run_date            DATE            NOT NULL,
    train_start         DATE            NOT NULL,
    train_end           DATE            NOT NULL,
    test_start          DATE            NOT NULL,
    test_end            DATE            NOT NULL,
    total_signals       INT UNSIGNED    NOT NULL,
    wins                INT UNSIGNED    NOT NULL,
    losses              INT UNSIGNED    NOT NULL,
    neutral             INT UNSIGNED    NOT NULL,
    win_rate_pct        DECIMAL(5,2)    NOT NULL,
    avg_return_pct      DECIMAL(8,4)    NOT NULL,
    max_drawdown_pct    DECIMAL(8,4)    NOT NULL,
    sharpe_ratio        DECIMAL(8,4),
    profit_factor       DECIMAL(8,4),
    avg_holding_days    DECIMAL(5,2),
    weight_config       JSON            NOT NULL,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_strategy (strategy_name),
    INDEX idx_run_date (run_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 4.6 favorites

```sql
CREATE TABLE favorites (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_identifier VARCHAR(64)     NOT NULL,
    symbol          VARCHAR(20)     NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_user_symbol (user_identifier, symbol),
    INDEX idx_user (user_identifier),
    INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `user_identifier` is a string that identifies the user. In MVP this can be an API key or a device-generated UUID. This avoids building a full auth system while still supporting per-user favorites.
- `UNIQUE(user_identifier, symbol)` prevents duplicate favorites.
- `notes` is an optional free-text field for the user to annotate why they favorited a stock (e.g., "watching for breakout above 2500").
- No foreign key to a users table -- the system is designed to work without a full user management module in MVP.

### 4.7 fundamentals

```sql
CREATE TABLE fundamentals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    fetched_date    DATE            NOT NULL,
    debt_to_equity  DECIMAL(8,4),
    eps_growth_yoy  DECIMAL(8,4),
    revenue_growth  DECIMAL(8,4),
    promoter_pledge DECIMAL(8,4),
    is_healthy      TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, fetched_date),
    INDEX idx_symbol (symbol),
    INDEX idx_healthy (is_healthy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `is_healthy` is a precomputed boolean gate. It is set to `0` (unhealthy) when ANY of the rejection conditions are met (see Section 10). This avoids recomputing the gate on every pipeline run -- the daily pipeline just checks `is_healthy`.
- `fetched_date` is the date the data was fetched, not the financial reporting date. Fundamentals are refreshed weekly (Saturday 6 PM IST).
- All metrics are nullable because Yahoo may not return all fields for every stock.

### 4.8 sentiment_flags

```sql
CREATE TABLE sentiment_flags (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol      VARCHAR(20)     NOT NULL,
    flag_date   DATE            NOT NULL,
    sentiment   ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE') NOT NULL DEFAULT 'NEUTRAL',
    headline    TEXT,
    source      VARCHAR(100)    DEFAULT 'GOOGLE_NEWS_RSS',
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, flag_date),
    INDEX idx_symbol (symbol),
    INDEX idx_sentiment (sentiment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- Sentiment is only fetched for symbols that have generated a raw signal on that day (typically 5-15 stocks), not all 50 -- this avoids unnecessary RSS fetches and rate limits.
- `headline` stores the specific negative headline that triggered the flag, for audit and debugging.
- `source` is always `GOOGLE_NEWS_RSS` in MVP. This column future-proofs for when alternative sources are added.
- **This table is an audit log, not a lookup cache.** The pipeline always performs a fresh RSS fetch at runtime and never reads stale rows from this table to make gating decisions. The `INSERT ... ON DUPLICATE KEY UPDATE` writes are purely for record-keeping -- answering "why was this signal suppressed on this date?" after the fact. If the RSS fetch fails, the pipeline falls back to `NEUTRAL` (fail-open) and logs a warning; it does not look up a prior day's flag.

### 4.9 paper_trades

```sql
CREATE TABLE paper_trades (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id           BIGINT UNSIGNED NOT NULL,
    symbol              VARCHAR(20)     NOT NULL,
    entry_date          DATE            NOT NULL,
    entry_price         DECIMAL(12,2)   NOT NULL,
    actual_entry_price  DECIMAL(12,2)   DEFAULT NULL,
    stop_loss           DECIMAL(12,2)   NOT NULL,
    target_price        DECIMAL(12,2)   NOT NULL,
    exit_date           DATE,
    exit_price          DECIMAL(12,2),
    exit_reason         ENUM('TARGET_HIT', 'SL_HIT', 'EXPIRED', 'MANUAL'),
    pnl_pct             DECIMAL(8,4),
    status              ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_signal (signal_id),
    INDEX idx_symbol (symbol),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decisions:**
- `signal_id` links back to the signals table for traceability. Not a foreign key constraint in MVP to avoid cascade complexity.
- `actual_entry_price` stores the next-day open price as the realistic entry. `entry_price` retains the signal's theoretical close-based entry. All PnL calculations use `actual_entry_price` when available, falling back to `entry_price`. This eliminates the look-ahead bias of entering at the signal day's close.
- `pnl_pct` stores net return after transaction costs: `((effective_exit - effective_entry) / effective_entry) * 100`. The effective prices include slippage and brokerage deductions matching the backtesting cost model. See Section 16 for the full calculation.
- Paper trades run in parallel with real signals -- they don't affect signal generation. They exist solely to validate live system performance before committing capital.

### 4.10 features table alteration

Add the liquidity feature to the existing features table:

```sql
ALTER TABLE features ADD COLUMN is_liquid TINYINT(1) NOT NULL DEFAULT 1;
```

### 4.11 Position Sizing on signals (migration 011)

```sql
ALTER TABLE signals
  ADD COLUMN shares_to_buy     INT UNSIGNED,
  ADD COLUMN position_value    DECIMAL(14,2),
  ADD COLUMN capital_risk_inr  DECIMAL(14,2);
```

**Key decision:** Position sizing is computed after all gates pass. Uses ATR-based risk: `shares_to_buy = FLOOR(risk_per_trade_INR / risk_per_share)`, capped by `MAX_POSITION_PCT`.

### 4.12 Position Sizing on paper_trades (migration 012)

```sql
ALTER TABLE paper_trades
  ADD COLUMN shares_to_buy   INT UNSIGNED,
  ADD COLUMN gross_pnl_inr   DECIMAL(14,2);
```

**Key decision:** `gross_pnl_inr = shares_to_buy * (exit_price - entry_price)` for LONG, or `shares_to_buy * (entry_price - exit_price)` for SHORT. This gives absolute rupee PnL alongside the percentage.

### 4.13 adaptive_thresholds (migration 013)

```sql
CREATE TABLE adaptive_thresholds (
    id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol                   VARCHAR(20)   NOT NULL,
    date                     DATE          NOT NULL,
    vix_threshold            DECIMAL(8,4),
    volume_spike_threshold   BIGINT UNSIGNED,
    rsi_oversold             DECIMAL(8,4),
    rsi_pullback             DECIMAL(8,4),
    rsi_overbought           DECIMAL(8,4),
    created_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_symbol_date (symbol, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** Thresholds are recomputed daily from rolling percentiles. Static env vars serve as fallback when fewer than `ADAPTIVE_MIN_DATA_POINTS` (default 30) data points exist.

### 4.14 is_ranging feature (migration 014)

```sql
ALTER TABLE features ADD COLUMN is_ranging TINYINT(1) NOT NULL DEFAULT 0;
```

### 4.15 z_score_20d feature (migration 015)

```sql
ALTER TABLE features ADD COLUMN z_score_20d DECIMAL(8,4);
```

### 4.16 Sentiment upgrade columns (migration 016)

```sql
ALTER TABLE sentiment_flags
  ADD COLUMN confidence    ENUM('HIGH','LOW') DEFAULT 'HIGH',
  ADD COLUMN finnhub_score DECIMAL(5,4),
  ADD COLUMN overridden    TINYINT(1) DEFAULT 0;
```

**Key decision:** `overridden = 1` means RSS flagged NEGATIVE but Finnhub overrode to NEUTRAL. Backwards-compatible — if `FINNHUB_API_KEY` is not set, Tier 1 only.

### 4.17 SELL signals and direction (migration 017)

```sql
ALTER TABLE signals MODIFY signal_type ENUM('BUY', 'SELL') NOT NULL;
ALTER TABLE signals ADD COLUMN direction ENUM('LONG', 'SHORT') NOT NULL DEFAULT 'LONG';
```

**Key decision:** `direction` is `LONG` for BUY signals, `SHORT` for SELL signals. Existing signals default to LONG.

### 4.18 RVOL and volume tier (migration 018)

```sql
ALTER TABLE features
  ADD COLUMN rvol DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN volume_tier ENUM('normal','elevated','high','extreme') DEFAULT 'normal';
```

**Key decision:** `rvol = volume / volume_sma_20`. `volume_tier` classifies: extreme (>=3.0), high (>=2.0), elevated (>=1.3), normal. Replaces the flat `is_volume_spike` weight in scoring with tiered scores.

### 4.19 VWAP columns (migration 019)

```sql
ALTER TABLE features
  ADD COLUMN vwap DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN vwap_distance_pct DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN is_near_vwap BOOLEAN DEFAULT NULL;
```

**Key decision:** `vwap_distance_pct = ((close - vwap) / vwap) * 100`. Signals where price is stretched >2% from VWAP are filtered out in `signal.service.js`.

### 4.20 Delivery percentage (migration 020)

```sql
ALTER TABLE candles ADD COLUMN delivery_pct DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE features ADD COLUMN is_high_delivery BOOLEAN DEFAULT NULL;
```

**Key decision:** `is_high_delivery = delivery_pct > 50`. Fail-open (NULL treated as unknown). Adds +10 score for breakout strategies when delivery is high.

### 4.21 Signal outcomes and adaptive weights (migration 021)

```sql
CREATE TABLE IF NOT EXISTS signal_outcomes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id   BIGINT UNSIGNED NOT NULL,
    outcome     ENUM('TARGET_HIT','SL_HIT','EXPIRED') NOT NULL,
    strategy    VARCHAR(100),
    features_json JSON,
    resolved_at DATE NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_signal_id (signal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE adaptive_thresholds
  ADD COLUMN weight_trend    DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_rsi      DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_volume   DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_breakout DECIMAL(5,2) DEFAULT NULL;
```

**Key decision:** `signal_outcomes` snapshots the feature state when a signal resolves, enabling the weekly weight calibration job to compute win rates per feature and adjust scoring weights dynamically. Weight columns on `adaptive_thresholds` store the calibrated weights (NULL = use static defaults from `constants.js`).

### 4.22 NIFTY 50 historical composition (migration 022)

```sql
CREATE TABLE IF NOT EXISTS nifty50_composition (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol       VARCHAR(20) NOT NULL,
    added_date   DATE NOT NULL,
    removed_date DATE DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_dates (added_date, removed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** Tracks which stocks were in the NIFTY 50 index at any point in time. Used by the backtesting engine to include historically removed stocks (survivorship-bias-free backtesting). `removed_date = NULL` means the stock is currently in the index.

### 4.23 rejected_signals (migration 024)

```sql
CREATE TABLE IF NOT EXISTS rejected_signals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    strategy_source VARCHAR(100)    NOT NULL,
    reject_stage    ENUM(
      'FUNDAMENTAL_FILTER', 'SENTIMENT_FILTER',
      'VWAP_FILTER', 'PCR_FILTER', 'SECTOR_GATE',
      'CONFIDENCE_GATE', 'RR_GATE', 'LIQUIDITY_GATE',
      'MERGED_RISK_ZERO', 'ACTIVE_CAP', 'POSITION_SIZING',
      'DUPLICATE'
    ) NOT NULL,
    reject_reason   VARCHAR(500)    NOT NULL,
    raw_confidence  DECIMAL(5,2)    DEFAULT NULL,
    raw_rr          DECIMAL(5,2)    DEFAULT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_date   (date),
    INDEX idx_stage  (reject_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** Every pipeline rejection point in `deduplicateAndGenerate()` inserts a row here before returning null. This provides full transparency into which stocks nearly generated a signal and why they were filtered out. The `reject_stage` ENUM maps directly to the filtering gate that rejected the candidate.

### 4.24 trade_decisions (migration 025)

```sql
CREATE TABLE IF NOT EXISTS trade_decisions (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id        BIGINT UNSIGNED NOT NULL,
    user_identifier  VARCHAR(64)     NOT NULL,
    decision         ENUM('TAKEN', 'SKIPPED', 'MODIFIED') NOT NULL,
    notes            TEXT,
    actual_entry     DECIMAL(12,2)   DEFAULT NULL,
    actual_qty       INT UNSIGNED    DEFAULT NULL,
    decided_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_signal_user (signal_id, user_identifier),
    INDEX idx_user (user_identifier),
    INDEX idx_signal (signal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** One decision per signal per user, enforced by the unique index. Uses INSERT ON DUPLICATE KEY UPDATE for upsert semantics — if the trader changes their mind, the row updates instead of duplicating. `actual_entry` and `actual_qty` are populated only for `MODIFIED` decisions where the trader deviated from the system's suggestion.

### 4.25 actual_entry_price on paper_trades (migration 029)

```sql
ALTER TABLE paper_trades
  ADD COLUMN actual_entry_price DECIMAL(12,2) DEFAULT NULL AFTER entry_price;
```

**Key decision:** `actual_entry_price` stores the next trading day's open price, which is the realistic entry. The original `entry_price` (signal day's close) is retained for reference. All PnL calculations prefer `actual_entry_price` when available.

### 4.26 strategy_config (migration 030)

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

**Key decision:** The weekly calibration job auto-disables strategies with low win rates from paper trade data and auto-re-enables them when performance recovers. The table tracks when and why each strategy was disabled. Strategy enablement is checked at the start of `runStrategies()` — disabled strategies are skipped entirely. Telegram alerts fire on state changes.

### 4.27 execution_type on signals and paper_trades (migration 031)

```sql
ALTER TABLE signals
  ADD COLUMN execution_type ENUM('EQUITY', 'FUTURES', 'OPTIONS', 'NONE') NOT NULL DEFAULT 'EQUITY' AFTER direction;

ALTER TABLE signals
  ADD COLUMN is_executable TINYINT(1) NOT NULL DEFAULT 1 AFTER execution_type;

ALTER TABLE paper_trades
  ADD COLUMN execution_type ENUM('EQUITY', 'FUTURES', 'OPTIONS', 'NONE') NOT NULL DEFAULT 'EQUITY' AFTER direction;
```

**Key decisions:**
- `execution_type` tracks how a signal would be executed: EQUITY for long positions, FUTURES for short positions in F&O accounts, NONE for non-executable signals.
- `is_executable` flags whether the signal can actually be taken given the current account type (`ACCOUNT_TYPE` env var). SHORT signals in equity-only accounts are marked `is_executable = false`.
- Non-executable signals are still generated and stored for analysis, but they do NOT create paper trades and their outcomes do NOT feed into the weekly weight calibration. This prevents phantom wins from corrupting the self-improvement loop.

### 4.28 regime_size_multiplier on signals (migration 033)

```sql
ALTER TABLE signals ADD COLUMN regime_size_multiplier DECIMAL(4,2) DEFAULT 1.00 AFTER capital_risk_inr;
```

**Key decision:** Regime-based position sizing scales `shares_to_buy` and `position_value` down when market conditions are unfavorable. `is_ranging = true` reduces to 0.5x, VIX above threshold reduces to 0.7x. The multiplier is stored on the signal for auditability. A value of 1.00 means no regime adjustment was applied.

### 4.29 confidence_calibration (migration 034)

```sql
CREATE TABLE IF NOT EXISTS confidence_calibration (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    confidence_bucket   INT NOT NULL,
    total_signals       INT NOT NULL,
    actual_win_rate     DECIMAL(5,2) NOT NULL,
    computed_at         DATE NOT NULL,
    UNIQUE INDEX uq_bucket_date (confidence_bucket, computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** Stores weekly-computed calibration data mapping confidence score ranges (bucketed in 5-point intervals: 70, 75, 80, ...) to their actual historical win rates. The weekly calibration job populates this table. Buckets with fewer than 20 samples are skipped. This is display-only data — it does not auto-adjust scoring weights.

### 4.30 FREQUENCY_CAP reject stage (migration 035)

```sql
ALTER TABLE rejected_signals
  MODIFY COLUMN reject_stage ENUM(
    'FUNDAMENTAL_FILTER','SENTIMENT_FILTER','VWAP_FILTER','PCR_FILTER',
    'SECTOR_GATE','CONFIDENCE_GATE','RR_GATE','LIQUIDITY_GATE',
    'MERGED_RISK_ZERO','ACTIVE_CAP','POSITION_SIZING','DUPLICATE',
    'FREQUENCY_CAP'
  ) NOT NULL;
```

**Key decision:** The frequency controller logs all candidates that passed hard gates but were not selected in the Top-N daily cut to the `rejected_signals` table with stage `FREQUENCY_CAP`. This preserves full pipeline transparency — the Funnel page shows exactly how many signals were quality-qualified but deferred due to weekly frequency targets.

### 4.31 pipeline_runs (migration 036)

```sql
CREATE TABLE pipeline_runs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    run_date        DATE            NOT NULL,
    started_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP       NULL,
    status          ENUM('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
    duration_ms     INT UNSIGNED    NULL,
    signals_generated INT UNSIGNED  NOT NULL DEFAULT 0,
    regime          VARCHAR(20)     NULL,
    INDEX idx_status (status),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Key decision:** Tracks actual pipeline execution independently of signal creation. The health endpoint queries `MAX(completed_at) WHERE status = 'completed'` instead of `MAX(signals.created_at)`. This fixes a bug where the frontend showed "Data may be stale" when the pipeline ran but generated 0 signals (no new rows in `signals` meant the old `MAX(created_at)` query returned a stale timestamp). Falls back to `signals.created_at` if the table doesn't exist (pre-migration).

### ER Diagram

```
candles 1──* indicators            (symbol + date)
candles 1──* features              (symbol + date)
candles 1──* signals               (symbol + date)
signals 1──* paper_trades          (signal_id)
signals 1──1 signal_outcomes       (signal_id)
signals 1──* trade_decisions       (signal_id)
favorites *──1 candles             (symbol, logical reference)
fundamentals *──1 candles          (symbol, logical reference)
sentiment_flags *──1 candles       (symbol, logical reference)
rejected_signals                   (standalone audit log, populated per pipeline run)
nifty50_composition                (standalone, referenced by backtest.service.js)
adaptive_thresholds                (stores adaptive RSI/volume thresholds + scoring weights)
strategy_config                    (stores per-strategy enable/disable state)
confidence_calibration             (weekly calibration: confidence bucket → actual win rate)
pipeline_runs                      (tracks daily pipeline execution completion timestamps)
```

### Migration Strategy

Migrations are plain `.sql` files in `migrations/` numbered sequentially. Applied migrations are tracked in a metadata table:

```sql
CREATE TABLE IF NOT EXISTS _migrations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename        VARCHAR(255)    NOT NULL UNIQUE,
    applied_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**`scripts/migrate.js` behavior:**

```
FUNCTION runMigrations()
    CREATE _migrations table IF NOT EXISTS

    applied = SELECT filename FROM _migrations
    pending = LIST .sql files in migrations/ sorted alphabetically
              FILTER OUT any already in applied set

    FOR each file in pending:
        sql = READ entire file
        BEGIN TRANSACTION
        TRY
            EXECUTE sql
            INSERT INTO _migrations (filename) VALUES (file.name)
            COMMIT
            LOG "Applied: {file.name}"
        CATCH error
            ROLLBACK
            IF error.errno IN (1050, 1060, 1061)
                // Table/column/key already exists — treat as already applied
                INSERT INTO _migrations (filename) VALUES (file.name)
                LOG "Skipped: {file.name} (already applied)"
            ELSE
                LOG "FAILED: {file.name}"
                THROW error

    LOG "All migrations applied successfully."
```

- **Idempotent handling:** MySQL errors 1050 (table exists), 1060 (duplicate column), and 1061 (duplicate key) are treated as "already applied". The migration is recorded in `_migrations` and the runner continues. This handles cases where schema changes were applied manually or in a previous session without being tracked.
- Migrations run inside transactions so a failed migration does not leave the DB in a partial state.
- The app does NOT auto-run migrations on startup. Migrations are always triggered manually via `node scripts/migrate.js`.

---

## 5. NIFTY 50 Symbol Registry

Defined in `src/utils/symbols.util.js`.

### Symbol List

```javascript
const nifty_50_symbols = [
  'ADANIENT.NS', 'ADANIPORTS.NS', 'APOLLOHOSP.NS', 'ASIANPAINT.NS', 'AXISBANK.NS',
  'BAJAJ-AUTO.NS', 'BAJAJFINSV.NS', 'BAJFINANCE.NS', 'BHARTIARTL.NS', 'BPCL.NS',
  'BRITANNIA.NS', 'CIPLA.NS', 'COALINDIA.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'EICHERMOT.NS', 'GRASIM.NS', 'HCLTECH.NS', 'HDFCBANK.NS', 'HDFCLIFE.NS',
  'HEROMOTOCO.NS', 'HINDALCO.NS', 'HINDUNILVR.NS', 'ICICIBANK.NS', 'INDUSINDBK.NS',
  'INFY.NS', 'ITC.NS', 'JSWSTEEL.NS', 'KOTAKBANK.NS', 'LT.NS',
  'LTIM.NS', 'M&M.NS', 'MARUTI.NS', 'NESTLEIND.NS', 'NTPC.NS',
  'ONGC.NS', 'POWERGRID.NS', 'RELIANCE.NS', 'SBILIFE.NS', 'SBIN.NS',
  'SHRIRAMFIN.NS', 'SUNPHARMA.NS', 'TATACONSUM.NS', 'TATAMOTORS.NS', 'TATASTEEL.NS',
  'TCS.NS', 'TECHM.NS', 'TITAN.NS', 'TRENT.NS', 'ULTRACEMCO.NS'
];

const nifty_index_symbol = '^NSEI';
const india_vix_symbol = '^INDIAVIX';
```

Both `^NSEI` and `^INDIAVIX` are fetched and stored in the `candles` table alongside stock data. India VIX candles are used by the market regime filter (Section 9.1) but do not have indicators or features computed.

### Sector Mapping

```javascript
const sector_map = {
  'ADANIENT.NS':    'Conglomerate',
  'ADANIPORTS.NS':  'Infrastructure',
  'APOLLOHOSP.NS':  'Healthcare',
  'ASIANPAINT.NS':  'Consumer Goods',
  'AXISBANK.NS':    'Banking',
  'BAJAJ-AUTO.NS':  'Automobile',
  'BAJAJFINSV.NS':  'Financial Services',
  'BAJFINANCE.NS':  'Financial Services',
  'BHARTIARTL.NS':  'Telecom',
  'BPCL.NS':        'Oil & Gas',
  'BRITANNIA.NS':   'FMCG',
  'CIPLA.NS':       'Pharma',
  'COALINDIA.NS':   'Mining',
  'DIVISLAB.NS':    'Pharma',
  'DRREDDY.NS':     'Pharma',
  'EICHERMOT.NS':   'Automobile',
  'GRASIM.NS':      'Cement & Materials',
  'HCLTECH.NS':     'IT',
  'HDFCBANK.NS':    'Banking',
  'HDFCLIFE.NS':    'Insurance',
  'HEROMOTOCO.NS':  'Automobile',
  'HINDALCO.NS':    'Metals',
  'HINDUNILVR.NS':  'FMCG',
  'ICICIBANK.NS':   'Banking',
  'INDUSINDBK.NS':  'Banking',
  'INFY.NS':        'IT',
  'ITC.NS':         'FMCG',
  'JSWSTEEL.NS':    'Metals',
  'KOTAKBANK.NS':   'Banking',
  'LT.NS':          'Infrastructure',
  'LTIM.NS':        'IT',
  'M&M.NS':         'Automobile',
  'MARUTI.NS':      'Automobile',
  'NESTLEIND.NS':   'FMCG',
  'NTPC.NS':        'Power',
  'ONGC.NS':        'Oil & Gas',
  'POWERGRID.NS':   'Power',
  'RELIANCE.NS':    'Conglomerate',
  'SBILIFE.NS':     'Insurance',
  'SBIN.NS':        'Banking',
  'SHRIRAMFIN.NS':  'Financial Services',
  'SUNPHARMA.NS':   'Pharma',
  'TATACONSUM.NS':  'FMCG',
  'TATAMOTORS.NS':  'Automobile',
  'TATASTEEL.NS':   'Metals',
  'TCS.NS':         'IT',
  'TECHM.NS':       'IT',
  'TITAN.NS':       'Consumer Goods',
  'TRENT.NS':       'Retail',
  'ULTRACEMCO.NS':  'Cement & Materials'
};
```

### URL Encoding Note: `M&M.NS`

The `&` character in `M&M.NS` is a reserved character in URLs and query strings. When passed as a query parameter (e.g., `?symbol=M&M.NS`), the `&` is interpreted as a parameter separator, breaking the value into `symbol=M` and `M.NS` as a separate key.

**Rules:**
- Frontend/clients must URL-encode the symbol: `M%26M.NS`.
- Express automatically decodes `%26` back to `&` in `req.query` and `req.params`, so backend route handlers receive the correct value `M&M.NS` without extra work.
- All DB lookups use the raw (decoded) symbol value.
- API documentation and examples must show the encoded form in URLs.

### Constituent Change Handling

The symbol list is maintained as a constant in code. When NIFTY 50 rebalances (typically in March and September):

1. Update the list in `symbols.util.js`.
2. Run `npm run download` then `npm run seed` for any newly added symbols.
3. Removed symbols retain their historical data in the database but stop receiving new candles.
4. Backtest runs should specify the constituent list that was active during the test period.

---

## 6. Data Ingestion Pipeline

### 6.1 Yahoo Finance (Primary)

**File:** `src/services/data_ingestion/yahoo.service.js`

The Yahoo service uses **direct Axios HTTP calls** to the Yahoo Finance v8 API (not the `yahoo-finance2` npm library, which has cookie/crumb authentication issues and frequent rate-limit failures). A custom Axios instance sends a browser-like `User-Agent` header for reliability.

```
FUNCTION fetchYahooCandles(symbol, start_date, end_date)
    RETRY up to YAHOO_MAX_RETRIES with exponential backoff:
        GET /v8/finance/chart/{symbol}?interval=1d&period1={unix}&period2={unix}
        WAIT YAHOO_THROTTLE_MS between requests
    PARSE chart_result.indicators.quote[0] for OHLCV + adjclose
    RETURN array of { date, open, high, low, close, adjusted_close, volume }

FUNCTION fetchQuoteSummary(symbol)
    GET /v10/finance/quoteSummary/{symbol}?modules=defaultKeyStatistics,financialData,...
    RETURN summary object (used by weekly fundamentals job)

FUNCTION probeYahooApi()
    GET /v8/finance/spark?symbols=TCS.NS&range=1d&interval=1d  (lightweight, not rate-limited)
    RETURN true if HTTP 200, false otherwise
```

**Probe function:** `probeYahooApi()` uses the `/v8/finance/spark` endpoint (which has different rate limits than `/v8/finance/chart`) to check whether Yahoo is reachable before attempting bulk downloads. The daily pipeline uses this probe in Step 1.

**Per-symbol processing:**
1. Determine `start_date`: latest date in candles table for this symbol + 1 day (or 3 years ago if first run).
2. Determine `end_date`: today.
3. Fetch from Yahoo via direct HTTP.
4. Map `chart_result.indicators.quote[0]` fields to OHLCV.
5. Upsert into `candles` table using `INSERT ... ON DUPLICATE KEY UPDATE`.

**Throttling:** 300ms delay between symbol fetches to avoid Yahoo rate limits.

**Retry logic:** On HTTP error or timeout, retry up to 3 times with backoff: 1s, 2s, 4s. On HTTP 429 (rate limit), backoff increases to 30s+ and scales per attempt.

### 6.1.1 Historical Data Download (Python)

**File:** `scripts/download_yahoo_data.py`

For initial data seeding, a **Python script using `yfinance`** is used instead of the Node.js Yahoo service. The Python `yfinance` library handles Yahoo's cookie/crumb authentication more robustly and is not subject to the same rate-limiting issues.

```
WORKFLOW:
1. npm run download    →  python3 scripts/download_yahoo_data.py
                           Downloads 3 years of daily OHLCV for all 52 symbols
                           Saves to scripts/yahoo_data.json (~38K candles)
                           Takes ~90 seconds

2. npm run seed        →  node scripts/seed_historical.js
                           Reads yahoo_data.json
                           Bulk-upserts all candles into MySQL
                           Takes ~1 second
```

**Why two steps?** Yahoo aggressively rate-limits the v8/finance/chart API. The Python `yfinance` library uses a different authentication flow (cookie consent + crumb extraction) that bypasses these limits. The downloaded JSON file is a portable snapshot that can be re-seeded without re-downloading.

### 6.2 NSE Bhavcopy (Fallback + Delivery Percentage)

**File:** `src/services/data_ingestion/bhavcopy.service.js`

**Trigger conditions (any one):**
- Yahoo returns 0 rows for a symbol.
- Yahoo returns data with > 5% missing candles (compared to expected trading days).
- Yahoo fetch fails after all retries.
- Called as pipeline Step 1b to enrich candles with delivery percentage data.

**Process:**
1. Download the EOD bhavcopy CSV from NSE for the target date.
   - URL pattern: `https://archives.nseindia.com/products/content/sec_bhavdata_full_{DDMMYYYY}.csv`
2. Parse CSV using `csv-parse`.
3. Filter rows to only NIFTY 50 symbols.
4. Map columns: `OPEN`, `HIGH`, `LOW`, `CLOSE`, `TOTTRDQTY` -> `volume`, `DELIV_PER` -> `delivery_pct`.
5. Bhavcopy does not provide adjusted close -- set `adjusted_close = close` and flag with `source = 'BHAVCOPY'`.
6. Upsert into candles table (uses `COALESCE` for `delivery_pct` to avoid overwriting Yahoo OHLCV data when used as enrichment).

**Delivery percentage enrichment:** When called as pipeline Step 1b (after Yahoo fetch), the primary goal is to extract the `DELIV_PER` column and update the `delivery_pct` field on existing candle rows. This data powers the `is_high_delivery` feature.

### 6.4 NSE F&O Option Chain (PCR)

**File:** `src/services/data_ingestion/fno.service.js`

**Purpose:** Fetch the NIFTY option chain from NSE and compute the Put-Call Ratio (PCR). Used as a macro sentiment filter in signal generation.

**Process:**
1. Create an Axios client with `tough-cookie` cookie jar support.
2. Fetch `https://www.nseindia.com` first to acquire session cookies (NSE requires valid cookies).
3. Hit the option chain endpoint: `https://www.nseindia.com/api/option-chain-indices?symbol=NIFTY`.
4. Parse the response to extract total Put OI and total Call OI.
5. Compute `PCR = totalPutOI / totalCallOI`.

```
FUNCTION fetchPCR(symbol = 'NIFTY')
    TRY:
        option_chain = await fetchOptionChain(symbol)
        pcr = computePCR(option_chain)
        RETURN pcr
    CATCH:
        LOG warn: "PCR fetch failed"
        RETURN null       // fail-open

FUNCTION computePCR(option_chain_data)
    total_put_oi  = SUM(row.PE.openInterest) for all rows
    total_call_oi = SUM(row.CE.openInterest) for all rows
    RETURN total_call_oi > 0 ? total_put_oi / total_call_oi : null
```

**PCR interpretation:** PCR > 1.5 indicates heavy put buying (bearish options sentiment). Bullish (LONG) signals are suppressed when NIFTY PCR exceeds this threshold. The filter is fail-open — if NSE is unavailable, PCR is null and no signals are suppressed.

### 6.3 Data Validation

**File:** `src/services/data_ingestion/validation.service.js`

**NSE Holiday Calendar:**

`countTradingDays()` depends on an accurate NSE holiday list. Holidays are stored in a standalone JSON file at `src/config/nse_holidays.json`, keyed by year (2024-2027+). This makes annual updates simpler — edit a single JSON file each January from the NSE official circular.

```json
{
  "2026": [
    "2026-01-26", "2026-03-10", "2026-03-17", "2026-03-30",
    "2026-04-02", "2026-04-03", "2026-04-14", "2026-05-01",
    "2026-06-05", "2026-07-06", "2026-08-15", "2026-08-16",
    "2026-09-04", "2026-10-02", "2026-10-20", "2026-10-21",
    "2026-11-04", "2026-12-25"
  ],
  "2027": []
}
```

Both `src/utils/date.util.js` and `src/config/constants.js` import from this JSON file. `src/utils/date.util.js` exposes:

```
FUNCTION isTradingDay(date)
    IF date is Saturday or Sunday -> false
    IF date is in nse_holidays for that year -> false
    RETURN true

FUNCTION countTradingDays(start_date, end_date)
    count = 0
    FOR each day from start_date to end_date:
        IF isTradingDay(day) -> count++
    RETURN count
```

Without this calendar, the data validation step will produce false-positive warnings for every NSE holiday, flagging "missing candles" that were never expected.

Run after every ingestion cycle:

```
FUNCTION validateData(symbol, date_range)
    expected_days = countTradingDays(date_range)   // exclude weekends + NSE holidays
    actual_rows   = COUNT candles WHERE symbol AND date IN range
    missing_pct   = (expected_days - actual_rows) / expected_days

    IF missing_pct > 0.05
        LOG warning: "Symbol {symbol} has {missing_pct}% missing candles"
        TRIGGER bhavcopy fallback for missing dates

    FOR each candle in range:
        IF open IS NULL OR high IS NULL OR low IS NULL OR close IS NULL OR volume IS NULL
            LOG warning: "Null OHLCV in {symbol} on {date}"

        IF high < low
            LOG error: "Invalid candle -- high < low for {symbol} on {date}"
```

---

## 7. Indicator Engine

All indicators are calculated from the `adjusted_close` column (not `close`) to account for corporate actions.

**File:** `src/services/indicators/index.js` orchestrates all individual indicator services.

### 7.1 EMA (Exponential Moving Average)

**Periods:** 20, 50, 200

**Library:** `technicalindicators.EMA`

```
INPUT: array of adjusted_close values (oldest first)
OUTPUT: array of EMA values (same length, leading values are NULL when period > available data)

ema_20  = EMA({ period: 20,  values: adjusted_closes })
ema_50  = EMA({ period: 50,  values: adjusted_closes })
ema_200 = EMA({ period: 200, values: adjusted_closes })
```

**Edge case:** EMA200 produces NULL for the first 199 candles. These NULLs are stored as-is in the indicators table. Strategies must check for NULL before using.

### 7.2 RSI (Relative Strength Index)

**Period:** 14

**Library:** `technicalindicators.RSI`

```
INPUT: array of adjusted_close values
OUTPUT: array of RSI values (0-100 scale)

rsi = RSI({ period: 14, values: adjusted_closes })
```

### 7.3 MACD (Moving Average Convergence Divergence)

**Parameters:** fast=12, slow=26, signal=9

**Library:** `technicalindicators.MACD`

```
INPUT: array of adjusted_close values
OUTPUT: array of { MACD, signal, histogram }

macd_result = MACD({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
    values: adjusted_closes
})

Store: macd_line = MACD, macd_signal = signal, macd_histogram = histogram
```

### 7.4 ATR (Average True Range)

**Period:** 14

**Library:** `technicalindicators.ATR`

```
INPUT: arrays of high, low, close values
OUTPUT: array of ATR values

atr = ATR({ period: 14, high: highs, low: lows, close: closes })
```

### 7.5 Volume Change

**Calculated manually** (no library needed):

```
volume_sma_20 = SMA of volume over last 20 days
volume_change = (today_volume - volume_sma_20) / volume_sma_20
```

A `volume_change` of 0.5 means today's volume is 50% above the 20-day average.

### 7.6 Rolling VWAP (Volume Weighted Average Price)

**Calculated manually** in `src/services/indicators/volume.service.js`:

```
FUNCTION computeRollingVWAP(candles, period = 20)
    FOR each candle at index i:
        window = candles[max(0, i-period+1) .. i]
        TP = (high + low + close) / 3     // Typical Price
        sum_tpv = SUM(TP * volume) for window
        sum_vol = SUM(volume) for window
        vwap = sum_vol > 0 ? sum_tpv / sum_vol : close
    RETURN array of { date, vwap }
```

VWAP is not stored in the `indicators` table — it is computed inline during feature extraction and stored as `vwap`, `vwap_distance_pct`, and `is_near_vwap` in the `features` table.

### Indicator Calculation Order

All indicators are independent and can be calculated in parallel per symbol. The orchestrator:

1. Fetches all candles for a symbol (sorted by date ascending).
2. Runs EMA, RSI, MACD, ATR, Volume calculations.
3. Aligns results by date index.
4. Upserts into the `indicators` table using `INSERT ... ON DUPLICATE KEY UPDATE`.

---

## 8. Feature Engineering

**File:** `src/services/features/feature.service.js`

Features are derived from indicators and candle data. Computed per symbol per date.

### Feature Definitions

| Feature | Column | Type | Logic |
|---------|--------|------|-------|
| Uptrend | `is_uptrend` | boolean | `adjusted_close > ema_50` |
| RSI Zone | `rsi_zone` | enum | RSI < 30 = OVERSOLD, 30-45 = PULLBACK, 45-65 = NEUTRAL, > 65 = OVERBOUGHT |
| Volume Spike | `is_volume_spike` | boolean | `volume > 1.5 * volume_sma_20` (legacy, kept for backward compat) |
| RVOL | `rvol` | decimal | `volume / volume_sma_20` — continuous relative volume ratio |
| Volume Tier | `volume_tier` | enum | `extreme` (>=3.0), `high` (>=2.0), `elevated` (>=1.3), `normal` |
| Breakout | `is_breakout` | boolean | `adjusted_close > MAX(high) of last 20 candles` (excluding current) |
| Close Position | `close_position` | decimal(5,4) | `(adjusted_close - candle_low) / (candle_high - candle_low)` — breakout strength metric |
| EMA50 Slope | `ema50_slope` | decimal(12,4) | `ema50_today - ema50_5d_ago` — positive = rising trend, negative = flat/declining |
| Near Support | `near_support` | boolean | see below |
| Distance from 52w High | `distance_from_52w_high_pct` | decimal | `(max_high_252d - adjusted_close) / max_high_252d * 100` |
| Relative Strength vs NIFTY | `relative_strength_vs_nifty` | decimal | see below |
| Liquidity | `is_liquid` | boolean | `volume_sma_20 >= MIN_LIQUIDITY_VOLUME` (default: 500,000) |
| Ranging | `is_ranging` | boolean | `(price_range_20d / (atr_20d * 20)) < 1.5 AND NOT is_breakout AND rsi_zone IN ('NEUTRAL', 'PULLBACK')` |
| Z-Score | `z_score_20d` | decimal | `(adjusted_close - mean_20d) / stddev_20d` — distance from 20-day mean in standard deviations |
| VWAP | `vwap` | decimal | 20-period rolling VWAP (see Section 7.6) |
| VWAP Distance | `vwap_distance_pct` | decimal | `((close - vwap) / vwap) * 100` — positive = above VWAP |
| Near VWAP | `is_near_vwap` | boolean | `ABS(vwap_distance_pct) < 2.0` |
| High Delivery | `is_high_delivery` | boolean | `delivery_pct > 50` (from NSE Bhavcopy, fail-open if null) |

### Near Support Calculation

Hybrid approach (from requirements):

```
swing_low = MIN(low) over last 15 candles (excluding current)
ema_50_distance_pct = ABS(adjusted_close - ema_50) / ema_50 * 100

near_support = (adjusted_close <= swing_low * 1.01)      // within 1% of swing low
            OR (ema_50_distance_pct <= 2.0)               // within 2% of EMA50
```

### Relative Strength vs NIFTY

```
stock_return_20d = (stock_close_today - stock_close_20d_ago) / stock_close_20d_ago
nifty_return_20d = (nifty_close_today - nifty_close_20d_ago) / nifty_close_20d_ago

relative_strength_vs_nifty = stock_return_20d - nifty_return_20d
```

A positive value means the stock is outperforming NIFTY over the last 20 trading days.

### Volume Liquidity Check

```
is_liquid = (volume_sma_20 >= MIN_LIQUIDITY_VOLUME)    // default: 500,000 shares/day
```

**Purpose and threshold note:** Under normal market conditions, NIFTY 50 stocks routinely trade millions of shares per day, so the 500,000 default will almost never trigger. This check exists primarily as a **safety net for unusual conditions** -- trading halts, post-holiday low-volume sessions, or stocks that have just entered the NIFTY 50 index with historically thinner liquidity. If backtesting shows this gate never fires, consider raising the threshold to 1,000,000 to make it a more meaningful filter. The threshold is configurable via `MIN_LIQUIDITY_VOLUME` in `.env`.

The `is_liquid` flag is computed and stored for backward compatibility but is no longer used as a gate during signal generation. All NIFTY 50 stocks are inherently liquid, so the liquidity gate was removed as dead code.

### Adaptive Thresholds

```
IF ADAPTIVE_THRESHOLDS_ENABLED = true AND data_points >= ADAPTIVE_MIN_DATA_POINTS:
    // VIX threshold: 75th percentile of 1-year VIX history
    vix_history = last 252 candles for ^INDIAVIX
    vix_threshold = PERCENTILE(0.75, vix_history.close)

    // Volume spike: 80th percentile of 60-day volume history
    volume_60d = last 60 candles for symbol
    volume_spike_threshold = PERCENTILE(0.80, volume_60d.volume)
    is_volume_spike = (volume > volume_spike_threshold)

    // RSI zones: rolling percentile boundaries
    rsi_60d = last 60 RSI values for symbol
    rsi_oversold  = PERCENTILE(0.25, rsi_60d)
    rsi_pullback  = PERCENTILE(0.45, rsi_60d)
    rsi_overbought = PERCENTILE(0.70, rsi_60d)
ELSE:
    // Fallback to static env vars
    Use VIX_THRESHOLD, 1.5x volume_sma_20, fixed 30/45/65 RSI zones
```

### Range Detection

```
price_range_20d = MAX(high) - MIN(low) over last 20 candles
atr_20d         = AVG(atr) over last 20 candles
range_to_atr    = price_range_20d / (atr_20d * 20)

is_ranging = (range_to_atr < 1.5)
           AND NOT is_breakout
           AND (rsi_zone IN ('NEUTRAL', 'PULLBACK'))
```

### Z-Score Computation

```
mean_20d    = AVG(adjusted_close) over last 20 candles
stddev_20d  = STDDEV(adjusted_close) over last 20 candles
z_score_20d = (adjusted_close - mean_20d) / stddev_20d
```

Positive z-score means price is above mean. Negative means below. A z-score of -2.0 means the stock is 2 standard deviations below its 20-day mean.

### RVOL and Volume Tier

```
rvol = (volume_sma_20 > 0) ? volume / volume_sma_20 : null

volume_tier =
    rvol >= 3.0 ? 'extreme' :
    rvol >= 2.0 ? 'high'    :
    rvol >= 1.3 ? 'elevated': 'normal'
```

RVOL provides a continuous measure of volume intensity. The tiered label maps to proportional scoring weights (see Section 12). The legacy `is_volume_spike` is still computed and stored for backward compatibility.

### VWAP Distance

```
vwap_data = computeRollingVWAP(candles, 20)    // returns array of { date, vwap }
vwap = vwap_data[i].vwap
vwap_distance_pct = ((adjusted_close - vwap) / vwap) * 100
is_near_vwap = ABS(vwap_distance_pct) < 2.0
```

Used as a signal quality filter in `signal.service.js` — signals where price is stretched beyond 2% from VWAP are rejected.

### High Delivery

```
delivery_pct = candle.delivery_pct    // from NSE Bhavcopy CSV (may be null)
is_high_delivery = (delivery_pct != null) ? delivery_pct > 50 : null
```

Delivery percentage above 50% indicates genuine institutional buying rather than intraday speculation. Adds a scoring bonus for breakout strategies.

### Computation Flow

```
FOR each symbol:
    FETCH latest candles + indicators for symbol
    FETCH NIFTY index candles (for relative strength)
    COMPUTE rolling VWAP from candle data
    COMPUTE all features (including RVOL, volume_tier, VWAP distance, is_high_delivery)
    UPSERT into features table
```

---

## 9. Strategy Engine

### 9.1 Market Regime Filter (Global Gate)

**Evaluated once per pipeline run before any strategy executes.**

The regime filter combines two independent checks: NIFTY trend direction AND market volatility (India VIX). Both must pass for the pipeline to proceed.

```
nifty_candle      = latest candle for ^NSEI
nifty_indicators  = latest indicators for ^NSEI
india_vix_candle  = latest candle for ^INDIAVIX

nifty_above_ema200 = nifty_candle.adjusted_close > nifty_indicators.ema_200

// Use adaptive VIX threshold if enabled, else static
IF ADAPTIVE_THRESHOLDS_ENABLED
    vix_threshold = adaptive_thresholds for ^INDIAVIX today
ELSE
    vix_threshold = VIX_THRESHOLD from env

vix_is_calm = india_vix_candle.close < vix_threshold

IF nifty_above_ema200 AND vix_is_calm
    nifty_ema20 = nifty_indicators.ema_20
    nifty_ema50 = nifty_indicators.ema_50
    nifty_range = ABS(nifty_ema20 - nifty_ema50) / nifty_ema50 * 100
    IF nifty_range < 2.0
        market_regime = 'SIDEWAYS'     // Range + MeanReversion strategies fire
    ELSE
        market_regime = 'BULLISH'      // All long strategies fire
ELSE IF NOT nifty_above_ema200
    market_regime = 'BEARISH'          // Short strategies fire
    LOG: "NIFTY below EMA200"
ELSE IF NOT vix_is_calm
    market_regime = 'HIGH_VOLATILITY'  // No signals at all
    LOG: "India VIX above threshold"
```

**India VIX thresholds:**

| VIX Level | Interpretation | Action |
|-----------|---------------|--------|
| < 15 | Low fear, calm market | Allow signals |
| 15-20 | Normal range | Allow signals |
| 20-25 | Elevated fear | Suppress signals (default threshold) |
| > 25 | High fear / panic | Definitely suppress |

The `VIX_THRESHOLD` is configurable via `.env` and should be tuned using backtest data. India VIX candles are stored in the `candles` table with `symbol = '^INDIAVIX'` and fetched daily alongside NIFTY 50 stocks. When `ADAPTIVE_THRESHOLDS_ENABLED` is true, the VIX threshold is derived from rolling percentiles instead.

**Market regime routing:**

| Regime | Strategies that fire | Signal type |
|--------|---------------------|-------------|
| BULLISH | Trend Pullback, Breakout, Range, Mean Reversion | BUY (LONG) |
| SIDEWAYS | Range, Mean Reversion | BUY (LONG) |
| BEARISH | Trend Pullback SHORT, Breakdown SHORT | SELL (SHORT) |
| HIGH_VOLATILITY | None — skip to status updates | — |

### 9.2 Strategy 1: Trend Pullback

**File:** `src/services/strategies/trend_pullback.strategy.js`

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `is_uptrend = true` | features table |
| 2 | `rsi_zone = 'PULLBACK'` (RSI between 30-45) | features table |
| 3 | `near_support = true` | features table |
| 4 | `ema_20 > ema_50` | indicators table (confirms healthy trend) |

**Signal calculation:**

```
entry_price = adjusted_close                          // enter at today's close (or next day open)
swing_low   = MIN(low) over last 15 candles
stop_loss   = swing_low - (0.5 * atr)                // buffer below swing low
risk        = entry_price - stop_loss
target      = entry_price + (2.0 * risk)              // 1:2 risk-reward minimum

IF risk <= 0
    DISCARD signal (invalid setup)

risk_reward = (target - entry_price) / risk
```

**Output:** raw signal object passed to scoring engine.

### 9.3 Strategy 2: Breakout

**File:** `src/services/strategies/breakout.strategy.js`

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `is_breakout = true` | features table |
| 2 | `is_volume_spike = true` | features table |
| 3 | `is_uptrend = true` | features table (breakout in direction of trend) |

**Signal calculation:**

```
resistance    = MAX(high) over last 20 candles (excluding current)
entry_price   = adjusted_close
stop_loss     = resistance - (1.0 * atr)              // just below the broken resistance
risk          = entry_price - stop_loss
target        = entry_price + (2.0 * risk)

// Guard: discard if risk is non-positive.
// This covers two edge cases:
//   1. stop_loss >= entry_price (ATR so large it pushes SL above entry) -> risk <= 0
//   2. stop_loss is very close to entry_price -> risk is near-zero, producing
//      an unrealistically tight setup
// Both result in risk <= 0 or an absurd R:R and must be discarded.
IF risk <= 0
    DISCARD signal (log: "Breakout SL {stop_loss} >= entry {entry_price}, ATR={atr}")

risk_reward = (target - entry_price) / risk
```

### 9.4 Strategy 3: Range Trading

**File:** `src/services/strategies/range.strategy.js`

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `is_ranging = true` | features table |
| 2 | `near_support = true` | features table |
| 3 | `rsi_zone IN ('PULLBACK', 'OVERSOLD')` | features table |
| 4 | `NOT is_breakout` | features table |

**Signal calculation:**

```
support    = MIN(low) over last 20 candles
resistance = MAX(high) over last 20 candles
entry      = adjusted_close
stop_loss  = support - (0.5 * atr)
target     = resistance * 0.95
risk       = entry - stop_loss

IF risk <= 0
    DISCARD signal

risk_reward = (target - entry) / risk
```

### 9.5 Strategy 4: Mean Reversion

**File:** `src/services/strategies/mean_reversion.strategy.js`

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `z_score_20d < -2.0` | features table |
| 2 | `rsi_zone = 'OVERSOLD'` | features table |
| 3 | `is_uptrend = true` | features table |
| 4 | `is_volume_spike = false` | features table |

**Signal calculation:**

```
mean_20d  = AVG(adjusted_close) over last 20 candles
entry     = adjusted_close
stop_loss = entry - (1.5 * atr)
target    = mean_20d
risk      = entry - stop_loss

IF risk <= 0
    DISCARD signal

risk_reward = (target - entry) / risk
```

### 9.6 Strategy 5: Trend Pullback SHORT

**File:** `src/services/strategies/trend_pullback_short.strategy.js`

Fires only in `BEARISH` regime.

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `adjusted_close < ema_50` | downtrend |
| 2 | `rsi_zone = 'OVERBOUGHT'` | bounce too high |
| 3 | `ema_20 < ema_50` | trend confirmed down |

**Signal calculation:**

```
swing_high  = MAX(high) over last 15 candles
entry_price = adjusted_close
stop_loss   = swing_high + (0.5 * atr)
risk        = stop_loss - entry_price        // for SHORT: SL above entry
target      = entry_price - (2.0 * risk)

IF risk <= 0
    DISCARD signal

risk_reward = (entry_price - target) / risk  // inverted for SHORT
signal_type = 'SELL'
direction   = 'SHORT'
```

### 9.7 Strategy 6: Breakdown SHORT

**File:** `src/services/strategies/breakdown.strategy.js`

Fires only in `BEARISH` regime.

**Entry conditions (all must be true):**

| # | Condition | Source |
|---|-----------|--------|
| 1 | `adjusted_close < MIN(low) of last 20 candles` | breakdown |
| 2 | `is_volume_spike = true` | volume confirms |
| 3 | `adjusted_close < ema_50` | downtrend |

**Signal calculation:**

```
support     = MIN(low) of last 20 candles
entry_price = adjusted_close
stop_loss   = support + (1.0 * atr)
risk        = stop_loss - entry_price
target      = entry_price - (2.0 * risk)

IF risk <= 0
    DISCARD signal

risk_reward = (entry_price - target) / risk
signal_type = 'SELL'
direction   = 'SHORT'
```

### Strategy Orchestrator

**File:** `src/services/strategies/index.js`

```
FUNCTION runStrategies(symbol, date, market_regime)
    enabled_strategies = FETCH strategy_config WHERE is_enabled = true
    // Fail-open: if strategy_config table doesn't exist, run all strategies

    raw_signals = []

    IF market_regime IN ('BULLISH', 'SIDEWAYS')
        IF 'RANGE' IN enabled_strategies
            range_signal = rangeStrategy.evaluate(symbol, date)
            IF range_signal: raw_signals.PUSH(range_signal)
        IF 'MEAN_REVERSION' IN enabled_strategies
            reversion_signal = meanReversionStrategy.evaluate(symbol, date)
            IF reversion_signal: raw_signals.PUSH(reversion_signal)

    IF market_regime == 'BULLISH'
        IF 'TREND_PULLBACK' IN enabled_strategies
            trend_signal = trendPullback.evaluate(symbol, date)
            IF trend_signal: raw_signals.PUSH(trend_signal)
        IF 'BREAKOUT' IN enabled_strategies
            breakout_signal = breakout.evaluate(symbol, date)
            IF breakout_signal: raw_signals.PUSH(breakout_signal)

    IF market_regime == 'BEARISH'
        IF 'TREND_PULLBACK_SHORT' IN enabled_strategies
            short_trend = trendPullbackShort.evaluate(symbol, date)
            IF short_trend: raw_signals.PUSH(short_trend)
        IF 'BREAKDOWN' IN enabled_strategies
            breakdown = breakdownStrategy.evaluate(symbol, date)
            IF breakdown: raw_signals.PUSH(breakdown)

    RETURN raw_signals
```

Strategies are dynamically enabled/disabled via the `strategy_config` table. The weekly calibration job evaluates per-strategy paper trade performance and auto-disables underperforming strategies (win rate < 40% with >= 15 trades). See Section 18 for calibration details.

---

## 10. Fundamental Filter

**Files:** `src/services/fundamentals/fundamental.service.js`, `src/services/fundamentals/fundamental.filter.js`

### Overview

The fundamental filter is a **pass/fail gate** that rejects technically valid signals if the underlying company's financials are deteriorating. It runs between the Strategy Engine (Step 6) and Scoring Engine (Step 7) in the pipeline. It does not modify scores -- it either passes the signal through or kills it entirely.

### Data Source

The Yahoo service uses a direct Axios call to `/v10/finance/quoteSummary/{symbol}` which returns financial statements, key statistics, and ownership data. No additional dependency is needed.

```
FUNCTION fetchFundamentals(symbol)
    summary = await yahooFinance.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'majorHoldersBreakdown']
    })

    RETURN {
        debt_to_equity:  summary.financialData.debtToEquity,
        eps_growth_yoy:  COMPUTE from summary.defaultKeyStatistics.earningsQuarterlyGrowth,
        revenue_growth:  COMPUTE from summary.financialData.revenueGrowth,
        promoter_pledge: COMPUTE from summary.majorHoldersBreakdown (if available)
    }
```

### Rejection Criteria

| Metric | Reject Signal If | Rationale |
|--------|-----------------|-----------|
| Debt-to-Equity | > 2.0 | Heavily leveraged, higher bankruptcy risk |
| EPS Growth (YoY) | Negative for 2+ consecutive quarters | Earnings are declining |
| Revenue Growth (YoY) | Negative for 2+ consecutive quarters | Top-line is shrinking |
| Promoter Pledging | > 50% of promoter holding pledged | Promoters may be forced to sell |

All thresholds are configurable via `.env`.

### Health Computation

```
FUNCTION computeHealthFlag(fundamentals)
    IF fundamentals.debt_to_equity > MAX_DEBT_TO_EQUITY
        RETURN { is_healthy: false, reason: "D/E ratio {value} exceeds {threshold}" }

    IF fundamentals.eps_growth_yoy < 0 for >= MIN_EPS_GROWTH_CONSECUTIVE_NEGATIVE quarters
        RETURN { is_healthy: false, reason: "EPS declining for {n} consecutive quarters" }

    IF fundamentals.revenue_growth < 0 for >= MIN_REVENUE_GROWTH_CONSECUTIVE_NEGATIVE quarters
        RETURN { is_healthy: false, reason: "Revenue declining for {n} consecutive quarters" }

    IF fundamentals.promoter_pledge > MAX_PROMOTER_PLEDGE_PCT
        RETURN { is_healthy: false, reason: "Promoter pledge at {value}% exceeds {threshold}%" }

    RETURN { is_healthy: true, reason: null }
```

The `is_healthy` flag is precomputed and stored in the `fundamentals` table so the daily pipeline only does a simple lookup.

### Refresh Schedule

Fundamentals do not change daily. A separate weekly cron job fetches and updates them:

```javascript
cron.schedule(FUNDAMENTAL_CRON_SCHEDULE, refreshAllFundamentals, {
    timezone: "Asia/Kolkata"
});
// Default: "0 18 * * 6" = Saturday 6:00 PM IST
```

This runs after the market week ends, giving Yahoo time to update any quarterly results published on Friday.

### Pipeline Gate (Step 6.5)

```
FOR each [symbol, signals] in raw_signals:
    fundamentals = SELECT * FROM fundamentals
                   WHERE symbol = ? ORDER BY fetched_date DESC LIMIT 1

    IF fundamentals IS NULL
        LOG warn: "No fundamental data for {symbol}, allowing signal (fail-open)"
        CONTINUE

    IF fundamentals.is_healthy = false
        LOG info: "Signal for {symbol} rejected by fundamental filter: {fundamentals.reason}"
        DELETE symbol from raw_signals
```

**Fail-open policy:** If no fundamental data exists for a symbol (e.g., first week of operation, or Yahoo failed to return data), the signal is allowed through with a warning. This prevents the fundamental filter from blocking the entire system on data gaps.

---

## 11. News Sentiment Layer

**Files:** `src/services/sentiment/news.service.js`, `src/services/sentiment/sentiment.service.js`

### Overview

The sentiment layer suppresses signals when recent news about a stock is strongly negative (fraud allegations, regulatory action, major earnings miss, etc.). It uses free Google News RSS -- no paid APIs.

### Data Source: Google News RSS (Free)

```
FUNCTION fetchHeadlines(symbol)
    // Strip the .NS suffix for cleaner search results
    clean_symbol = symbol.replace('.NS', '')
    rss_url = `https://news.google.com/rss/search?q=${encodeURIComponent(clean_symbol)}+NSE&hl=en-IN&gl=IN&ceid=IN:en`

    feed = PARSE RSS from rss_url using rss-parser
    RETURN feed.items
        .FILTER(item => item.pubDate within last SENTIMENT_LOOKBACK_DAYS)    // default: 7 days
        .MAP(item => { title: item.title, pubDate: item.pubDate, link: item.link })
```

### Keyword-Based Sentiment Scoring (Negation-Aware)

```
const NEGATIVE_KEYWORDS = [
    'fraud', 'scam', 'probe', 'arrested', 'sebi notice', 'sebi order',
    'default', 'bankruptcy', 'penalty', 'downgrade', 'rating downgrade',
    'loss widens', 'profit warning', 'earnings miss', 'revenue miss',
    'promoter selling', 'insider selling', 'pledge', 'debt default',
    'investigation', 'raid', 'suspension', 'delisting'
];

const NEGATION_WORDS = ['clears', 'cleared', 'acquitted', 'not guilty',
                        'no evidence', 'dismissed', 'drops', 'resolved'];

FUNCTION hasNearbyNegation(text, keyword, negation_words)
    keyword_index = text.indexOf(keyword)
    surrounding = text.substring(
        MAX(0, keyword_index - 40),
        MIN(text.length, keyword_index + keyword.length + 40)
    )
    RETURN negation_words.some(neg => surrounding.includes(neg))

FUNCTION scoreSentiment(symbol, headlines)
    FOR each headline in headlines:
        title_lower = headline.title.toLowerCase()
        FOR each keyword in NEGATIVE_KEYWORDS:
            IF title_lower.includes(keyword)
                IF hasNearbyNegation(title_lower, keyword, NEGATION_WORDS)
                    CONTINUE    // "probe clears" → not negative
                RETURN {
                    sentiment: 'NEGATIVE',
                    headline: headline.title,
                    confidence: 'HIGH',
                    source: 'GOOGLE_NEWS_RSS'
                }

    RETURN { sentiment: 'NEUTRAL', headline: null, confidence: 'HIGH', source: 'GOOGLE_NEWS_RSS' }
```

### Tier 2: FinBERT Sentiment Analysis (Primary, Optional)

**File:** `scripts/sentiment_server.py` (Python FastAPI microservice)

When the FinBERT microservice is running (configured via `FINBERT_URL` in `.env`, default `http://127.0.0.1:8765`), it replaces keyword-based sentiment as the primary analysis method. The Node.js `sentiment.service.js` sends headlines to `POST /sentiment` and receives per-headline sentiment labels with confidence scores.

```
FUNCTION queryFinBERT(headlines)
    TRY:
        response = POST FINBERT_URL/sentiment { headlines }
        IF any result has label == 'negative' AND score > 0.7
            RETURN 'NEGATIVE'
        RETURN 'NEUTRAL'
    CATCH:
        LOG warn: "FinBERT unavailable, falling back to keyword scoring"
        RETURN null   // triggers keyword-based fallback

FUNCTION filterBySentiment(symbol, headlines)
    finbert_result = queryFinBERT(headlines)
    IF finbert_result != null
        // FinBERT is the primary source
        sentiment = finbert_result
        source = 'FINBERT'
    ELSE
        // Fallback to keyword-based scoring
        sentiment = scoreSentiment(symbol, headlines)
        source = 'GOOGLE_NEWS_RSS'
    UPSERT sentiment_flag with source
    RETURN sentiment
```

**Starting the FinBERT server:**

The FinBERT server is started automatically alongside the Node.js server when using `npm run dev` or `./deploy.sh`. To start it manually:

```bash
cd backend
python3 scripts/sentiment_server.py     # listens on port 8765 (FINBERT_PORT env var)
```

The first run downloads the ProsusAI/finbert model (~500 MB, cached in `~/.cache/huggingface/` after that). The server exposes `POST /sentiment` and `GET /health` endpoints.

If the FinBERT server is unavailable, the backend falls back to keyword-based sentiment scoring automatically. The `FINBERT_URL` env var (default `http://127.0.0.1:8765`) controls the connection target.

### Tier 3: Finnhub Confirmation (Optional)

When `FINNHUB_API_KEY` is set in `.env`, RSS NEGATIVE results are verified against Finnhub's pre-classified sentiment before suppressing a signal:

```
IF rss_result.sentiment == 'NEGATIVE' AND FINNHUB_API_KEY is set
    finnhub_score = fetchFinnhubSentiment(symbol, last 7 days)
    // Finnhub returns -1 to +1
    IF finnhub_score > -0.2
        sentiment = 'NEUTRAL'
        overridden = true
        LOG: "RSS false positive overridden by Finnhub for {symbol}"
    ELSE
        sentiment = 'NEGATIVE'
        overridden = false
```

This is backwards-compatible. If `FINNHUB_API_KEY` is not set, Tier 1 (improved keyword matching) operates alone.

### Execution Strategy

Sentiment is NOT fetched for all 50 stocks every day. It runs only for symbols that have generated a raw signal after the strategy engine (typically 5-15 stocks on any given day). This keeps RSS fetches minimal and avoids rate limiting.

### Pipeline Gate (Step 6.6)

```
// Runs after fundamental filter, only for symbols still in raw_signals
FOR each [symbol, signals] in raw_signals:
    sentiment = scoreSentiment(symbol, fetchHeadlines(symbol))

    INSERT INTO sentiment_flags (symbol, flag_date, sentiment, headline, source)
        VALUES (symbol, TODAY, sentiment.sentiment, sentiment.headline, sentiment.source)
        ON DUPLICATE KEY UPDATE sentiment = VALUES(sentiment), headline = VALUES(headline)

    IF sentiment.sentiment = 'NEGATIVE'
        LOG info: "Signal for {symbol} suppressed: negative news - {sentiment.headline}"
        DELETE symbol from raw_signals
```

### Limitations

- Keyword matching now includes negation awareness (e.g., "SEBI probe clears company" is detected as non-negative via the `NEGATION_WORDS` list). Some edge cases may still produce false positives, but this is acceptable because false positives only suppress signals (conservative behavior), not generate bad ones. When `FINNHUB_API_KEY` is configured, Tier 2 provides an additional override layer for RSS false positives.
- Google News RSS may change its URL structure or rate-limit aggressive crawling. A 500ms delay between fetches and a fallback to `sentiment = NEUTRAL` on fetch failure mitigates this.
- RSS does not require authentication or API keys.

---

## 12. Scoring Engine

**File:** `src/services/scoring/scoring.service.js`

### Weight Configuration

The scoring engine is **direction-aware**. LONG and SHORT signals are scored using mirror logic against the same weight budget (max 100). The `direction` parameter (default `'LONG'`) is passed through from `deduplicateAndGenerate()`.

**LONG scoring weights** (stored in `SCORING_WEIGHTS` in `src/config/constants.js`):

| Factor | Base Weight | Condition to Score |
|--------|--------|--------------------|
| Trend Alignment | +30 | `is_uptrend = true` AND `ema_20 > ema_50`. **Soft filter:** if `ema50_slope <= 0`, reduced by 15 (TREND_SLOPE_PENALTY) |
| RSI Pullback | +20 | `rsi_zone = 'PULLBACK'` |
| Volume (tiered) | 0-30 | Based on `volume_tier`: extreme=30, high=20, elevated=10, normal=0 |
| Breakout | +20 | `is_breakout = true`. **Soft filter:** if `close_position < 0.6`, 0 points; if `0.6-0.75`, reduced by 10 (BREAKOUT_SOFT_PENALTY); if `>= 0.75`, full points |
| High Delivery Bonus | +10 | `is_high_delivery = true` AND `is_breakout = true` |

**SHORT scoring weights** (stored in `SHORT_SCORING_WEIGHTS` in `src/config/constants.js`):

| Factor | Base Weight | Condition to Score |
|--------|--------|--------------------|
| Downtrend Alignment | +30 | NOT `is_uptrend` AND `ema_20 < ema_50`. **Soft filter:** if `ema50_slope >= 0` (rising = weakening downtrend), reduced by 15 |
| RSI Overbought | +20 | `rsi_zone = 'OVERBOUGHT'` |
| Volume (tiered) | 0-30 | Same volume tier scoring as LONG (volume confirms both directions) |
| Breakdown | +20 | NOT `is_breakout` AND `close_position < 0.4` (candle closed in lower 40% = strong breakdown) |
| High Delivery Bonus | +10 | `is_high_delivery = true` AND breakdown confirmed (institutional selling pressure) |

**Soft filter constants** (stored in `src/config/constants.js` under `SOFT_FILTER`):

| Constant | Value | Purpose |
|----------|-------|---------|
| BREAKOUT_CLOSE_POSITION_HARD | 0.6 | Below this, no breakout points (LONG) |
| BREAKOUT_CLOSE_POSITION_SOFT | 0.75 | Below this (but >= 0.6), reduced breakout points (LONG) |
| BREAKOUT_SOFT_PENALTY | 10 | Points deducted for moderate close position (LONG) |
| TREND_SLOPE_PENALTY | 15 | Points deducted for flat/declining EMA50 (LONG) or flat/rising EMA50 (SHORT) |
| BREAKDOWN_CLOSE_POSITION_THRESHOLD | 0.4 | Below this, candle is a confirmed breakdown (SHORT) |

**Volume tier scores** (shared by both directions):

| Volume Tier | RVOL Range | Score |
|-------------|-----------|-------|
| extreme | >= 3.0 | +30 |
| high | >= 2.0 | +20 |
| elevated | >= 1.3 | +10 |
| normal | < 1.3 | +0 |

**Delivery bonus:** For LONG, when a breakout signal has high delivery (>50%), +10 quality bonus. For SHORT, when a breakdown candle has high delivery, +10 quality bonus (institutional selling pressure).

### Dynamic Weight Calibration (Adaptive Scoring)

At pipeline start, the scoring engine loads weights from the `adaptive_thresholds` table (symbol `_GLOBAL_`). If adaptive weights exist (populated by the weekly calibration job), they replace the static base weights. If not available, static defaults are used.

```
FUNCTION loadAdaptiveWeights()
    query adaptive_thresholds WHERE symbol = '_GLOBAL_' AND weight_trend IS NOT NULL
    IF found: return { trend, rsi, volume, breakout } from weight columns
    ELSE: return null (use static SCORING_WEIGHTS)
```

The **weekly weight calibration job** (`weekly_weight_calibration.job.js`, runs Sunday 2 AM IST) queries the last 90 days of `signal_outcomes`, computes win rates per feature, and adjusts weights using the formula: `adjusted_weight = BASE_WEIGHT * (0.5 + winRate)`. This makes the scoring engine self-calibrating based on actual signal performance.

**Gradual calibration** (two-stage):

| Outcome Count | Action | Env Var |
|---------------|--------|---------|
| < 15 | Skip calibration entirely | `ADAPTIVE_MIN_TRADES_PARTIAL` |
| 15 – 29 | Apply 30% blended adjustment: `new = base * 0.7 + adaptive * 0.3` | `ADAPTIVE_PARTIAL_BLEND` |
| >= 30 | Apply full adjustment (100% adaptive weights) | `ADAPTIVE_MIN_TRADES_FULL` |

This prevents noisy early learning while still allowing the system to adapt with limited data.

### Scoring Algorithm

The scoring engine provides two entry points: `calculateScore(symbol, date, direction)` for backward-compatible total score, and `calculateScoreWithBreakdown(symbol, date, direction)` which returns both the score and a four-bucket breakdown. The `direction` parameter defaults to `'LONG'`.

```
FUNCTION _scoreInternal(symbol, date, direction = 'LONG')
    features  = FETCH features for symbol, date
    indicator = FETCH indicators for symbol, date
    IF NOT features OR NOT indicator: RETURN { score: 0, breakdown: null, feature, indicator }

    adaptive = loadAdaptiveWeights()
    technical = 0, momentum = 0, volume = 0, quality = 0

    IF direction == 'SHORT':
        w_trend     = adaptive ? adaptive.trend    : SHORT_SCORING_WEIGHTS.TREND          // 30
        w_rsi       = adaptive ? adaptive.rsi      : SHORT_SCORING_WEIGHTS.RSI_OVERBOUGHT // 20
        w_breakdown = adaptive ? adaptive.breakout : SHORT_SCORING_WEIGHTS.BREAKDOWN      // 20

        is_downtrend = NOT features.is_uptrend AND ema_20 < ema_50
        IF is_downtrend
            trend_score = w_trend
            IF features.ema50_slope != null AND features.ema50_slope >= 0
                trend_score = MAX(0, trend_score - TREND_SLOPE_PENALTY)
            technical += trend_score

        IF features.rsi_zone == 'OVERBOUGHT'
            momentum += w_rsi

        is_breakdown = NOT features.is_breakout AND close_position < BREAKDOWN_CLOSE_POSITION_THRESHOLD (0.4)
        IF is_breakdown
            technical += w_breakdown

        IF features.is_high_delivery AND is_breakdown
            quality += 10

    ELSE:    // LONG
        w_trend    = adaptive ? adaptive.trend    : SCORING_WEIGHTS.TREND        // 30
        w_rsi      = adaptive ? adaptive.rsi      : SCORING_WEIGHTS.RSI_PULLBACK // 20
        w_breakout = adaptive ? adaptive.breakout : SCORING_WEIGHTS.BREAKOUT     // 20

        IF features.is_uptrend AND ema_20 > ema_50
            trend_score = w_trend
            IF features.ema50_slope != null AND features.ema50_slope <= 0
                trend_score = MAX(0, trend_score - TREND_SLOPE_PENALTY)
            technical += trend_score

        IF features.rsi_zone == 'PULLBACK'
            momentum += w_rsi

        IF features.is_breakout
            close_pos = features.close_position
            IF close_pos < 0.6: no points
            ELSE IF close_pos < 0.75: technical += MAX(0, w_breakout - BREAKOUT_SOFT_PENALTY)
            ELSE: technical += w_breakout

        IF features.is_high_delivery AND features.is_breakout
            quality += 10

    // Volume scoring — same for both directions
    volume_tier = features.volume_tier OR 'normal'
    IF adaptive:
        tier_multiplier = { extreme: 1.0, high: 0.67, elevated: 0.33, normal: 0 }
        volume += adaptive.volume * tier_multiplier[volume_tier]
    ELSE:
        volume += VOLUME_TIER_SCORES[volume_tier]    // 30/20/10/0

    score = CLAMP(technical + momentum + volume + quality, 0, 100)
    breakdown = { technical, momentum, volume, quality }
    RETURN { score, breakdown, feature, indicator }

FUNCTION calculateScore(symbol, date, direction = 'LONG')
    RETURN _scoreInternal(symbol, date, direction).score

FUNCTION calculateScoreWithBreakdown(symbol, date, direction = 'LONG')
    RETURN _scoreInternal(symbol, date, direction)
```

### Confidence Breakdown

The breakdown object stored on each signal has this shape:

```json
{ "technical": 30, "momentum": 20, "volume": 20, "quality": 10 }
```

| Bucket | What contributes | Max |
|--------|-----------------|-----|
| technical | Trend alignment (`w_trend`) + Breakout (`w_breakout`) | 50 |
| momentum | RSI pullback (`w_rsi`) | 20 |
| volume | Volume tier score (RVOL-based) | 30 |
| quality | High delivery + breakout bonus | 10 |

### Explainability (buildExplanations)

A companion function `buildExplanations(feature, indicator, regime, sentiment, direction)` produces an array of plain-English sentences using the same feature and indicator data that `calculateScore` evaluates. It is direction-aware: for LONG it covers trend alignment, RSI pullback, breakout, and delivery quality; for SHORT it covers downtrend alignment, RSI overbought, breakdown confirmation, and institutional selling. Volume tier and sentiment explanations are shared. The result is stored as `explanation` JSON on the signal.

### Normalization for Merged Signals

When the same symbol triggers multiple strategies on the same date, scores are combined:

```
merged_score = MIN(sum_of_individual_scores, 100)
```

The confidence value equals the merged score. The `MIN(..., 100)` cap ensures confidence stays in the 0-100 range.

### Gate Conditions

A signal is emitted only if ALL conditions pass:

1. `confidence >= MIN_CONFIDENCE` (default: 70)
2. `risk_reward >= MIN_RISK_REWARD` (default: 2.0)
3. Number of current ACTIVE signals < `MAX_ACTIVE_SIGNALS` (default: 10)
4. Number of ACTIVE signals in the same sector < `MAX_SECTOR_SIGNALS` (default: 3)

### Confidence Tier System

After a signal passes the confidence gate, it is assigned a **confidence tier**:

| Confidence | Tier | Env Var |
|------------|------|---------|
| >= 85 | HIGH | `CONFIDENCE_TIER_HIGH` |
| >= 75 | NORMAL | `CONFIDENCE_TIER_NORMAL` |
| >= 70 | LOW | `CONFIDENCE_TIER_LOW` |

The tier is stored as `confidence_tier` on the signal (ENUM: HIGH, NORMAL, LOW) and exposed via the API. Frontend can filter signals by tier.

---

## 13. Signal Generation, Deduplication, and Frequency Control

**File:** `src/services/signals/signal.service.js`

### Architecture

When `FREQUENCY_CONTROLLER_ENABLED=true` (default), signal generation uses a two-phase approach:

1. **`buildCandidate()`** — Evaluates a single symbol's raw signals through all hard gates (DUPLICATE, VWAP, PCR, sector cap, active cap, position sizing). Uses relaxed pool floor thresholds for confidence (`POOL_MIN_CONFIDENCE=65`) and R:R (`POOL_MIN_RISK_REWARD=1.5`) instead of the strict thresholds. Returns a fully-formed candidate object or null.

2. **`selectTopSignals(candidates, date)`** — Takes all candidates from Phase 1, queries the weekly signal count via `signalModel.countByWeek(date)`, computes remaining slots (`TARGET_WEEKLY_SIGNALS - weekly_count`), and selects the top `min(MAX_SIGNALS_PER_DAY, remaining_slots)` candidates ranked by `confidence DESC, risk_reward DESC`. Candidates that don't make the cut are logged to `rejected_signals` with stage `FREQUENCY_CAP`.

When `FREQUENCY_CONTROLLER_ENABLED=false`, `buildCandidate()` uses the strict thresholds (`MIN_CONFIDENCE`, `MIN_RISK_REWARD`) and all candidates pass through directly — identical to the pre-frequency-controller behavior.

The legacy function `deduplicateAndGenerate()` is preserved as a thin wrapper around `buildCandidate()` for backward compatibility.

### Deduplication Logic (buildCandidate)

```
FUNCTION buildCandidate(symbol, date, raw_signals)
    IF raw_signals is empty
        RETURN null

    IF raw_signals has 1 entry
        signal = raw_signals[0]
    ELSE
        // Multiple strategies triggered for same symbol on same date.
        // For BUY signals, a higher stop_loss is closer to entry_price,
        // meaning less risk per share but also less room for the trade
        // to breathe. We intentionally pick the closest SL to entry
        // (least risk exposure) and recalculate target from it.
        // This is an AGGRESSIVE choice -- it reduces the risk amount but
        // increases the chance of getting stopped out on noise.
        // To give trades more breathing room instead, change to MIN().
        stop_loss   = MAX(all stop_loss values)         // closest SL to entry (least risk)
        entry_price = raw_signals[0].entry_price        // same for all (today's close)
        risk        = entry_price - stop_loss
        target      = entry_price + (2.0 * risk)        // recalculate from the tighter SL
        risk_reward = (target - entry_price) / risk

        IF risk <= 0
            LOG: "Merged signal for {symbol} discarded: non-positive risk after SL merge"
            RETURN null

        signal = {
            symbol,
            date,
            entry_price,
            stop_loss,
            target,
            risk_reward,
            strategies: COLLECT all strategy names,
            reasons: COLLECT all triggering factor names
        }

    features = FETCH features for symbol, date
    soft_penalty = 0

    // VWAP distance filter — soft penalty + hard reject
    IF features.vwap_distance_pct != null
        IF direction == 'LONG' AND vwap_dist > VWAP_HARD_REJECT_LONG (5.0%)
            LOG + INSERT rejected_signals(VWAP_FILTER) → RETURN null
        IF direction == 'SHORT' AND |vwap_dist| > VWAP_HARD_REJECT_SHORT (5.0%)
            LOG + INSERT rejected_signals(VWAP_FILTER) → RETURN null
        IF direction == 'LONG' AND vwap_dist > VWAP_SOFT_PENALTY_LONG (2.0%)
            soft_penalty += -10
        IF direction == 'SHORT' AND |vwap_dist| > VWAP_SOFT_PENALTY_SHORT (2.0%)
            soft_penalty += -10

    // PCR filter — soft penalty + hard reject
    IF nifty_pcr != null AND direction == 'LONG'
        IF nifty_pcr > 1.8 → LOG + INSERT rejected_signals(PCR_FILTER) → RETURN null
        IF nifty_pcr > 1.4 → soft_penalty += -10
    IF nifty_pcr != null AND nifty_pcr < 0.7
        soft_penalty += -10   // bull trap risk

    // Sector correlation gate — enhanced with intra-batch counting
    sector = getSector(symbol)
    active_sector_count = countActiveBySector(sector) + batch_sector_count
    IF active_sector_count >= MAX_SIGNALS_PER_SECTOR
        LOG: "Signal for {symbol} suppressed: sector {sector} at limit"
        RETURN null

    { raw_confidence, breakdown, feature: scoreFeature, indicator: scoreIndicator }
        = calculateScoreWithBreakdown(symbol, date, direction)

    // Apply soft penalties (VWAP, PCR) and sentiment adjustment from Step 9
    confidence = CLAMP(raw_confidence + soft_penalty + sentiment_adjustment, 0, 100)

    // When frequency controller is enabled, use pool floor thresholds (65, 1.5)
    // When disabled, use strict thresholds (MIN_CONFIDENCE=70, MIN_RISK_REWARD=2.0)
    min_conf = FREQUENCY_CONTROLLER_ENABLED ? POOL_MIN_CONFIDENCE : MIN_CONFIDENCE
    min_rr   = FREQUENCY_CONTROLLER_ENABLED ? POOL_MIN_RISK_REWARD : MIN_RISK_REWARD

    IF confidence < min_conf
        LOG + INSERT rejected_signals(CONFIDENCE_GATE)
        RETURN null

    IF risk_reward < min_rr
        LOG + INSERT rejected_signals(RR_GATE)
        RETURN null

    explanation = buildExplanations(scoreFeature, scoreIndicator, regime, sentiment, direction)

    // Resolve execution type based on direction and account type
    { execution_type, is_executable } = resolveExecutionType(direction, ACCOUNT_TYPE)

    RETURN {
        symbol,
        date,
        signal_type: direction == 'SHORT' ? 'SELL' : 'BUY',
        direction,
        execution_type,
        is_executable,
        confidence,
        entry_price,
        stop_loss,
        target_price: target,
        risk_reward,
        reasons,
        status: 'ACTIVE',
        strategy_source: strategies.join('+'),
        confidence_breakdown: breakdown,
        explanation
    }
```

### Rejection Logging

Every `RETURN null` path in `buildCandidate` writes to the `rejected_signals` table before returning. Additionally, `selectTopSignals` logs candidates that pass all gates but are not selected in the Top-N cut. This provides full pipeline transparency. The rejection points are:

| Gate | `reject_stage` | When |
|------|----------------|------|
| Duplicate check | `DUPLICATE` | Symbol already has an active signal in same direction |
| Merged SL risk | `MERGED_RISK_ZERO` | Risk <= 0 after SL merge |
| VWAP distance | `VWAP_FILTER` | Price stretched beyond per-strategy VWAP threshold (default 2%, breakout 3.5%) |
| Put-Call Ratio | `PCR_FILTER` | PCR > 1.5 for LONG signals |
| Confidence | `CONFIDENCE_GATE` | Confidence below pool floor (65) or strict threshold (70) |
| Risk:Reward | `RR_GATE` | R:R below pool floor (1.5) or strict threshold (2.0) |
| Active cap | `ACTIVE_CAP` | Active signals at capacity |
| Sector cap | `SECTOR_GATE` | Sector signals at capacity |
| Position sizing | `POSITION_SIZING` | 0 shares after sizing |
| Frequency cap | `FREQUENCY_CAP` | Candidate passed all gates but not selected in Top-N daily cut |

### Position Sizing (ATR-based)

Computed after all gates pass, before storing the signal:

```
risk_per_share     = entry_price - stop_loss                    // already computed
risk_per_trade_inr = TOTAL_CAPITAL_INR * (RISK_PCT_PER_TRADE / 100)
shares_to_buy      = FLOOR(risk_per_trade_inr / risk_per_share)
position_value     = shares_to_buy * entry_price

max_position_value = TOTAL_CAPITAL_INR * (MAX_POSITION_PCT / 100)
IF position_value > max_position_value
    shares_to_buy = FLOOR(max_position_value / entry_price)
    position_value = shares_to_buy * entry_price

capital_risk_inr = shares_to_buy * risk_per_share

// For SHORT signals:
// risk_per_share = stop_loss - entry_price (SL is above entry)
// MAX_POSITION_PCT_SHORT = MAX_POSITION_PCT * 0.5
```

### Signal Output Format

```json
{
  "id": 142,
  "symbol": "RELIANCE.NS",
  "date": "2026-03-23",
  "signal_type": "BUY",
  "direction": "LONG",
  "confidence": 78.00,
  "entry_price": 2450.00,
  "stop_loss": 2380.00,
  "target_price": 2600.00,
  "risk_reward": 2.14,
  "shares_to_buy": 28,
  "position_value": 68600.00,
  "capital_risk_inr": 1960.00,
  "reasons": ["Trend Alignment", "Volume Spike", "Breakout"],
  "status": "ACTIVE",
  "strategy_source": "TREND_PULLBACK+BREAKOUT",
  "created_at": "2026-03-23T16:45:00.000Z",
  "explanation": [
    "Stock is in an uptrend with EMA 20 (2420.50) above EMA 50 (2380.00), adding trend alignment points.",
    "RSI is in the pullback zone (42.3), indicating a favorable entry point.",
    "Volume tier is HIGH (RVOL: 1.85x), contributing volume points.",
    "Price is breaking out above resistance, earning breakout points."
  ],
  "confidence_breakdown": {
    "technical": 50,
    "momentum": 20,
    "volume": 20,
    "quality": 0
  }
}
```

### Signal Lifecycle Management

Run daily as part of the pipeline, after signal generation:

```
FUNCTION updateSignalStatuses()
    active_signals = SELECT * FROM signals WHERE status = 'ACTIVE'

    FOR each signal in active_signals:
        today_candle = FETCH latest candle for signal.symbol

        // Same-candle conflict: on a wide-range day, both SL and target
        // can be breached within the same candle. Since we only have OHLCV
        // data (no intraday tick sequence), we cannot determine which was
        // hit first. By design, SL takes priority as a CONSERVATIVE
        // assumption -- we assume the worst-case outcome. This is an
        // intentional choice that slightly understates win rate in
        // backtesting, which is preferable to overstating it.

        // For LONG (BUY) signals:
        IF signal.direction == 'LONG'
            IF today_candle.low <= signal.stop_loss
                UPDATE signal SET status = 'SL_HIT', closed_at = today
                recordOutcome(signal, 'SL_HIT', today)
            ELSE IF today_candle.high >= signal.target_price
                UPDATE signal SET status = 'TARGET_HIT', closed_at = today
                recordOutcome(signal, 'TARGET_HIT', today)
            ELSE IF DATEDIFF(today, signal.date) >= HOLDING_PERIOD_DAYS
                UPDATE signal SET status = 'EXPIRED', closed_at = today
                recordOutcome(signal, 'EXPIRED', today)

        // For SHORT (SELL) signals (inverted):
        ELSE IF signal.direction == 'SHORT'
            IF today_candle.high >= signal.stop_loss
                UPDATE signal SET status = 'SL_HIT', closed_at = today
                recordOutcome(signal, 'SL_HIT', today)
            ELSE IF today_candle.low <= signal.target_price
                UPDATE signal SET status = 'TARGET_HIT', closed_at = today
                recordOutcome(signal, 'TARGET_HIT', today)
            ELSE IF DATEDIFF(today, signal.date) >= HOLDING_PERIOD_DAYS
                UPDATE signal SET status = 'EXPIRED', closed_at = today
                recordOutcome(signal, 'EXPIRED', today)

FUNCTION recordOutcome(signal, outcome, resolved_at)
    // Snapshot the feature state for this signal's date
    features = FETCH features for signal.symbol, signal.date
    INSERT INTO signal_outcomes (signal_id, outcome, strategy, features_json, resolved_at)
        VALUES (signal.id, outcome, signal.strategy_source, JSON(features), resolved_at)
    // This data feeds the weekly weight calibration job (Section 18)
```

---

## 14. Backtesting Engine

**File:** `src/services/backtesting/backtest.service.js`

### Methodology: Walk-Forward Validation

```
Total data: 3 years
Window:     1-year train / 6-month test
Step:       6 months

Example periods:
  Run 1: Train 2023-01 to 2023-12, Test 2024-01 to 2024-06
  Run 2: Train 2023-07 to 2024-06, Test 2024-07 to 2024-12
  Run 3: Train 2024-01 to 2024-12, Test 2025-01 to 2025-06
  Run 4: Train 2024-07 to 2025-06, Test 2025-07 to 2025-12
```

### Survivorship-Bias-Free Symbol Selection

The backtester checks the `nifty50_composition` table before selecting symbols. If the table contains data, it queries `getSymbolsForDateRange(test_start, test_end)` to include all stocks that were in the NIFTY 50 index at any point during the test period — including stocks that were later removed from the index. This prevents survivorship bias, which can inflate backtest win rates by 3-8 percentage points.

```
symbols_for_backtest =
    IF nifty50_composition has data:
        getSymbolsForDateRange(test_start, test_end)   // includes historically removed stocks
    ELSE:
        nifty_50_symbols                               // fallback to current composition
```

The `nifty50_composition` table is seeded via `scripts/seed_nifty50_composition.js` and should be expanded over time with historical data from NSE index factsheets.

### Look-Ahead Bias Prevention

The backtester simulates the pipeline as if running on each historical date:

```
FOR each test_date in test_period:
    // Only candles up to test_date are visible
    candles     = SELECT FROM candles WHERE date <= test_date
    indicators  = RECALCULATE using only candles up to test_date
    features    = RECALCULATE using only indicators up to test_date
    raw_signals = RUN strategies using features for test_date
    signal      = SCORE and GENERATE signal

    IF signal exists:
        outcome = evaluateOutcome(signal, future_candles)
        RECORD result
```

`future_candles` are only used in `evaluateOutcome` to determine if SL or target was hit -- never in signal generation.

### Outcome Evaluation

The backtester uses the **next-day open** as the realistic entry price instead of the signal day's close. This eliminates the look-ahead bias inherent in assuming you can enter at the closing price on the day the signal fires.

```
FUNCTION evaluateOutcome(signal, future_candles)
    realistic_entry = future_candles[0].open   // next day's open, not signal.entry_price

    // Gap-open guard: if the market opens past SL, it's an immediate loss
    IF signal.direction == 'LONG' AND realistic_entry <= signal.stop_loss
        RETURN { result: 'LOSS', exit_price: realistic_entry, realistic_entry, days: 0, gap_open: true }
    IF signal.direction == 'SHORT' AND realistic_entry >= signal.stop_loss
        RETURN { result: 'LOSS', exit_price: realistic_entry, realistic_entry, days: 0, gap_open: true }

    FOR day = 0 to HOLDING_PERIOD_DAYS:
        candle = future_candles[day]

        IF signal.direction == 'LONG'
            IF candle.low <= signal.stop_loss
                RETURN { result: 'LOSS', exit_price: signal.stop_loss, realistic_entry, days: day+1 }
            IF candle.high >= signal.target_price
                RETURN { result: 'WIN', exit_price: signal.target_price, realistic_entry, days: day+1 }
        ELSE IF signal.direction == 'SHORT'
            IF candle.high >= signal.stop_loss
                RETURN { result: 'LOSS', exit_price: signal.stop_loss, realistic_entry, days: day+1 }
            IF candle.low <= signal.target_price
                RETURN { result: 'WIN', exit_price: signal.target_price, realistic_entry, days: day+1 }

    RETURN { result: 'NEUTRAL', exit_price: last_candle.close, realistic_entry, days: HOLDING_PERIOD_DAYS }
```

The `calculateNetReturn()` function uses `outcome.realistic_entry` (not `signal.entry_price`) for all PnL calculations.

### SHORT Signal Outcome Evaluation

For SHORT signals, the SL/target logic is inverted compared to LONG:

- **SL is above entry price** — triggered when `candle.high >= signal.stop_loss` (price moved against the short position).
- **Target is below entry price** — triggered when `candle.low <= signal.target_price` (price moved in favor of the short position).
- Same-candle conflict rule still applies: SL takes priority (conservative assumption).

### Cost Model

Applied to every trade during backtesting with **direction-aware slippage**:

```
cost = (SLIPPAGE_PCT + BROKERAGE_PCT) / 100                   // default 0.15% combined

LONG:
  effective_entry = entry_price * (1 + cost)                   // buying costs more
  effective_exit  = exit_price  * (1 - cost)                   // selling receives less

SHORT:
  effective_entry = entry_price * (1 - cost)                   // selling receives less
  effective_exit  = exit_price  * (1 + cost)                   // buying back costs more

net_return_pct  = (effective_exit - effective_entry) / effective_entry * 100
```

### Metrics Calculation

**File:** `src/services/backtesting/metrics.service.js`

| Metric | Formula |
|--------|---------|
| Win Rate | `wins / total_signals * 100` |
| Avg Return | `mean(net_return_pct for all trades)` |
| Max Drawdown | Largest peak-to-trough decline in cumulative returns |
| Sharpe Ratio | `mean(daily_returns) / stddev(daily_returns) * sqrt(252)` |
| Profit Factor | `sum(winning_returns) / abs(sum(losing_returns))` |
| Avg Holding Days | `mean(holding_period for all trades)` |

Results are stored in the `backtest_results` table with the weight configuration used, enabling comparison across tuning iterations.

### Combined Strategy Tracking

When both TREND_PULLBACK and BREAKOUT trigger for the same symbol on the same date and are merged into a single signal (see Section 13), that merged signal is tracked in backtesting under `strategy_name = 'COMBINED'`. This means the backtest produces three sets of results:

| strategy_name | What it measures |
|---------------|-----------------|
| TREND_PULLBACK | Signals where only Trend Pullback triggered |
| BREAKOUT | Signals where only Breakout triggered |
| COMBINED | Signals where both strategies triggered and were merged |

This allows comparing whether merged signals outperform individual ones. The `GET /api/v1/backtest/results` endpoint supports filtering by all three names plus `ALL` (which returns all rows).

---

## 15. Favorites Module

### Overview

Users can mark NIFTY 50 stocks as favorites to create a personal watchlist. Favorited stocks appear prominently in the API responses -- the system can filter signals and stock data to show only favorites.

### User Identification (MVP)

Since the MVP has no full authentication system, users are identified by a `user_identifier` string:
- Passed via the `X-User-Id` request header.
- Must be a non-empty string, max 64 characters.
- Typically a UUID generated by the frontend on first use and persisted in local storage.

### Service Logic

**File:** `src/services/favorites/favorite.service.js`

```
FUNCTION addFavorite(user_identifier, symbol, notes)
    VALIDATE symbol exists in NIFTY 50 list
    INSERT INTO favorites (user_identifier, symbol, notes)
        ON DUPLICATE KEY UPDATE notes = notes
    RETURN favorite record

FUNCTION removeFavorite(user_identifier, symbol)
    DELETE FROM favorites WHERE user_identifier = ? AND symbol = ?
    RETURN { removed: true }

FUNCTION listFavorites(user_identifier)
    // Use a lateral subquery to fetch at most ONE active signal per symbol
    // (the most recent by date). Without this, a symbol with multiple ACTIVE
    // signals produces duplicate rows in the result set.
    SELECT f.symbol, f.notes, f.created_at,
           latest_sig.signal_type, latest_sig.confidence, latest_sig.status,
           latest_sig.date AS signal_date,
           today_candle.close AS latest_close,
           ROUND(((today_candle.close - prev_candle.close) / prev_candle.close) * 100, 2)
               AS change_pct
    FROM favorites f
    LEFT JOIN LATERAL (
        SELECT signal_type, confidence, status, date
        FROM signals
        WHERE signals.symbol = f.symbol AND signals.status = 'ACTIVE'
        ORDER BY date DESC
        LIMIT 1
    ) latest_sig ON TRUE
    LEFT JOIN LATERAL (
        SELECT close FROM candles
        WHERE candles.symbol = f.symbol
        ORDER BY date DESC LIMIT 1
    ) today_candle ON TRUE
    LEFT JOIN LATERAL (
        SELECT close FROM candles
        WHERE candles.symbol = f.symbol
        ORDER BY date DESC LIMIT 1 OFFSET 1
    ) prev_candle ON TRUE
    WHERE f.user_identifier = ?
    ORDER BY f.created_at DESC

FUNCTION isFavorite(user_identifier, symbol)
    SELECT COUNT(*) FROM favorites WHERE user_identifier = ? AND symbol = ?
    RETURN count > 0
```

### Favorites Integration with Other Endpoints

- `GET /api/v1/signals` accepts an optional `?favorites_only=true&user_id=<id>` query param. When set, only signals for favorited stocks are returned.
- `GET /api/v1/stock/:symbol` response includes an `is_favorite` boolean field when `X-User-Id` header is present.
- `GET /api/v1/favorites` returns the full watchlist with the latest signal status for each favorited stock.

### Validation

**File:** `src/validations/favorite.validation.js`

```
addFavoriteSchema = Joi.object({
    symbol: Joi.string().required().valid(...nifty_50_symbols),
    notes:  Joi.string().max(500).allow('', null)
})
```

---

## 16. Paper Trading Module

**File:** `src/services/paper_trading/paper_trade.service.js`

### Overview

Paper trading tracks simulated trades without real money to validate the system's live performance before committing capital. It runs in parallel with real signal generation -- it does not modify or affect any existing pipeline logic. Every generated signal automatically creates a corresponding paper trade.

### Auto-Creation (Pipeline Step 8.5)

```
FUNCTION createPaperTrades(final_signals)
    FOR each signal in final_signals:
        // Non-executable signals (e.g. SHORT in equity-only account) must not
        // create paper trades — phantom wins would corrupt calibration data
        IF NOT signal.is_executable
            LOG info: "Paper trade skipped for {symbol}: execution_type={execution_type}"
            CONTINUE

        next_candle = findNextCandle(signal.symbol, signal.date)
        actual_entry = next_candle ? next_candle.open : NULL

        INSERT INTO paper_trades (signal_id, symbol, direction, execution_type,
            entry_date, entry_price, actual_entry_price, stop_loss, target_price,
            shares_to_buy, status)
        VALUES (signal.id, signal.symbol, signal.direction, signal.execution_type,
            signal.date, signal.entry_price, actual_entry, signal.stop_loss,
            signal.target_price, signal.shares_to_buy, 'OPEN')
    LOG info: "{count} paper trades created"
```

`actual_entry_price` is the next-day open, populated at creation if data is available. If the signal is created intraday before market close, it will be NULL and populated on the next `updatePaperTrades()` run.

### Daily Status Update (Pipeline Step 9.5)

Runs alongside `updateSignalStatuses()`:

```
FUNCTION updatePaperTrades()
    open_trades = SELECT * FROM paper_trades WHERE status = 'OPEN'

    FOR each trade in open_trades:
        today_candle = FETCH latest candle for trade.symbol
        holding_days = DATEDIFF(TODAY, trade.entry_date)

        // Same SL-priority conservative assumption as signal lifecycle (Section 13)
        // Look up signal direction for this trade
        signal = FETCH signal WHERE id = trade.signal_id

        // For LONG trades:
        IF signal.direction == 'LONG'
            IF today_candle.low <= trade.stop_loss
                exit_price  = trade.stop_loss
                exit_reason = 'SL_HIT'
            ELSE IF today_candle.high >= trade.target_price
                exit_price  = trade.target_price
                exit_reason = 'TARGET_HIT'
            ELSE IF holding_days >= HOLDING_PERIOD_DAYS
                exit_price  = today_candle.close
                exit_reason = 'EXPIRED'
            ELSE
                CONTINUE    // still open

        // For SHORT trades (check signal direction):
        ELSE IF signal.direction == 'SHORT'
            IF today_candle.high >= trade.stop_loss
                exit_price  = trade.stop_loss
                exit_reason = 'SL_HIT'
            ELSE IF today_candle.low <= trade.target_price
                exit_price  = trade.target_price
                exit_reason = 'TARGET_HIT'
            ELSE IF holding_days >= HOLDING_PERIOD_DAYS
                exit_price  = today_candle.close
                exit_reason = 'EXPIRED'
            ELSE
                CONTINUE    // still open

        // Populate actual_entry_price from next-day open if not yet set
        IF trade.actual_entry_price IS NULL
            next_candle = findNextCandle(trade.symbol, trade.entry_date)
            IF next_candle exists
                trade.actual_entry_price = next_candle.open
                UPDATE paper_trades SET actual_entry_price = next_candle.open WHERE id = trade.id

        // Use actual_entry_price (next-day open) for PnL; fall back to entry_price
        entry_for_pnl = trade.actual_entry_price ?? trade.entry_price

        // Apply the same cost model as backtesting (Section 14) so paper
        // trade results are directly comparable to backtest results.
        // Both show net returns after slippage and brokerage.
        total_cost_pct  = SLIPPAGE_PCT + BROKERAGE_PCT              // default: 0.15%
        effective_entry = entry_for_pnl * (1 + total_cost_pct / 100)
        effective_exit  = exit_price * (1 - total_cost_pct / 100)
        pnl_pct = ((effective_exit - effective_entry) / effective_entry) * 100

        // Compute absolute rupee PnL
        IF signal.direction == 'LONG'
            gross_pnl_inr = trade.shares_to_buy * (exit_price - trade.entry_price)
        ELSE IF signal.direction == 'SHORT'
            gross_pnl_inr = trade.shares_to_buy * (trade.entry_price - exit_price)

        // Smart Expiry: apply opportunity cost penalty for negligible movement
        IF exit_reason == 'EXPIRED' AND ABS(pnl_pct) < EXPIRED_MOVEMENT_THRESHOLD (1.0%)
            movement_ratio = 1 - ABS(pnl_pct) / EXPIRED_MOVEMENT_THRESHOLD
            penalty = EXPIRED_MIN_PENALTY + (EXPIRED_MAX_PENALTY - EXPIRED_MIN_PENALTY) * movement_ratio
            pnl_pct = pnl_pct + penalty    // penalty is negative (-0.1 to -0.2)
            exit_reason = 'EXPIRED_PENALIZED'
            LOG info: "penalty applied: {penalty}%"

        UPDATE paper_trades SET
            status = 'CLOSED',
            exit_date = TODAY,
            exit_price = exit_price,
            exit_reason = exit_reason,
            pnl_pct = pnl_pct,
            gross_pnl_inr = gross_pnl_inr
        WHERE id = trade.id

    LOG info: "{closed_count} paper trades closed today"
```

### Summary Metrics

All PnL figures are **net returns** (after slippage and brokerage), matching the backtesting cost model. This ensures paper trading and backtesting results are directly comparable.

Computed at query time (not stored):

```
FUNCTION getPaperTradingSummary()
    total_trades   = COUNT(*) FROM paper_trades
    open_trades    = COUNT(*) FROM paper_trades WHERE status = 'OPEN'
    closed_trades  = COUNT(*) FROM paper_trades WHERE status = 'CLOSED'
    wins           = COUNT(*) WHERE status = 'CLOSED' AND pnl_pct > 0
    losses         = COUNT(*) WHERE status = 'CLOSED' AND pnl_pct <= 0
    win_rate_pct   = (wins / closed_trades) * 100
    avg_pnl_pct    = AVG(pnl_pct) WHERE status = 'CLOSED'
    total_pnl_pct  = SUM(pnl_pct) WHERE status = 'CLOSED'

    // Max drawdown: largest peak-to-trough in cumulative PnL
    // computed by ordering closed trades by exit_date and tracking running sum
    max_drawdown_pct = COMPUTE from cumulative pnl_pct series

    RETURN { total_trades, open_trades, closed_trades, win_rate_pct,
             avg_pnl_pct, total_pnl_pct, max_drawdown_pct }
```

### Difference from Backtesting

| Aspect | Backtesting (Section 14) | Paper Trading |
|--------|-------------------------|---------------|
| Data | Historical (past) | Live (forward) |
| Purpose | Validate strategy logic retroactively | Validate system performance in real-time |
| Timing | Run on-demand | Runs automatically every day |
| Outcome evaluation | Instant (future candles available) | Resolved over days as candles arrive |

Paper trading proves the system works in live conditions. Backtesting proves the strategy logic is sound historically. Both are needed.

---

## 17. API Contracts

Base URL: `/api/v1`

All responses follow this envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": "Descriptive error message"
}
```

### 17.1 GET /api/v1/health

**Description:** Health check and pipeline status.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "db": "connected",
    "uptime": 86400,
    "last_pipeline_run": "2026-03-23T16:45:00.000Z",
    "active_signals_count": 7,
    "weekly_signal_count": 4,
    "market_regime": "BULLISH"
  }
}
```

`weekly_signal_count` — number of signals created in the current ISO week. `market_regime` — live regime from `checkMarketRegime()` (fail-open, null if unavailable).

---

### 17.2 GET /api/v1/signals

**Description:** List trading signals with optional filters.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter: ACTIVE, TARGET_HIT, SL_HIT, EXPIRED |
| min_confidence | number | 0 | Minimum confidence score |
| symbol | string | - | Filter by specific symbol |
| from_date | string (YYYY-MM-DD) | - | Start date |
| to_date | string (YYYY-MM-DD) | - | End date |
| favorites_only | boolean | false | Only return signals for favorited stocks (requires X-User-Id header) |
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |
| sort_by | string | date | Sort field: date, confidence, symbol |
| sort_order | string | desc | asc or desc |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": 142,
        "symbol": "RELIANCE.NS",
        "date": "2026-03-23",
        "signal_type": "BUY",
        "confidence": 78.00,
        "entry_price": 2450.00,
        "stop_loss": 2380.00,
        "target_price": 2600.00,
        "risk_reward": 2.14,
        "reasons": ["Trend Alignment", "Volume Spike"],
        "status": "ACTIVE",
        "strategy_source": "TREND_PULLBACK+BREAKOUT",
        "is_favorite": true,
        "created_at": "2026-03-23T16:45:00.000Z",
        "explanation": ["Stock is in an uptrend...", "RSI in pullback zone..."],
        "confidence_breakdown": { "technical": 50, "momentum": 20, "volume": 20, "quality": 0 }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

---

### 17.3 GET /api/v1/signals/active

**Description:** Shortcut to get all currently active signals.

**Response 200:** Same shape as `/signals` but pre-filtered to `status = ACTIVE`. Includes sector of each stock.

---

### 17.4 GET /api/v1/stock/:symbol

**Description:** Latest data snapshot for a single stock.

**Path Params:** `symbol` -- e.g., `RELIANCE.NS`

**Headers (optional):** `X-User-Id` -- if present, response includes `is_favorite` field.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE.NS",
    "sector": "Conglomerate",
    "is_favorite": false,
    "latest_candle": {
      "date": "2026-03-23",
      "open": 2445.00,
      "high": 2470.00,
      "low": 2430.00,
      "close": 2450.00,
      "adjusted_close": 2450.00,
      "volume": 8500000
    },
    "indicators": {
      "ema_20": 2420.50,
      "ema_50": 2380.00,
      "ema_200": 2250.00,
      "rsi": 42.30,
      "macd_line": 15.20,
      "macd_signal": 12.80,
      "macd_histogram": 2.40,
      "atr": 45.60,
      "volume_change": 0.35
    },
    "features": {
      "is_uptrend": true,
      "rsi_zone": "PULLBACK",
      "is_volume_spike": false,
      "is_breakout": false,
      "near_support": true,
      "is_liquid": true,
      "distance_from_52w_high_pct": 8.50,
      "relative_strength_vs_nifty": 0.02
    },
    "active_signal": null
  }
}
```

---

### 17.5 GET /api/v1/history/:symbol

**Description:** Historical candle data for charting.

**Path Params:** `symbol` -- e.g., `RELIANCE.NS`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| from_date | string (YYYY-MM-DD) | 6 months ago | Start date |
| to_date | string (YYYY-MM-DD) | today | End date |
| include_indicators | boolean | false | Include indicator values |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE.NS",
    "candles": [
      {
        "date": "2026-03-20",
        "open": 2430.00,
        "high": 2455.00,
        "low": 2420.00,
        "close": 2445.00,
        "adjusted_close": 2445.00,
        "volume": 7200000,
        "indicators": {
          "ema_20": 2418.00,
          "rsi": 44.10
        }
      }
    ],
    "total": 125
  }
}
```

---

### 17.6 GET /api/v1/backtest/results

**Description:** Backtest performance metrics.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| strategy | string | all | Filter: TREND_PULLBACK, BREAKOUT, COMBINED, ALL |
| latest | boolean | true | Only latest run per strategy |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "strategy_name": "TREND_PULLBACK",
        "run_date": "2026-03-23",
        "test_period": "2025-07 to 2025-12",
        "total_signals": 120,
        "wins": 72,
        "losses": 35,
        "neutral": 13,
        "win_rate_pct": 60.00,
        "avg_return_pct": 2.45,
        "max_drawdown_pct": -8.20,
        "sharpe_ratio": 1.35,
        "profit_factor": 1.82,
        "avg_holding_days": 6.30
      }
    ]
  }
}
```

---

### 17.7 Favorites Endpoints

#### POST /api/v1/favorites

**Description:** Add a stock to favorites.

**Headers:** `X-User-Id` (required)

**Request Body:**

```json
{
  "symbol": "RELIANCE.NS",
  "notes": "Watching for breakout above 2500"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": 12,
    "user_identifier": "uuid-abc-123",
    "symbol": "RELIANCE.NS",
    "notes": "Watching for breakout above 2500",
    "created_at": "2026-03-23T10:30:00.000Z"
  }
}
```

**Error 409 (duplicate):**

```json
{
  "success": false,
  "data": null,
  "error": "RELIANCE.NS is already in your favorites"
}
```

---

#### DELETE /api/v1/favorites/:symbol

**Description:** Remove a stock from favorites.

**Headers:** `X-User-Id` (required)

**Response 200:**

```json
{
  "success": true,
  "data": { "removed": true, "symbol": "RELIANCE.NS" }
}
```

---

#### GET /api/v1/favorites

**Description:** List all favorite stocks with latest signal status.

**Headers:** `X-User-Id` (required)

**`latest_price.change_pct` calculation:** This field is computed at query time by fetching the two most recent candles for the symbol and calculating `((today_close - prev_close) / prev_close) * 100`. It is not stored in any table. The `listFavorites` query (Section 15) performs this via lateral subqueries on the `candles` table. If fewer than 2 candles exist for a symbol, `change_pct` returns `null`.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "symbol": "RELIANCE.NS",
        "sector": "Conglomerate",
        "notes": "Watching for breakout above 2500",
        "created_at": "2026-03-23T10:30:00.000Z",
        "latest_signal": {
          "signal_type": "BUY",
          "confidence": 78.00,
          "status": "ACTIVE",
          "date": "2026-03-23"
        },
        "latest_price": {
          "close": 2450.00,
          "change_pct": 1.20
        }
      },
      {
        "symbol": "INFY.NS",
        "sector": "IT",
        "notes": null,
        "created_at": "2026-03-22T14:00:00.000Z",
        "latest_signal": null,
        "latest_price": {
          "close": 1580.00,
          "change_pct": -0.45
        }
      }
    ],
    "total": 2
  }
}
```

---

### 17.8 Paper Trading Endpoints

#### GET /api/v1/paper-trading/summary

**Description:** Aggregated performance metrics for all paper trades.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "total_trades": 47,
    "open_trades": 8,
    "closed_trades": 39,
    "win_rate_pct": 61.54,
    "avg_pnl_pct": 2.80,
    "total_pnl_pct": 109.20,
    "max_drawdown_pct": -11.40
  }
}
```

---

#### GET /api/v1/paper-trading/trades

**Description:** List individual paper trades.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | all | Filter: OPEN, CLOSED |
| symbol | string | - | Filter by symbol |
| page | number | 1 | Page number |
| limit | number | 20 | Results per page (max 100) |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": 23,
        "signal_id": 142,
        "symbol": "RELIANCE.NS",
        "entry_date": "2026-03-20",
        "entry_price": 2450.00,
        "stop_loss": 2380.00,
        "target_price": 2600.00,
        "exit_date": "2026-03-23",
        "exit_price": 2600.00,
        "exit_reason": "TARGET_HIT",
        "pnl_pct": 6.12,
        "status": "CLOSED"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 47,
      "total_pages": 3
    }
  }
}
```

---

### 17.9 Authentication (MVP)

All endpoints (except `/health`) require an `X-API-Key` header:

```
X-API-Key: <value matching API_KEY in .env>
```

**Middleware:** `src/middlewares/auth.middleware.js`

```
FUNCTION authMiddleware(req, res, next)
    api_key = req.headers['x-api-key']
    IF api_key != process.env.API_KEY
        RETURN 401 { success: false, error: "Unauthorized" }
    next()
```

For favorites endpoints, an additional `X-User-Id` header is required:

```
FUNCTION userIdMiddleware(req, res, next)
    user_id = req.headers['x-user-id']
    IF !user_id OR user_id.length > 64
        RETURN 400 { success: false, error: "X-User-Id header is required" }
    req.user_identifier = user_id
    next()
```

### 17.10 Rate Limiting

```
Global:     100 requests per minute per IP
Per-route:  GET /history/:symbol -- 30 requests per minute (heavier query)
```

**Future: Admin Pipeline Trigger**

If a manual pipeline trigger endpoint is added (e.g., `POST /api/v1/admin/run-pipeline`), it must be:
- Protected by API key auth (same as all other endpoints).
- Rate-limited to **1 request per 10 minutes** to prevent accidental or malicious re-triggering that could hammer Yahoo Finance and cause rate-limit bans.
- Gated by a check: if a pipeline is already running, return `409 Conflict` with message "Pipeline already in progress".

---

### 17.11 GET /api/v1/signals/rejected

**Description:** Retrieve rejected signal candidates from the latest pipeline run, optionally filtered by date.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string (YYYY-MM-DD) | today | Filter by pipeline date |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "rejected": [
      {
        "id": 1,
        "symbol": "TATASTEEL.NS",
        "date": "2026-03-23",
        "strategy_source": "BREAKOUT",
        "reject_stage": "CONFIDENCE_GATE",
        "reject_reason": "Confidence 50.00 below threshold 70",
        "raw_confidence": 50.00,
        "raw_rr": 2.30,
        "created_at": "2026-03-23T16:45:00.000Z"
      }
    ]
  }
}
```

---

### 17.12 GET /api/v1/signals/funnel

**Description:** Gate funnel audit — shows how many signals entered each pipeline gate and how many were rejected, with pass rates and over-strict warnings.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string (YYYY-MM-DD) | today | Filter by pipeline date |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "date": "2026-03-24",
    "total_candidates": 15,
    "final_signals": 3,
    "overall_conversion_pct": 20.0,
    "funnel": [
      {
        "gate": "CONFIDENCE_GATE",
        "input": 15,
        "rejected": 5,
        "passed": 10,
        "pass_rate_pct": 66.7
      },
      {
        "gate": "RR_GATE",
        "input": 10,
        "rejected": 4,
        "passed": 6,
        "pass_rate_pct": 60.0
      }
    ],
    "warnings": ["VWAP_FILTER pass rate below 40% — consider widening threshold"]
  }
}
```

**Key decisions:**
- `total_candidates` = distinct rejected symbols + final signals (approximation of pipeline input).
- `warnings` flags gates where pass rate drops below 40% with at least 5 inputs — suggests the threshold may be over-strict.
- Gates are ordered by pipeline position (FUNDAMENTAL_FILTER through POSITION_SIZING).

---

### 17.13 GET /api/v1/signals/rejected/distribution

**Description:** Aggregate rejection statistics over a configurable period. Complements the per-date funnel endpoint with a period-based view.

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period_days` | number | 30 | Number of days to look back (1–365) |

**Response:**

```json
{
  "success": true,
  "data": {
    "period_days": 30,
    "total_rejected": 312,
    "by_stage": [{ "reject_stage": "VWAP_FILTER", "count": 140, "pct": 44.9 }],
    "by_symbol": [{ "symbol": "RELIANCE.NS", "count": 12 }],
    "avg_raw_confidence_at_rejection": 61.4,
    "avg_raw_rr_at_rejection": 1.3
  }
}
```

---

### 17.14 GET /api/v1/signals/calibration

**Description:** Returns the latest confidence calibration data — mapping confidence score buckets to actual historical win rates.

**Response:**

```json
{
  "success": true,
  "data": {
    "buckets": [
      { "confidence_bucket": 70, "total_signals": 45, "actual_win_rate": 42.50, "computed_at": "2026-03-23" },
      { "confidence_bucket": 75, "total_signals": 38, "actual_win_rate": 51.20, "computed_at": "2026-03-23" }
    ]
  }
}
```

---

### 17.15 Trade Decision Endpoints

#### POST /api/v1/signals/:id/decision

**Description:** Record or update the trader's decision on a specific signal.

**Headers:** `X-User-Id` (required)

**Request Body:**

```json
{
  "decision": "TAKEN",
  "notes": "Good setup, taking at market open",
  "actual_entry": 2455.00,
  "actual_qty": 25
}
```

**Validation:** `decision` must be one of `TAKEN`, `SKIPPED`, `MODIFIED`. `notes` is optional (max 2000 chars). `actual_entry` and `actual_qty` are optional numbers.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "signal_id": 142,
    "user_identifier": "uuid-abc-123",
    "decision": "TAKEN",
    "notes": "Good setup, taking at market open",
    "actual_entry": 2455.00,
    "actual_qty": 25,
    "decided_at": "2026-03-23T10:30:00.000Z"
  }
}
```

---

#### GET /api/v1/signals/:id/decision

**Description:** Retrieve the trader's decision for a specific signal.

**Headers:** `X-User-Id` (required)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "signal_id": 142,
    "user_identifier": "uuid-abc-123",
    "decision": "TAKEN",
    "notes": "Good setup, taking at market open",
    "actual_entry": 2455.00,
    "actual_qty": 25,
    "decided_at": "2026-03-23T10:30:00.000Z"
  }
}
```

Returns `null` data if no decision exists for this signal + user.

---

#### GET /api/v1/decisions

**Description:** Retrieve the trader's decision history.

**Headers:** `X-User-Id` (required)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 50 | Maximum results to return |

**Response 200:**

```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "signal_id": 142,
        "decision": "TAKEN",
        "notes": "Good setup",
        "actual_entry": 2455.00,
        "actual_qty": 25,
        "decided_at": "2026-03-23T10:30:00.000Z",
        "symbol": "RELIANCE.NS",
        "signal_type": "BUY",
        "confidence": 78.00,
        "status": "ACTIVE"
      }
    ]
  }
}
```

### 17.13 GET /api/v1/strategies

**Description:** Returns the current enable/disable state of all strategies.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "strategies": [
      {
        "id": 1,
        "strategy_name": "TREND_PULLBACK",
        "is_enabled": 1,
        "disabled_at": null,
        "disabled_reason": null,
        "updated_at": "2026-03-24T16:00:00.000Z"
      },
      {
        "id": 2,
        "strategy_name": "BREAKOUT",
        "is_enabled": 0,
        "disabled_at": "2026-03-20T02:00:00.000Z",
        "disabled_reason": "Win rate 35.0% (7/20) below 40% threshold",
        "updated_at": "2026-03-20T02:00:00.000Z"
      }
    ]
  }
}
```

---

## 18. Scheduler and Pipeline Orchestration

**File:** `src/jobs/daily_pipeline.job.js`

### Cron Schedule

```
CRON_SCHEDULE = "30 16 * * 1-5"    // 4:30 PM IST, Monday to Friday
CRON_TIMEZONE = "Asia/Kolkata"
```

**CRITICAL:** `node-cron` uses the server's local timezone by default. Most cloud servers run in UTC, where "16:30" would fire at 10:00 PM IST -- completely wrong. The cron job MUST be initialized with an explicit timezone:

```javascript
cron.schedule(CRON_SCHEDULE, runDailyPipeline, {
    timezone: "Asia/Kolkata"
});
```

The `CRON_TIMEZONE` env var is added to `.env.example` so deployments can override if needed. The default must always be `Asia/Kolkata`.

Indian markets close at 3:30 PM IST. The 1-hour buffer allows Yahoo to update EOD data.

### Pipeline Sequence (13 Steps)

```
FUNCTION runDailyPipeline()
    pipeline_start = NOW()
    LOG info: "Daily pipeline started (13 steps)"

    TRY:
        // ── DATA LAYER ──

        // Step 1: Fetch Candles (with Yahoo API probe)
        LOG info: "Step 1/13: Fetching candles"
        yahoo_available = probeYahooApi()   // uses /v8/finance/spark (lightweight)
        IF NOT yahoo_available
            LOG warn: "Yahoo API unreachable or rate-limited — skipping live fetch, using existing data"
        ELSE
            all_symbols = [...nifty_50_symbols, nifty_index_symbol, india_vix_symbol]
            FOR each symbol in all_symbols:
                fetchAndStoreCandles(symbol)
            LOG info: "Step 1 complete: {count} candles upserted"

        // Step 1b: Fetch NSE Bhavcopy for delivery percentage (fail-open)
        TRY:
            bhavcopy_candles = fetchBhavcopy(today)
            IF bhavcopy_candles.length > 0
                // Enriches candles with delivery_pct from NSE CSV
                LOG info: "Step 1b: Bhavcopy enriched {count} candles with delivery data"
        CATCH:
            LOG warn: "Step 1b: Bhavcopy fetch skipped — {error}"

        // Step 1c: Fetch NIFTY PCR from NSE option chain (fail-open)
        nifty_pcr = null
        TRY:
            nifty_pcr = fetchPCR('NIFTY')
        CATCH:
            LOG warn: "Step 1c: PCR fetch skipped — {error}"

        // Determine reference date (latest candle date, may differ from today)
        data_date = formatDate(candleModel.findLatestBySymbol(nifty_50_symbols[0]).date)
        IF data_date != today
            LOG info: "Using latest data date: {data_date} (today: {today})"
        // All downstream steps (strategies, scoring, signal generation) use data_date, not today

        // Step 2: Validate Data
        LOG info: "Step 2/13: Validating data completeness"
        validation_warnings = validateAllSymbols()
        IF validation_warnings.length > 0
            LOG warn: "{count} validation warnings"

        // ── DATA QUALITY LAYER ──

        // Step 2b: Check candle data source quality
        LOG info: "Step 2b/13: Checking candle data source quality"
        suspect_symbols = SET()
        quality = checkCandleSourceQuality(data_date)
        IF quality.quality == 'POOR'
            LOG warn: "Data quality POOR: {bhavcopy_count}/{total} from Bhavcopy"
            sendTelegramAlert("⚠️ Data quality POOR — EMA/RSI unreliable for {symbols}")
        IF quality.suspicious_gap_symbols.length > 0
            LOG warn: "Suspicious adjusted_close gap: {symbols}"
        suspect_symbols = quality.suspect_symbols
        // Suspect symbols are skipped in Steps 3, 4, and 7

        // ── COMPUTATION LAYER ──

        // Step 3: Compute Indicators (skip suspect symbols)
        LOG info: "Step 3/13: Computing indicators"
        FOR each symbol in [...nifty_50_symbols, nifty_index_symbol]:
            IF suspect_symbols.has(symbol)
                LOG warn: "Skipping indicators for {symbol} (suspect candle data)"
                CONTINUE
            calculateAndStoreIndicators(symbol)
        LOG info: "Step 3 complete"

        // Step 4: Extract Features (skip suspect symbols)
        LOG info: "Step 4/13: Extracting features (RVOL, VWAP, delivery, is_liquid, is_ranging, z_score_20d)"
        FOR each symbol in nifty_50_symbols:
            IF suspect_symbols.has(symbol)
                LOG warn: "Skipping features for {symbol} (suspect candle data)"
                CONTINUE
            calculateAndStoreFeatures(symbol)
        LOG info: "Step 4 complete"

        // Step 5: Compute Adaptive Thresholds
        LOG info: "Step 5/13: Computing adaptive thresholds"
        IF ADAPTIVE_THRESHOLDS_ENABLED
            computeAndStoreAdaptiveThresholds()
        LOG info: "Step 5 complete"

        // ── SIGNAL GENERATION LAYER ──

        // Step 6: Check Market Regime (returns: BULLISH / SIDEWAYS / BEARISH / HIGH_VOLATILITY)
        LOG info: "Step 6/13: Checking market regime (NIFTY EMA200 + India VIX)"
        regime = checkMarketRegime()
        LOG info: "Market regime: {regime}"
        IF regime == 'HIGH_VOLATILITY'
            LOG info: "Pipeline skipping to status updates: HIGH_VOLATILITY regime"
            GOTO Step 12   // skip signal generation entirely

        // Step 7: Run Strategies (4 long in BULLISH/SIDEWAYS + 2 short in BEARISH)
        // Skip suspect symbols (from Step 2b quality check)
        LOG info: "Step 7/13: Running strategies for regime={regime}"
        raw_signals = {}
        FOR each symbol in nifty_50_symbols:
            IF suspect_symbols.has(symbol)
                CONTINUE
            result = runStrategies(symbol, data_date, regime)
            IF result.length > 0
                raw_signals[symbol] = result
        LOG info: "Step 7 complete: {count} raw signals for {symbols_count} symbols"

        // Step 8: Apply Fundamental Filter
        LOG info: "Step 8/13: Applying fundamental filter"
        rejected_fundamental = 0
        FOR each [symbol, signals] in raw_signals:
            fundamentals = FETCH latest FROM fundamentals WHERE symbol
            IF fundamentals != NULL AND fundamentals.is_healthy = false
                DELETE symbol from raw_signals
                rejected_fundamental++
                LOG info: "Signal for {symbol} rejected: fundamental filter"
        LOG info: "Step 8 complete: {rejected_fundamental} rejected"

        // Step 9: Sentiment Filter (soft scoring — only STRONGLY_NEGATIVE hard-rejects)
        LOG info: "Step 9/13: Applying sentiment filter"
        { passed: post_sentiment, adjustments: sentiment_adjustments } = filterBySentiment(raw_signals)
        // STRONGLY_NEGATIVE (FinBERT < -0.6 or 3+ keyword matches): hard reject
        // NEGATIVE: passes through with -12 confidence penalty
        // POSITIVE (FinBERT > 0.3): +5 confidence bonus
        // NEUTRAL: no adjustment
        LOG info: "Step 9 complete"

        // Step 10: Score, Deduplicate, Position Size, and Generate Signals
        // Two-phase: build candidate pool, then apply frequency-controlled Top-N selection
        LOG info: "Step 10/13: Scoring, deduplicating, position sizing, and generating signals"

        // Phase 1: Build candidate pool (uses pool floor thresholds when frequency controller is enabled)
        candidates = []
        FOR each [symbol, signals] in post_sentiment:
            sent_adj = sentiment_adjustments[symbol] || 0
            candidate = buildCandidate(symbol, data_date, signals, candidates, nifty_pcr, sent_adj, vix_close)
            IF candidate != null
                candidates.PUSH(candidate)

        // Phase 2: Frequency-controlled selection
        IF FREQUENCY_CONTROLLER_ENABLED:
            weekly_count = signalModel.countByWeek(data_date)
            remaining = TARGET_WEEKLY_SIGNALS - weekly_count
            daily_limit = MIN(MAX_SIGNALS_PER_DAY, MAX(0, remaining))
            candidates.SORT BY confidence DESC, risk_reward DESC
            final_signals = candidates[0..daily_limit]
            Log remaining candidates to rejected_signals with stage FREQUENCY_CAP
        ELSE:
            final_signals = candidates
        LOG info: "Step 10 complete: {count} signals generated"

        // ── STORAGE LAYER ──

        // Step 11: Store Signals and Create Paper Trades
        LOG info: "Step 11/13: Storing signals + creating paper trades"
        FOR each signal in final_signals:
            INSERT INTO signals table
        createPaperTrades(final_signals)
        LOG info: "Step 11 complete: {count} signals stored, {count} paper trades created"

        // ── STATUS UPDATE LAYER ──

        // Step 12: Update Signal Statuses
        LOG info: "Step 12/13: Updating active signal statuses"
        updated = updateSignalStatuses()
        LOG info: "Step 12 complete: {updated} signals status-changed"

        // Step 13: Update Paper Trade Statuses
        LOG info: "Step 13/13: Updating open paper trades"
        paper_updated = updatePaperTrades()
        LOG info: "Step 13 complete: {paper_updated} paper trades closed"

        // ── DONE ──

        pipeline_duration = NOW() - pipeline_start
        LOG info: "Pipeline complete in {pipeline_duration}ms. " +
                  "Signals: {final_signals.length}, " +
                  "Rejected (fundamental): {rejected_fundamental}, " +
                  "Suppressed (sentiment): {rejected_sentiment}, " +
                  "Paper trades: {final_signals.length}"

        // Telegram notification on success (Improvement 7)
        sendTelegramAlert(
            "✅ TradeNeuron pipeline complete\n" +
            "Signals: {final_signals.length}, Regime: {regime}, Duration: {pipeline_duration}ms"
        )

        // Zero-signal warning
        IF final_signals.length == 0 AND regime != 'HIGH_VOLATILITY'
            sendTelegramAlert("⚠️ Pipeline ran but generated 0 signals. Regime: {regime}")

    CATCH error:
        LOG error: "Pipeline failed at step: {error.message}"
        sendTelegramAlert("❌ TradeNeuron pipeline FAILED: {error.message}")
        // Pipeline stops on failure -- no partial signal generation
```

**Regime-based skip logic:**
- **BULLISH:** All 4 long strategies fire (Trend Pullback, Breakout, Range, Mean Reversion). Proceed normally through Steps 7-11.
- **SIDEWAYS:** Only Range and Mean Reversion strategies fire in Step 7. Steps 8-11 proceed normally.
- **BEARISH:** Only short strategies fire (Trend Pullback SHORT, Breakdown SHORT) in Step 7. Steps 8-11 proceed normally.
- **HIGH_VOLATILITY:** Skip directly to Step 12. No signals generated.

**Step summary:**

| Step | Name | Layer |
|------|------|-------|
| 1 | Fetch Candles (Yahoo) | Data |
| 1b | Fetch NSE Bhavcopy (delivery %, fail-open) | Data |
| 1c | Fetch NIFTY PCR (NSE option chain, fail-open) | Data |
| 2 | Validate Data | Data |
| 2b | Check Candle Source Quality (Bhavcopy ratio, adjusted_close gaps) | Data Quality |
| 3 | Compute Indicators (skip suspect symbols) | Computation |
| 4 | Extract Features (skip suspect symbols) | Computation |
| 5 | Compute Adaptive Thresholds | Computation |
| 6 | Check Market Regime (BULLISH / SIDEWAYS / BEARISH / HIGH_VOLATILITY) | Signal Generation |
| 7 | Run Strategies (regime-dependent, skip suspect symbols) | Signal Generation |
| 8 | Apply Fundamental Filter | Signal Generation |
| 9 | Apply Sentiment Filter (FinBERT primary, keyword fallback, optional Finnhub) | Signal Generation |
| 10 | Score + Deduplicate + VWAP/PCR filters + Sector Gate + Position Sizing | Signal Generation |
| 11 | Store Signals + Paper Trades (non-executable signals skip paper trades) | Storage |
| 12 | Update Signal Statuses + Record Outcomes (non-executable skip outcomes) | Status Update |
| 13 | Update Paper Trade Statuses | Status Update |

### Weekly Fundamentals Job

**File:** `src/jobs/weekly_fundamentals.job.js`

Runs separately from the daily pipeline:

```javascript
cron.schedule(FUNDAMENTAL_CRON_SCHEDULE, refreshAllFundamentals, {
    timezone: "Asia/Kolkata"
});
// Default: "0 18 * * 6" = Saturday 6:00 PM IST
```

**Architecture: Python-first with Node.js fallback**

The Node.js Yahoo Finance API (`fetchQuoteSummary`) uses raw HTTP to Yahoo's undocumented endpoints, which are aggressively rate-limited (429). The Python `yfinance` library handles cookie/crumb authentication more robustly and is less prone to rate limiting. The job therefore uses a two-tier approach:

```
FUNCTION runWeeklyFundamentals()
    LOG info: "Starting weekly fundamental data refresh"

    TRY:
        LOG info: "Attempting Python yfinance script"
        stdout = SPAWN python3 scripts/refresh_fundamentals.py (timeout 10min)
        IF exit code 0:
            PARSE JSON summary from stdout
            LOG success counts
            RETURN
    CATCH:
        LOG warn: "Python script failed, falling back to Node.js"

    // Node.js fallback with 429-aware cooldowns
    consecutive_429s = 0
    FOR each symbol in nifty_50_symbols:
        TRY:
            data = fetchFundamentals(symbol)
            health = computeHealthFlag(data)
            UPSERT INTO fundamentals table
            consecutive_429s = 0
            WAIT 2000ms ± 500ms jitter

        CATCH error:
            IF error is HTTP 429:
                consecutive_429s++
                IF consecutive_429s >= 3:
                    LOG warn: "3 consecutive 429s — pausing 10 minutes"
                    WAIT 600000ms
                    consecutive_429s = 0
                ELSE:
                    WAIT 60000ms   // 60s cooldown per single 429
            ELSE:
                LOG error
                WAIT 2000ms

    LOG info: "Weekly fundamentals refresh complete"
```

**Python script:** `scripts/refresh_fundamentals.py`
- Uses `yfinance.Ticker(symbol).info` for fundamental data
- Reads DB credentials from `.env` via `python-dotenv`
- Upserts directly into the `fundamentals` table via `mysql-connector-python`
- 2-second throttle with jitter between symbols
- Outputs a `SUMMARY:{json}` line on stdout for the Node.js caller to parse
- Exits with code 1 if more than half the symbols fail

### Weekly Weight Calibration Job

**File:** `src/jobs/weekly_weight_calibration.job.js`

Runs every Sunday at 2:00 AM IST to recalibrate scoring weights from signal outcome history:

```javascript
cron.schedule('0 2 * * 0', calibrateWeights, {
    timezone: "Asia/Kolkata"
});
```

```
FUNCTION calibrateWeights()
    outcomes = QUERY signal_outcomes WHERE resolved_at >= 90 days ago
    IF outcomes.length < 30
        LOG info: "Insufficient outcomes ({count}/30) — skipping calibration"
        RETURN

    FOR each feature_key IN ['is_uptrend', 'rsi_zone=PULLBACK', 'volume_tier', 'is_breakout']:
        with_feature = outcomes where feature was active
        wins = with_feature where outcome = 'TARGET_HIT'
        win_rate = wins / with_feature.length
        adjusted_weight = BASE_WEIGHT * (0.5 + win_rate)

    UPSERT INTO adaptive_thresholds (symbol='_GLOBAL_')
        SET weight_trend, weight_rsi, weight_volume, weight_breakout
    LOG info: "Weights calibrated from {outcomes.length} outcomes"

    // Paper trade feedback loop — auto-disable underperforming strategies
    CALL evaluateStrategyPerformance()

    // Confidence calibration — display only, no auto-adjustment
    CALL calibrateConfidence()

FUNCTION calibrateConfidence()
    buckets = QUERY signal_outcomes
        GROUP BY FLOOR(raw_confidence / 5) * 5
        WHERE raw_confidence IS NOT NULL
    FOR each bucket:
        IF bucket.total < 20 → SKIP (insufficient data)
        win_rate = (wins / total) * 100
        UPSERT INTO confidence_calibration (bucket, total, win_rate, today)

FUNCTION evaluateStrategyPerformance()
    strategyStats = QUERY paper_trades JOIN signals
        WHERE pt.status = 'CLOSED' AND pt.exit_date >= 90 days ago
        GROUP BY strategy_source HAVING total >= 10

    FOR each strategy in strategyStats:
        win_rate = wins / total
        IF is_enabled AND win_rate < STRATEGY_DISABLE_WIN_RATE (0.40) AND total >= 15
            SET strategy_config.is_enabled = false, reason = "low win rate"
            SEND Telegram alert
        IF NOT is_enabled AND win_rate >= STRATEGY_REENABLE_WIN_RATE (0.50) AND total >= 20
            SET strategy_config.is_enabled = true
            SEND Telegram alert
```

### Cron Job Registry

**File:** `src/jobs/cron.js`

All scheduled jobs are registered in a single file:

| Schedule | Job | Description |
|----------|-----|-------------|
| `30 16 * * 1-5` | `runDailyPipeline()` | Daily pipeline (4:30 PM IST, Mon-Fri) |
| `0 18 * * 6` | `runWeeklyFundamentals()` | Weekly fundamentals refresh (Saturday 6 PM IST) |
| `0 2 * * 0` | `calibrateWeights()` | Weekly weight calibration (Sunday 2 AM IST) |

### Telegram Pipeline Alerts

**File:** `src/utils/notify.util.js`

Sends notifications via Telegram Bot API when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are configured in `.env`. Completely optional — if tokens are not set, the function is a no-op (fail-open).

| Event | Message |
|-------|---------|
| Pipeline success | Signal count, market regime, duration |
| Pipeline failure | Error message and failing step |
| Zero signals (non-volatile) | Warning when regime is not HIGH_VOLATILITY |
| HIGH_VOLATILITY early exit | Notification that pipeline skipped signal generation |
| Strategy auto-disabled | Strategy name, win rate, trade count |
| Strategy auto-re-enabled | Strategy name, win rate, trade count |

### SLA

The full pipeline (50 stocks + NIFTY index + India VIX, plus fundamental/sentiment checks) must complete within **7 minutes**. If any single symbol fetch exceeds 10 seconds, it is logged as a warning and skipped (the fallback will catch it). The sentiment RSS fetches add ~5-15 seconds total (only for symbols with raw signals, at 500ms each).

---

## 19. Error Handling, Logging, and Monitoring

### Error Classes

**File:** `src/utils/errors.js`

| Error Class | HTTP Status | Usage |
|-------------|-------------|-------|
| AppError (base) | 500 | Generic application error |
| DataFetchError | 502 | Yahoo/Bhavcopy/RSS fetch failure |
| ValidationError | 400 | Invalid request params or data |
| NotFoundError | 404 | Symbol or resource not found |
| AuthError | 401 | Missing or invalid API key |
| ConflictError | 409 | Duplicate favorite |
| FundamentalError | 502 | quoteSummary() fetch failure (non-blocking, fail-open) |

### Centralized Error Middleware

**File:** `src/middlewares/error_handler.middleware.js`

```
FUNCTION errorHandler(err, req, res, next)
    status = err.statusCode OR 500
    LOG error: {
        message: err.message,
        stack: err.stack (only in development),
        path: req.path,
        method: req.method
    }
    RETURN status {
        success: false,
        data: null,
        error: (NODE_ENV == 'production') ? 'Internal server error' : err.message
    }
```

### Logging Configuration

**Library:** winston

```
Format:     JSON
Levels:     error, warn, info, debug
Transports:
  - Console (all levels in development, info+ in production)
  - File: logs/error.log (error level only)
  - File: logs/combined.log (all levels)
  - File: logs/pipeline.log (pipeline-specific entries tagged with pipeline_run_id)

Rotation: daily, max 30 days retention, max 50MB per file
```

**Log entry structure:**

```json
{
  "timestamp": "2026-03-23T16:45:12.345Z",
  "level": "info",
  "message": "Step 3/13: Compute indicators",
  "service": "daily_pipeline",
  "pipeline_run_id": "run_20260323_1630",
  "meta": {
    "symbols_processed": 51,
    "duration_ms": 1234
  }
}
```

### Request Logging Middleware

**File:** `src/middlewares/logger.middleware.js`

Logs every API request with: method, path, status code, response time, user_identifier (if present).

### Monitoring (MVP)

- Pipeline completion is logged with total duration and signal count. A simple health endpoint (`GET /health`) can be polled by external uptime monitors.
- Future: webhook or email notification on pipeline failure.

---

## 20. Testing Strategy

### External Service Mocking

**Yahoo Finance:** The Yahoo service (which uses direct Axios calls) must be mocked in all tests. Live API calls in tests are forbidden -- they are slow (~300ms+ per symbol), flaky (rate limits, network errors), and non-deterministic (data changes daily).

**Approach:** Create fixture files in `tests/fixtures/` containing known OHLCV data for a small set of symbols (e.g., RELIANCE.NS, INFY.NS, SBIN.NS) covering various scenarios (splits, gaps, volume spikes). In tests, mock the yahoo service module to return fixture data:

```javascript
jest.mock('../src/services/data_ingestion/yahoo.service', () => ({
    fetchYahooCandles: async (symbol, start, end) => {
            return loadFixture(symbol, options.period1, options.period2);
        }
    }
}));
```

**NSE Bhavcopy:** Mock `axios.get` for bhavcopy download URLs, returning fixture CSV content.

**Google News RSS:** Mock `rss-parser` to return fixture RSS XML from `tests/fixtures/rss/`. Include fixtures with negative keywords and clean headlines.

**Yahoo quoteSummary():** Mock `fetchQuoteSummary` alongside `fetchYahooCandles` in the yahoo service mock. Fixture files in `tests/fixtures/fundamentals/` contain known D/E ratios, EPS growth, etc.

### Unit Tests

Located in `tests/unit/`. Run with `npm test`.

| Module | What to Test |
|--------|-------------|
| Indicator calculations | Verify EMA, RSI, MACD, ATR against known reference values (hand-calculated or from a trusted source like TradingView) |
| Feature extraction | Test each feature boolean with controlled indicator inputs; test `is_liquid` with volumes above/below threshold |
| Scoring logic | Test score calculation with various feature combinations; verify normalization caps at 100; verify weight-gate interaction (see Section 12 note) |
| Strategy conditions | Test entry/exit/discard logic with edge cases (RSI exactly at boundary, insufficient data, risk <= 0, SL >= entry in breakout) |
| Deduplication | Test merge logic with 1 signal, 2 signals, conflicting SL/targets, merged risk <= 0 |
| Fundamental filter | Test health flag computation with all 4 rejection criteria; test fail-open when data is missing; test edge values at exact thresholds |
| Sentiment scoring | Test keyword matching with positive, negative, and ambiguous headlines; test empty RSS feed; test fetch failure fallback to NEUTRAL; test negation-aware matching ("probe clears" → not negative, keyword without negation → negative); test Finnhub override when RSS flags NEGATIVE but Finnhub score > -0.2 |
| Favorites service | Test add, remove, duplicate handling, list with signal join (verify single row per symbol) |
| Paper trading | Test auto-creation from signal (including shares_to_buy field); test status update logic (SL/target/expired) for LONG and SHORT trades; test PnL calculation; test gross_pnl_inr calculation for LONG and SHORT; test same-candle SL+target conflict |
| Validation schemas | Test Joi schemas with valid and invalid inputs, including URL-encoded M&M.NS |
| Date utilities | Test trading day detection, IST conversion, date range generation, holiday calendar accuracy |
| Position sizing | Test shares_to_buy calculation with known capital/risk values; test max position cap enforcement; test SHORT position sizing at half limit (MAX_POSITION_PCT_SHORT) |
| Adaptive thresholds | Test percentile computation for VIX, volume, and RSI; test fallback to static env vars when fewer than ADAPTIVE_MIN_DATA_POINTS (30) data points exist |
| Range strategy | Test all 4 entry conditions (is_ranging, near_support, rsi_zone, NOT is_breakout); test when range breaks out mid-trade; test risk <= 0 discard |
| Mean Reversion strategy | Test z-score boundaries (z_score < -2.0); test only-in-uptrend guard; test volume spike exclusion; test risk <= 0 discard |
| SHORT strategies | Test SL/target inversion for Trend Pullback SHORT and Breakdown SHORT; test BEARISH-only gate (should not fire in BULLISH/SIDEWAYS); test risk <= 0 discard |
| SIDEWAYS regime detection | Test EMA convergence detection (nifty_range < 2.0 triggers SIDEWAYS); test transition from BULLISH to SIDEWAYS; verify only Range/MeanReversion strategies fire |

### Integration Tests

Located in `tests/integration/`. Run with `npm run test:integration`.

| Test | Description |
|------|-------------|
| Pipeline end-to-end (13 steps) | Seed a test database with fixture candles + fundamentals + sentiment, run full 13-step pipeline, verify signals generated match expected output and paper trades are created (including position sizing fields) |
| API endpoints | Use supertest to hit each endpoint (including paper trading), verify response shape, status codes, pagination, error cases |
| Fundamental filter pipeline | Seed unhealthy fundamentals for a symbol that would otherwise generate a signal, verify signal is rejected |
| Sentiment filter pipeline | Mock RSS to return negative headline for a symbol, verify signal is suppressed |
| Strategy auto-disable | Seed paper trades with low win rate for a strategy, run calibration, verify strategy is disabled in `strategy_config` |
| Favorites flow | Add -> list -> verify join with signals -> remove -> verify removed |
| Data validation | Insert candles with known gaps, verify validation service detects them |
| Market regime | Test pipeline with NIFTY below EMA200 (BEARISH, only short strategies fire); test India VIX above threshold (HIGH_VOLATILITY, no signals); test SIDEWAYS regime (EMA convergence, only Range/MeanReversion fire) |

### Backtest Regression

After any code change to strategies or scoring, re-run backtests and compare metrics against a stored baseline. If win rate drops more than 5 percentage points, the test fails.

### Running Tests

```bash
npm test                    # Unit tests
npm run test:integration    # Integration tests (requires test DB)
npm run test:coverage       # Coverage report
```

Target: 80%+ line coverage for services and utils.

---

## 21. NPM Scripts Reference

All available scripts in `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `concurrently ... nodemon + sentiment_server.py` | Start Node.js (with hot reload) and FinBERT server in parallel. FinBERT crash does not kill Node.js. |
| `dev:node` | `nodemon server.js` | Start only the Node.js server with hot reload (no FinBERT). |
| `dev:finbert` | `python3 scripts/sentiment_server.py` | Start only the FinBERT sentiment server on port 8765. |
| `start` | `node server.js` | Start Node.js server without hot reload (production). |
| `migrate` | `node scripts/migrate.js` | Run pending database migrations. |
| `download` | `python3 scripts/download_yahoo_data.py` | Download 3 years of Yahoo Finance OHLCV data. |
| `fundamentals` | `python3 scripts/refresh_fundamentals.py` | Refresh fundamental data for all 50 symbols via yfinance. |
| `seed` | `node scripts/seed_historical.js` | Seed downloaded data into MySQL. |
| `pipeline` | `node scripts/run_pipeline.js` | Run the daily pipeline manually. |
| `backtest` | `node scripts/run_backtest.js` | Run the backtesting engine. |
| `test` | `jest` | Run unit tests. |
| `test:integration` | `jest (integration config)` | Run integration tests (requires test DB). |
| `test:coverage` | `jest --coverage` | Generate coverage report. |

The `dev` script uses `concurrently` (a runtime dependency) with colour-coded output: `[node]` in cyan, `[finbert]` in magenta. If the FinBERT process exits (e.g. missing Python deps), the Node.js server continues running and falls back to keyword-based sentiment.

---

## 22. Deployment Scripts

### `backend/deploy.sh`

Production-ready deployment script for the backend. Runs 7 steps:

```
Step 1: Check .env file exists (copies .env.example if missing)
Step 2: Install Node dependencies (npm install --omit=dev)
Step 3: Check Python dependencies — if all present, skips install;
        otherwise runs pip3 install --user --break-system-packages
Step 4: Run database migrations (node scripts/migrate.js)
Step 5: Check and free port 3000 (Node.js API)
Step 6: Check and free port 8765 (FinBERT API)
Step 7: Start both services via concurrently
```

If FinBERT crashes or Python is unavailable, the Node.js server continues running. The backend falls back to keyword-based sentiment automatically.

### Root `deploy.sh`

Full-stack deployment script at the project root. Supports two modes:

**`./deploy.sh dev` (default):**
1. Installs backend Node + Python deps, runs migrations
2. Starts Node.js server and FinBERT server in background
3. Waits for backend health check
4. Installs frontend deps, starts Vite dev server
5. Ctrl+C cleanly shuts down all processes via `trap`

**`./deploy.sh prod`:**
1. Builds frontend (`npm run build` → `dist/`)
2. Installs backend deps, runs migrations
3. Starts Node.js + FinBERT via `concurrently`
4. Frontend `dist/` should be served by nginx or similar
