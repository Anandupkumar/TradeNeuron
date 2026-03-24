# TradeNeuron — How to Use as a Trader

This guide walks you through using TradeNeuron as a swing trader. No technical knowledge is required — just open the dashboard and follow the workflow below.

---

## What is TradeNeuron?

TradeNeuron is an AI-powered swing trading signal system for **NIFTY 50 stocks**. Every trading day after market close (4:30 PM IST), it analyses all 50 stocks and generates **BUY or SELL signals** with exact entry price, stop loss, target price, and position size — so you know exactly what to do the next morning.

---

## Your Daily Workflow

### 1. Check the Dashboard (after 5 PM on trading days)

Open the dashboard at **http://localhost:5173** (or wherever your system is hosted).

The top bar tells you the pipeline status:
- **Green** — "Updated today at 4:35 PM IST" — today's signals are ready
- **Amber** — "Pipeline scheduled for 4:30 PM IST" — market is still open, wait for it
- **Red** — "Today's data not yet loaded" — something went wrong, contact your admin
- **Grey** — "Market closed — weekend" — no new signals on weekends

### 2. Review Today's Signals

The **Dashboard** shows your active signals as cards. Each card tells you:

```
RELIANCE.NS    BUY / LONG    Confidence: 78%

Entry:   ₹2,450.00
Target:  ₹2,600.00    (+6.1%)
SL:      ₹2,380.00    (-2.9%)

R:R 2.14x    Shares: 28    Strategy: Trend Pullback
Reasons: Trend Alignment · High Volume · High Delivery
```

**What each field means:**

| Field | What it tells you |
|-------|-------------------|
| **Symbol** | Which stock to trade (e.g., RELIANCE.NS) |
| **BUY / SELL** | Whether to buy or sell |
| **LONG / SHORT** | Direction — LONG means you profit when price goes up, SHORT means you profit when it goes down |
| **Confidence** | How strong the signal is (0–100%). Higher is better. Minimum threshold is typically 70%+ |
| **Entry** | The price to enter the trade at (use the next day's open or a limit order near this price) |
| **Target** | The price where you should book profit |
| **Stop Loss (SL)** | The price where you should exit to limit your loss. **Never ignore the stop loss.** |
| **R:R (Risk:Reward)** | How much you can gain vs how much you can lose. 2.14x means you can gain ₹2.14 for every ₹1 you risk. All signals have at least 2.0x |
| **Shares** | How many shares to buy based on your capital and risk settings |
| **Strategy** | Which algorithm generated the signal (Trend Pullback, Breakout, Range, Mean Reversion, etc.) |
| **Reasons** | The factors that contributed to the signal |

### 3. Decide Which Signals to Act On

Not every signal needs to be traded. Use these filters to prioritise:

**High-conviction trades (best for beginners):**
- Confidence **80%+**
- Risk:Reward **2.5x or higher**
- Multiple reasons (3+ factors aligning)
- Strategy: **Trend Pullback** or **Breakout** (these are the most reliable)

**Signals to be cautious about:**
- Confidence below 70% (the system already filters these, but lower confidence = weaker setup)
- Stocks you're unfamiliar with
- Multiple signals in the same sector (if 3 banking stocks signal BUY, the sector might be overbought — pick the strongest one)

### 4. Place Your Orders

The next morning before market open (9:15 AM IST):

1. Open your broker's app (Zerodha, Groww, Angel One, etc.)
2. For each signal you want to act on:
   - Place a **limit order** at or near the **Entry** price
   - Set a **stop loss order** at the **SL** price
   - Set a **target order** at the **Target** price
3. If using bracket orders (BO) or cover orders (CO), you can enter all three levels in one order

**Position sizing:** The system calculates shares based on your configured capital (default ₹10,00,000) and risk per trade (default 1%). This means no single trade risks more than ₹10,000. You can adjust these in the backend settings.

### 5. Monitor Your Trades

Once a trade is live, TradeNeuron tracks it automatically in the **Paper Trading** section:

- **ACTIVE** — trade is open, price hasn't hit target or SL yet
- **TARGET_HIT** — price reached your target — profit booked!
- **SL_HIT** — price hit your stop loss — loss contained
- **EXPIRED** — trade was open for 10 days without hitting target or SL — time to manually exit

**Important:** The system updates signal statuses daily. If a signal shows **TARGET_HIT** or **SL_HIT**, make sure you've actually exited the trade in your broker app.

### 6. End of Day Review

After market close each day, check:
- Did any of your active trades hit target or SL?
- Are there new signals for tomorrow?
- What's the overall win rate in the Paper Trading summary?

---

## Navigating the Dashboard

### Signals Page (`/signals`)

The full signal history with powerful filters:
- **Status** — ACTIVE / TARGET_HIT / SL_HIT / EXPIRED
- **Direction** — LONG / SHORT / All
- **Confidence slider** — filter by minimum confidence
- **Date range** — see signals from specific periods
- **Favorites only** — show only signals for your watched stocks

Click any signal row to open the **detail drawer** with complete trade parameters.

### Stock Detail Page

Click any stock symbol to see its full analysis:
- **Candlestick chart** with EMA 20/50/200 overlays
- **Volume chart** showing buying/selling pressure
- **Indicators** — RSI, MACD, ATR, volume change
- **Features** — what the AI sees:
  - **RVOL** (Relative Volume) — how today's volume compares to the 20-day average. >2x is significant.
  - **Volume Tier** — LOW / NORMAL / HIGH / VERY HIGH / EXTREME
  - **VWAP Distance** — how far the price is from the volume-weighted average price
  - **Delivery %** — what percentage of traded shares were actually delivered (higher = more conviction from buyers)
  - **High Delivery** — Yes/No flag when delivery % exceeds the 20-day median
  - **Uptrend** — whether the stock is in an uptrend (EMA 20 > 50 > 200)
  - **RSI Zone** — Oversold / Pullback / Neutral / Overbought

### Watchlist Page (`/watchlist`)

Add your favourite stocks by clicking the star icon on any signal or stock page. The watchlist shows:
- Current price and change %
- Whether there's an active signal
- Your notes (optional)

### Paper Trading Page (`/paper-trading`)

Track simulated performance without risking real money:
- **Win Rate** — percentage of trades that hit target
- **Average PnL** — average profit/loss per trade
- **Total PnL** — cumulative returns
- **Equity Curve** — visual graph of your cumulative performance over time
- **Max Drawdown** — the worst peak-to-trough decline

Use this to build confidence in the system before trading with real money.

### Backtest Page (`/backtest`)

See how each strategy performed historically:
- **Win Rate** — what percentage of past signals were profitable
- **Sharpe Ratio** — risk-adjusted returns (higher is better, >1.0 is good)
- **Profit Factor** — total profits / total losses (>1.5 is good)
- **Average Holding Days** — how long trades typically last

---

## Understanding the Confidence Score

The confidence score (0–100%) is calculated from multiple factors:

| Factor | What it measures |
|--------|-----------------|
| Trend Alignment | Is the stock in an uptrend? (EMA 20 > 50 > 200) |
| RSI Zone | Is RSI in a healthy pullback zone? (30–45 for buys) |
| Volume | Is volume elevated? Scored by tier — higher volume = higher score |
| Breakout | Has the stock broken above resistance? |
| Near Support | Is the stock near a support level? |
| Relative Strength | Is the stock outperforming NIFTY 50? |
| Sentiment | Is news sentiment positive? (via FinBERT AI analysis) |
| High Delivery | Are buyers taking actual delivery? (institutional interest) |

A score of **80%+** means most factors are aligning — these are the strongest setups.

---

## Rules for Successful Swing Trading with TradeNeuron

1. **Always use stop losses.** The system calculates them for a reason. Never move your SL further away from entry.

2. **Don't overtrade.** 2–3 active positions at a time is ideal. The system caps signals per sector to avoid concentration risk.

3. **Trust the process, not individual trades.** Some trades will lose. That's normal. The system targets a 55–65% win rate with a 2:1+ reward-to-risk ratio — so even with losses, the math works in your favour over many trades.

4. **Paper trade first.** Use the Paper Trading page for at least 2–4 weeks before using real money. This lets you see the system's performance in current market conditions.

5. **Check signals once a day.** After 5 PM IST. The system is designed for end-of-day analysis, not intraday monitoring. Checking more often leads to emotional decisions.

6. **Respect the holding period.** Signals are designed for 5–10 day holds. Don't exit early just because a trade is in small profit — let it reach the target.

7. **Skip signals in HIGH_VOLATILITY regime.** When the dashboard shows "High Volatility" (India VIX above 20), the market is unpredictable. The system may generate fewer signals during these periods — that's by design.

8. **Keep a trading journal.** Note which signals you took, why you skipped others, and what happened. This builds pattern recognition over time.

---

## Quick Reference: Your Daily Checklist

```
After 5 PM IST on trading days:

[ ] Open TradeNeuron dashboard
[ ] Confirm pipeline status is green (updated today)
[ ] Review new active signals
[ ] Check if any existing trades hit TARGET or SL
[ ] Select 1–3 high-confidence signals for tomorrow
[ ] Note entry, SL, target, and shares for selected signals

Next morning before 9:15 AM:

[ ] Place limit orders at entry prices
[ ] Set stop loss orders
[ ] Set target orders (or use bracket orders)

During the day:

[ ] Don't watch the screen. The system handles it.
```

---

## Glossary

| Term | Meaning |
|------|---------|
| **Swing Trade** | A trade held for 2–10 days, capturing a "swing" in price |
| **Entry** | The price at which you open the trade |
| **Stop Loss (SL)** | The maximum loss price — exit here to limit damage |
| **Target** | The profit-taking price — exit here to lock in gains |
| **R:R (Risk:Reward)** | Ratio of potential profit to potential loss |
| **RVOL** | Relative Volume — today's volume divided by the 20-day average |
| **VWAP** | Volume Weighted Average Price — the "fair" price based on volume |
| **Delivery %** | Percentage of shares actually delivered (not just day-traded) |
| **EMA** | Exponential Moving Average — a trend-following indicator |
| **RSI** | Relative Strength Index — measures if a stock is overbought or oversold |
| **MACD** | Moving Average Convergence Divergence — measures trend momentum |
| **ATR** | Average True Range — measures daily price volatility |
| **Paper Trading** | Simulated trading without real money |

---

*TradeNeuron is a decision-support tool. All trading involves risk. Past performance does not guarantee future results. Always do your own research and consult a financial advisor before making investment decisions.*
