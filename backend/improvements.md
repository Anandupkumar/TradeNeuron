# TradeNeuron — Improvement Roadmap

> All third-party tools and libraries listed here are **free and open source**.
> No paid APIs or subscriptions required.

---

## Improvement 1 — NSE Delivery Percentage Data (Data Quality Upgrade)

### What to change
Extend the data ingestion pipeline (Step 1) to pull **delivery percentage** from NSE's official Bhavcopy/CM data alongside OHLCV. NSE publishes this daily for free at `https://archives.nseindia.com/products/content/sec_bhavdata_full_{DDMMYYYY}.csv`.

### Why it matters
Delivery percentage tells you how much of a day's volume resulted in actual delivery (genuine buying) vs. intraday speculation. A breakout with 70%+ delivery is far more reliable than one with 15% delivery. This is one of the strongest confirmation filters for NIFTY 50 swing trades and is completely ignored by most retail tools.

### Where to implement
- `src/services/data_ingestion/bhavcopy.service.js` — extend the existing Bhavcopy parser to extract `DELIV_PER` column
- `src/models/candle.model.js` — add `delivery_pct DECIMAL(5,2)` column
- `migrations/` — add a new migration file `018_add_delivery_pct_to_candles.sql`
- `src/services/features/feature.service.js` — add `is_high_delivery` boolean feature (threshold: delivery_pct > 50)

### Migration SQL
```sql
ALTER TABLE candles ADD COLUMN delivery_pct DECIMAL(5,2) DEFAULT NULL;
```

### Feature addition (feature.service.js)
```javascript
const is_high_delivery = (candle.delivery_pct !== null)
  ? candle.delivery_pct > 50
  : true; // fail-open if data unavailable
```

### Signal scoring impact
In `src/services/scoring/scoring.service.js`, add `is_high_delivery` as a weight factor for Breakout and Breakdown strategies (weight: 10 points). This rewards confirmed volume signals.

### Effort estimate
Medium — 1 to 2 days. The Bhavcopy fetch infrastructure already exists; this is an extension.

---

## Improvement 2 — NSE F&O Put-Call Ratio Filter (Options Market Signal)

### What to change
Add an optional F&O sentiment check using NSE's free option chain data. Compute the **Put-Call Ratio (PCR)** for each stock with an active bullish signal. A very high PCR (> 1.5) on a bullish signal is a contra-indicator.

### Why it matters
PCR is a widely used contrarian/confirmation gauge. For NIFTY 50 stocks with active derivatives, options positioning often reflects institutional views. A bullish breakout where the options market is aggressively buying puts suggests the smart money disagrees.

### Where to implement
- New file: `src/services/data_ingestion/fno.service.js` — fetch and parse NSE F&O option chain
- New file: `src/services/features/pcr.service.js` — compute PCR per symbol
- `src/jobs/daily_pipeline.job.js` — add PCR fetch as an optional Step 1b (fail-open if NSE is unavailable)
- `src/services/signals/signal.service.js` — add PCR gate: suppress bullish signals where PCR > 1.5

### Data source
NSE's JSON option chain endpoint (no auth required in principle, but requires session cookies):
`https://www.nseindia.com/api/option-chain-equities?symbol=RELIANCE`

Use `axios` with a cookie jar (`axios-cookiejar-support` + `tough-cookie` — both free npm packages) to handle the session. Fetch `https://www.nseindia.com` first to get cookies, then hit the API endpoint.

### PCR calculation
```javascript
// pcr.service.js
function computePCR(optionChainData) {
  const totalPutOI = optionChainData.records.data
    .reduce((sum, row) => sum + (row.PE?.openInterest || 0), 0);
  const totalCallOI = optionChainData.records.data
    .reduce((sum, row) => sum + (row.CE?.openInterest || 0), 0);
  return totalCallOI > 0 ? totalPutOI / totalCallOI : null;
}
```

### Effort estimate
Medium-high — 2 to 3 days. NSE's session handling is the tricky part.

---

## Improvement 3 — FinBERT Sentiment Analysis (Better NLP)

### What to change
Replace the current keyword-based sentiment scoring (`src/services/sentiment/sentiment.service.js`) with **FinBERT**, a pre-trained BERT model fine-tuned on financial text. FinBERT is free and open source on HuggingFace: `ProsusAI/finbert`.

### Why it matters
Keyword matching fails on financial language because of negation ("probe clears"), context ("merger talks collapse — stock rallies"), and domain-specific phrasing. FinBERT was trained specifically on financial news and earnings calls. It understands financial context natively and returns positive/negative/neutral with a confidence score.

### How to integrate (Python microservice approach)
Since your backend is Node.js and FinBERT runs in Python, the cleanest approach is a **local Python FastAPI microservice** that your Node.js backend calls over HTTP.

**1. Create `scripts/sentiment_server.py`:**
```python
from fastapi import FastAPI
from transformers import pipeline
import uvicorn

app = FastAPI()
sentiment_pipeline = pipeline(
    "text-classification",
    model="ProsusAI/finbert",
    tokenizer="ProsusAI/finbert"
)

@app.post("/sentiment")
def analyze(payload: dict):
    headlines = payload.get("headlines", [])
    if not headlines:
        return {"label": "neutral", "score": 0.0}
    results = sentiment_pipeline(headlines, truncation=True, max_length=512)
    # Aggregate: if any headline is negative with score > 0.7, return negative
    for r in results:
        if r["label"] == "negative" and r["score"] > 0.7:
            return {"label": "negative", "score": r["score"]}
    return {"label": "neutral", "score": 0.0}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765)
```

**2. Install dependencies:**
```bash
pip install fastapi uvicorn transformers torch
# First run downloads the model (~500MB, cached after that)
```

**3. Update `src/services/sentiment/sentiment.service.js`:**
```javascript
async function analyzeSentiment(headlines) {
  try {
    const res = await axios.post('http://127.0.0.1:8765/sentiment', { headlines });
    return res.data.label; // 'positive' | 'negative' | 'neutral'
  } catch (err) {
    logger.warn('FinBERT service unavailable, falling back to keyword sentiment');
    return keywordFallback(headlines); // keep existing logic as fallback
  }
}
```

**4. Start the microservice alongside the Node.js backend** (add to your startup script or `pm2` config).

### Effort estimate
Medium — 1 to 2 days. Model download is one-time. Keep keyword matching as a fallback so the pipeline never breaks if the Python service is down.

---

## Improvement 4 — Dynamic Confidence Score Weights (Adaptive Scoring)

### What to change
Add a feedback loop to `src/services/scoring/scoring.service.js`. After each signal resolves as `TARGET_HIT` or `SL_HIT`, record which features were active on that signal and update the feature weights accordingly. Store weights in the `adaptive_thresholds` table (already exists).

### Why it matters
The current scoring weights are static constants defined at build time. Market behavior shifts — a feature like `is_breakout` may be strongly predictive in trending markets but noise in ranging ones. A feedback loop makes the scoring engine self-calibrating over time.

### Implementation plan

**Step 1 — Record resolved signal features**

In `src/jobs/daily_pipeline.job.js` Step 12 (Update Statuses), when marking a signal as `TARGET_HIT` or `SL_HIT`, fetch the feature snapshot for that signal date and insert a record into a new `signal_outcomes` table.

**New migration `019_create_signal_outcomes.sql`:**
```sql
CREATE TABLE signal_outcomes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  signal_id INT NOT NULL,
  outcome ENUM('TARGET_HIT', 'SL_HIT') NOT NULL,
  features JSON NOT NULL,
  strategy VARCHAR(50) NOT NULL,
  resolved_at DATE NOT NULL,
  FOREIGN KEY (signal_id) REFERENCES signals(id)
);
```

**Step 2 — Weekly weight recalibration job**

Add a new cron job `src/jobs/weekly_weight_calibration.job.js` that runs every Sunday:

```javascript
async function recalibrateWeights() {
  // Fetch last 90 days of resolved signals
  const outcomes = await db.query(
    `SELECT features, outcome FROM signal_outcomes
     WHERE resolved_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`
  );

  const featureList = [
    'is_uptrend', 'is_breakout', 'is_volume_spike',
    'near_support', 'is_high_delivery', 'rsi_zone'
  ];

  for (const feature of featureList) {
    const withFeature = outcomes.filter(
      o => JSON.parse(o.features)[feature] === true
    );
    const wins = withFeature.filter(o => o.outcome === 'TARGET_HIT').length;
    const winRate = withFeature.length > 0 ? wins / withFeature.length : 0.5;
    // Scale weight: 0.5 win rate = neutral, 0.7 = +40% boost
    const adjustedWeight = BASE_WEIGHTS[feature] * (0.5 + winRate);
    await upsertAdaptiveThreshold(`weight_${feature}`, adjustedWeight);
  }
}
```

**Step 3 — Use adaptive weights in scoring**

In `scoring.service.js`, load weights from `adaptive_thresholds` at pipeline start rather than reading from constants.

### Effort estimate
Medium — 2 days. The `adaptive_thresholds` table and upsert logic already exist; this is an extension of that pattern.

---

## Improvement 5 — VWAP Distance as Entry Quality Filter

### What to change
Add **Volume Weighted Average Price (VWAP)** distance as a feature in `src/services/features/feature.service.js`. Filter out signals where price is already stretched more than 2% above VWAP for LONG entries (and 2% below VWAP for SHORT entries).

### Why it matters
Buying a breakout when price is already 3–4% above VWAP means you are buying extended. The `technicalindicators` npm package (already a dependency) does not include VWAP, but it is easy to compute from OHLCV data without any new dependencies.

### VWAP calculation (add to `src/services/indicators/volume.service.js`)
```javascript
function computeRollingVWAP(candles, period = 20) {
  return candles.map((c, i) => {
    const windowCandles = candles.slice(Math.max(0, i - period + 1), i + 1);
    const sumTPV = windowCandles.reduce(
      (s, x) => s + ((x.high + x.low + x.close) / 3) * x.volume, 0
    );
    const sumVol = windowCandles.reduce((s, x) => s + x.volume, 0);
    return { date: c.date, vwap: sumVol > 0 ? sumTPV / sumVol : c.close };
  });
}
```

### New features in `feature.service.js`
```javascript
const vwapDistance = ((latestClose - latestVWAP) / latestVWAP) * 100;
const is_near_vwap            = Math.abs(vwapDistance) < 2.0;
const is_stretched_above_vwap = vwapDistance > 2.0;
const is_stretched_below_vwap = vwapDistance < -2.0;
```

### Signal filter
In `src/services/signals/signal.service.js`:
- Discard LONG signals where `is_stretched_above_vwap === true`
- Discard SHORT signals where `is_stretched_below_vwap === true`

### New DB columns
```sql
-- Migration 020_add_vwap_to_features.sql
ALTER TABLE features
  ADD COLUMN vwap DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN vwap_distance_pct DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN is_near_vwap BOOLEAN DEFAULT NULL;
```

### Effort estimate
Low — less than 1 day. No new dependencies. Pure math on existing candle data.

---

## Improvement 6 — Sector Correlation Gate (Portfolio Risk Management)

### What to change
Add a sector-level position limit in `src/services/signals/signal.service.js` to prevent more than 2 simultaneous active signals from the same sector.

### Why it matters
Your position sizing model correctly limits each trade to 1% risk. But if 5 signals from Financial Services all fire on the same day, you effectively have 5% concentrated in one sector, and a sector-level event (RBI policy surprise, NPA disclosure) will hit all five simultaneously. NIFTY 50 stocks within the same sector are highly correlated — stacking them is not diversification.

### Implementation in `signal.service.js`
```javascript
const MAX_SIGNALS_PER_SECTOR = 2;

async function applyCorrelationGate(candidateSignals) {
  // Get currently active signals from DB
  const activeSignals = await signalModel.getActiveSignals();
  const activeSectorCounts = {};

  for (const sig of activeSignals) {
    const sector = getSector(sig.symbol); // uses existing symbols.util.js
    activeSectorCounts[sector] = (activeSectorCounts[sector] || 0) + 1;
  }

  const filtered = [];
  for (const sig of candidateSignals) {
    const sector = getSector(sig.symbol);
    const currentCount = activeSectorCounts[sector] || 0;
    if (currentCount < MAX_SIGNALS_PER_SECTOR) {
      filtered.push(sig);
      activeSectorCounts[sector] = currentCount + 1;
    } else {
      logger.info(
        `Correlation gate: suppressed ${sig.symbol} — sector ${sector} at limit`
      );
    }
  }
  return filtered;
}
```

### Effort estimate
Low — less than 1 day. Uses existing sector mapping in `symbols.util.js`.

---

## Improvement 7 — Pipeline Failure Alerting via Telegram Bot

### What to change
Add a free Telegram bot notification when the daily pipeline fails, completes with zero signals, or runs late.

### Why it matters
If the pipeline silently fails (Yahoo rate-limited, DB connection error, cron misconfiguration), you may act on stale signals without knowing the data is old. This is a critical operational gap. Telegram bots are completely free with no rate limits for personal use.

### Setup (one-time, 10 minutes)
1. Message `@BotFather` on Telegram — create a new bot — save the `BOT_TOKEN`
2. Start a chat with your bot, then visit `https://api.telegram.org/bot{BOT_TOKEN}/getUpdates` to get your `CHAT_ID`
3. Add to `.env`:
```
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

### New utility `src/utils/notify.util.js`
```javascript
const axios = require('axios');

async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // skip gracefully if not configured
  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
  } catch (err) {
    // Never let notification failure break the pipeline
  }
}

module.exports = { sendTelegramAlert };
```

### Integration in `daily_pipeline.job.js`
```javascript
const { sendTelegramAlert } = require('../utils/notify.util');

// On pipeline success
await sendTelegramAlert(
  `✅ <b>TradeNeuron pipeline complete</b>\n` +
  `Signals generated: ${signals.length}\n` +
  `Market regime: ${regime}\n` +
  `Duration: ${duration}s`
);

// On pipeline failure (in catch block)
await sendTelegramAlert(
  `❌ <b>TradeNeuron pipeline FAILED</b>\n` +
  `Error: ${err.message}\n` +
  `Step: ${currentStep}`
);

// Zero signals on a normal day
if (signals.length === 0 && regime !== 'HIGH_VOLATILITY') {
  await sendTelegramAlert(
    `⚠️ Pipeline ran but generated 0 signals. Regime: ${regime}`
  );
}
```

### Effort estimate
Very low — 2 to 3 hours. No new npm packages needed (`axios` already a dependency).

---

## Improvement 8 — Holiday Calendar Accuracy

### What to change
Replace the hardcoded holiday calendar in `src/utils/date.util.js` with a per-year JSON file sourced from NSE's official trading holiday circular, updated each January.

### Why it matters
A wrong holiday entry causes the cron job to either skip a real trading day (missing signals) or run on a market holiday (generating signals on stale data). NSE's holiday list changes slightly every year and the official circular is the only reliable source.

### Implementation
```javascript
// date.util.js
const NSE_HOLIDAYS = require('../config/nse_holidays.json');
// nse_holidays.json: { "2026": ["2026-01-26", "2026-03-17", ...], "2027": [...] }

function isTradingHoliday(date) {
  const year = date.getFullYear().toString();
  const dateStr = date.toISOString().split('T')[0];
  return (NSE_HOLIDAYS[year] || []).includes(dateStr);
}
```

Update `src/config/nse_holidays.json` each January by copying from the NSE official circular (available at `nseindia.com` under Market > Holidays). Takes 30 minutes once a year.

### Effort estimate
Very low — 1 hour initial setup, 30 minutes per year to update.

---

## Improvement 9 — Survivorship-Bias-Free Backtesting

### What to change
The current backtest engine runs only on currently-listed NIFTY 50 stocks. Stocks that were removed from the index historically are excluded, which inflates backtest win rates by 3–8 percentage points.

### Why it matters
NIFTY 50 composition changes roughly every 6 months. A stock getting removed often underperformed — your backtest never sees those losing trades. This is survivorship bias. The paper trading performance will eventually diverge from backtest results because of this gap.

### Implementation plan

**New migration `021_create_historical_composition.sql`:**
```sql
CREATE TABLE nifty50_composition (
  symbol VARCHAR(20) NOT NULL,
  added_date DATE NOT NULL,
  removed_date DATE,
  PRIMARY KEY (symbol, added_date)
);
```

Populate this table from NSE's index factsheets (free PDF downloads from `nseindia.com/products/indices/equities`). This is a one-time manual data entry effort for historical periods.

**Update `backtest.service.js`:**
```javascript
async function getSymbolsForDateRange(startDate, endDate) {
  // Return all symbols that were in NIFTY50 at any point during the range
  return db.query(
    `SELECT DISTINCT symbol FROM nifty50_composition
     WHERE added_date <= ? AND (removed_date IS NULL OR removed_date >= ?)`,
    [endDate, startDate]
  );
}
```

### Effort estimate
Medium — the data collection is the main effort (manually entering historical composition from PDF factsheets). Coding is straightforward once the table is populated.

---

## Improvement 10 — Relative Volume (RVOL) as a Continuous Feature

### What to change
Replace the binary `is_volume_spike` feature with a continuous **Relative Volume (RVOL)** score — today's volume divided by the 20-day average volume — and a tiered label. Add proportional scoring rewards based on the tier.

### Why it matters
The current `is_volume_spike` is binary. RVOL = 3.2 (more than 3× average volume) is a much stronger signal than RVOL = 1.1, but both currently trigger `is_volume_spike = true` and receive the same scoring weight. A continuous score rewards stronger volume confirmation proportionally and gives you more accurate signal ranking.

### Implementation (no new dependencies)
```javascript
// In feature.service.js
const avgVolume = indicators
  .slice(-20)
  .reduce((sum, i) => sum + i.volume, 0) / 20;

const rvol = avgVolume > 0
  ? latestIndicator.volume / avgVolume
  : 1.0;

const volume_tier =
  rvol >= 3.0 ? 'extreme' :
  rvol >= 2.0 ? 'high'    :
  rvol >= 1.3 ? 'elevated': 'normal';
```

```sql
-- Migration 022_add_rvol_to_features.sql
ALTER TABLE features
  ADD COLUMN rvol DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN volume_tier ENUM('normal','elevated','high','extreme') DEFAULT 'normal';
```

### Scoring engine update in `scoring.service.js`
```javascript
const volumeScore = {
  extreme:  15,
  high:     10,
  elevated:  5,
  normal:    0
}[features.volume_tier] ?? 0;
// Replace existing flat is_volume_spike weight with volumeScore
```

### Effort estimate
Very low — less than 1 day. Pure computation on existing candle data, no new dependencies.

---

## Summary Table

| # | Improvement | Effort | Signal Impact | Free Source |
|---|---|---|---|---|
| 1 | NSE delivery % | Medium | High | NSE Bhavcopy CSV |
| 2 | F&O Put-Call Ratio | Medium-High | High | NSE option chain API |
| 3 | FinBERT sentiment | Medium | High | HuggingFace `ProsusAI/finbert` |
| 4 | Dynamic scoring weights | Medium | High | Internal DB feedback loop |
| 5 | VWAP distance filter | Low | Medium | No new dependency |
| 6 | Sector correlation gate | Low | Medium | Existing sector mapping |
| 7 | Telegram pipeline alerts | Very Low | Operational | Telegram Bot API |
| 8 | Holiday calendar accuracy | Very Low | Operational | NSE official circular |
| 9 | Survivorship-bias backtest | Medium | Accuracy | NSE index factsheets |
| 10 | Relative Volume (RVOL) | Very Low | Medium | No new dependency |

---

## Recommended Implementation Order

**Phase 1 — Quick wins, no new dependencies (week 1)**
Improvement 7 (Telegram alerts) → Improvement 10 (RVOL) → Improvement 5 (VWAP) → Improvement 8 (holiday calendar)

**Phase 2 — Data enrichment (week 2–3)**
Improvement 1 (NSE delivery %) → Improvement 6 (sector correlation gate)

**Phase 3 — Intelligence upgrades (week 3–5)**
Improvement 4 (dynamic weights) → Improvement 2 (PCR filter) → Improvement 3 (FinBERT)

**Phase 4 — Backtest integrity (ongoing)**
Improvement 9 (survivorship bias) — data collection effort, work through it gradually each month

---

*Document generated for TradeNeuron — NIFTY 50 swing trading signal system*
