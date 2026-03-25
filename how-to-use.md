# How to Use TradeNeuron

TradeNeuron is a stock trading assistant that watches NIFTY 50 stocks every day, finds good opportunities to buy or sell, and tracks how those recommendations perform over time. You don't need to be a technical expert to use it.

---

## Getting Started

### Step 1: Open the App

Open your browser and go to:

```
http://localhost:5173
```

### Step 2: Enter the API Key

The first time you open the app, you'll see a screen asking for an **API Key**. This is a password that connects the app to its backend server.

- Enter the key that was set in the backend configuration (check with whoever set up the system, or look at the `API_KEY` value in `backend/.env`)
- Click **Connect**

If it says "Connected", you're in. If it says "Could not reach the server", make sure the backend is running first (see the Setup section below).

---

## What You'll See

After logging in, you land on the **Dashboard**. The left sidebar has links to all sections:

### Dashboard (Home Page)

This is your overview screen. It shows:

- **Active Signals** — how many buy/sell opportunities the system found today
- **Market Regime** — whether the overall market is bullish, bearish, or sideways
- **Paper Trading PnL** — how the system's past recommendations have performed (profit or loss)
- **Watchlist** — stocks you've chosen to keep an eye on
- **Equity Curve** — a chart showing the system's performance over time

### Signals

This is where you see all the trading signals the system has generated.

Each signal tells you:
- **Which stock** to buy or sell
- **Entry price** — the recommended price to get in
- **Stop loss** — a safety price where you should exit to limit losses
- **Target price** — the expected profit-taking price
- **Confidence** — how confident the system is (0-100%)
- **Risk-Reward** — how much you could gain vs how much you risk (2x means you gain 2 for every 1 risked)
- **Status** — whether the signal is still active or has already played out

You can filter signals by:
- Status (Active, Target Hit, Stop Loss Hit, Expired)
- Direction (Long/Buy or Short/Sell)
- Confidence Tier (High / Normal / Low)
- Date range
- Minimum confidence level

Click on any signal row to see full details in a side panel.

### Stock Detail

Click on any stock symbol (anywhere in the app) to see its detail page:

- **Candlestick chart** showing recent price action
- **Technical indicators** like EMA, RSI, MACD, ATR
- **Features** like whether it's in an uptrend, near support, has a volume spike, breakout strength, EMA50 trend, VWAP distance, delivery %, relative volume, etc.
- **Active signal** for that stock (if any)

### Paper Trading

Paper trading means "pretend trading" — the system automatically creates fake trades based on its signals to track how well they would have done with real money.

This page shows:
- **Total trades, wins, losses**
- **Win rate** — what percentage of trades were profitable
- **Total PnL** — overall profit/loss percentage
- **Max drawdown** — the worst dip from a peak
- A **table of all trades** with entry/exit dates, prices, and results
- A **PnL curve chart** showing performance over time

### Backtest

Backtesting means testing the strategies on historical data to see how they would have performed in the past.

This page shows results for each strategy:
- Win rate, average return, max drawdown
- Sharpe ratio (risk-adjusted returns)
- Profit factor
- Side-by-side comparison table

### Watchlist

Your personal list of stocks to track. You can:
- Click **Add Stock** to add any NIFTY 50 symbol
- Click the remove button to remove a stock
- Click on any symbol to go to its detail page

### Settings

- **Connection status** — shows whether the backend server is reachable
- **Theme** — toggle between dark mode and light mode
- **Feature flags** — shows which features are enabled (Short Signals, Paper Trading, Backtest)
- **Keyboard shortcuts** — quick keys to navigate the app
- **About** — app name and version

---

## Keyboard Shortcuts

You can navigate the app quickly using these keys:

| Key | What It Does |
|---|---|
| D | Go to Dashboard |
| S | Go to Signals |
| W | Go to Watchlist |
| P | Go to Paper Trading |
| B | Go to Backtest |
| , | Go to Settings |
| F | Toggle filters on/off |
| Esc | Close any open panel or dialog |

---

## How Signals Work (Plain English)

Every weekday after the Indian stock market closes at 3:30 PM, the system automatically:

1. Downloads the latest stock prices for all 50 NIFTY stocks
2. Calculates technical indicators (moving averages, momentum, volatility, etc.)
3. Checks the overall market mood (bullish, bearish, or sideways)
4. Runs 6 different trading strategies to find opportunities
5. Filters out stocks with bad financials (too much debt, declining earnings)
6. Filters out stocks with negative news
7. Scores and ranks the remaining signals
8. Calculates how many shares to buy and how much money to risk
9. Publishes the signals to your dashboard

### What do the signal statuses mean?

| Status | Meaning |
|---|---|
| **ACTIVE** | The signal is live — the stock hasn't hit the target or stop loss yet |
| **TARGET_HIT** | The stock reached the target price — this was a winning trade |
| **SL_HIT** | The stock hit the stop loss — this was a losing trade |
| **EXPIRED** | The holding period ended without hitting target or stop loss |
| **EXPIRED (penalized)** | Expired with negligible price movement — a small opportunity cost penalty is applied |

### What is Risk-Reward?

If a signal has a risk-reward of **2.0x**, it means:
- If you win, you gain ₹2 for every ₹1 you risked
- Example: Entry ₹100, Stop Loss ₹95, Target ₹110 → you risk ₹5 to potentially gain ₹10

### What is Confidence?

A number from 0 to 100 showing how strongly the system believes in the signal. Higher is better. The system requires a minimum confidence of 70 before publishing a signal.

Signals are also assigned a **confidence tier**:

| Tier | Confidence | Meaning |
|------|-----------|---------|
| **HIGH** | 85+ | Strong conviction — highest priority |
| **NORMAL** | 75–84 | Standard signal |
| **LOW** | 70–74 | Weaker conviction, still valid |

---

## Understanding the Dashboard Cards

| Card | What It Means |
|---|---|
| **Active Signals: 5** | There are 5 stocks with current buy/sell recommendations |
| **Market Regime: BULLISH** | The overall market is in an uptrend — more buy signals expected |
| **Open Paper Trades: 3** | 3 simulated trades are currently running |
| **Total PnL: +12.50%** | The system's paper trades have gained 12.5% overall |

---

## Setting Up the System (First Time)

If the system hasn't been set up yet, here's what you need:

### Prerequisites
- Node.js (v18 or higher)
- MySQL 8 database
- Python 3 (for downloading stock data)

### Start the Backend

```bash
cd backend
cp .env.example .env          # Create config file
# Edit .env — set your DB credentials and API_KEY
npm install                    # Install dependencies
node scripts/migrate.js        # Create database tables
npm start                      # Start the server on port 3000
```

### Start the Frontend

```bash
cd frontend
cp .env.example .env           # Create config file
# Make sure VITE_API_KEY in frontend/.env matches API_KEY in backend/.env
npm install                    # Install dependencies
npm run dev                    # Start on port 5173
```

### Seed Historical Data (Required for First Run)

To populate the system with historical stock data so it can start generating signals:

```bash
# Step 1: Install Python dependency (one-time)
pip3 install --user yfinance

# Step 2: Download 3 years of stock data (takes ~90 seconds)
cd backend
npm run download

# Step 3: Load the data into the database (takes ~1 second)
npm run seed

# Step 4: Run the analysis pipeline to generate signals
npm run pipeline
```

The download step fetches price data for all 50 NIFTY stocks from Yahoo Finance. The data is saved to a JSON file, which is then loaded into the database by the seed step.

### Using deploy.sh (Simplified)

You can also use the included deploy scripts:

```bash
# Start everything in dev mode (hot reload)
./deploy.sh dev

# Or start backend and frontend separately
cd backend && ./deploy.sh
cd frontend && ./deploy.sh
```

---

## Common Questions

**Q: Why is the dashboard empty?**
The system needs historical data to generate signals. Run `npm run download` then `npm run seed` then `npm run pipeline` in the backend folder. After that, refresh the frontend.

**Q: What does "Market is closed" mean on the dashboard?**
The Indian stock market (NSE) operates Monday-Friday, 9:15 AM to 3:30 PM IST. Outside those hours, this message appears. The system generates signals after market close.

**Q: Should I actually trade based on these signals?**
TradeNeuron is a research and analysis tool. Always do your own due diligence before placing real trades. The paper trading feature lets you track how signals would perform without risking real money.

**Q: How do I change the API key?**
Go to Settings. The current API key is stored in your browser. To change the backend key, update `API_KEY` in `backend/.env` and `VITE_API_KEY` in `frontend/.env`, then restart both servers.

**Q: The app says "Could not reach the server"**
Make sure the backend is running (`npm start` in the backend folder). Check that the frontend's `VITE_API_BASE_URL` in `frontend/.env` points to the correct backend address (default: `http://localhost:3000/api/v1`).
