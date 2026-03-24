#!/usr/bin/env python3
"""Download 3-year OHLCV data for all NIFTY 50 symbols using yfinance."""

import json
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import yfinance as yf

SYMBOLS = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJAJFINSV.NS", "BAJFINANCE.NS", "BHARTIARTL.NS", "BPCL.NS",
    "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DIVISLAB.NS", "DRREDDY.NS",
    "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
    "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS", "INDUSINDBK.NS",
    "INFY.NS", "ITC.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "LT.NS",
    "LTIM.NS", "M&M.NS", "MARUTI.NS", "NESTLEIND.NS", "NTPC.NS",
    "ONGC.NS", "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SBIN.NS",
    "SHRIRAMFIN.NS", "SUNPHARMA.NS", "TATACONSUM.NS", "TATAMOTORS.NS", "TATASTEEL.NS",
    "TCS.NS", "TECHM.NS", "TITAN.NS", "TRENT.NS", "ULTRACEMCO.NS",
    "^NSEI", "^INDIAVIX",
]

OUTPUT_FILE = Path(__file__).parent / "yahoo_data.json"
DELAY_BETWEEN_SYMBOLS = 1.5


def main():
    end_date = datetime.now()
    start_date = end_date - timedelta(days=3 * 365)

    all_data = {}
    success = 0
    failed = 0

    print(f"Downloading {len(SYMBOLS)} symbols from {start_date.date()} to {end_date.date()}")

    for i, symbol in enumerate(SYMBOLS):
        print(f"[{i + 1}/{len(SYMBOLS)}] {symbol} ... ", end="", flush=True)
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(start=start_date.strftime("%Y-%m-%d"),
                                 end=end_date.strftime("%Y-%m-%d"),
                                 interval="1d")

            if hist.empty:
                print("NO DATA")
                failed += 1
                continue

            rows = []
            for date_idx, row in hist.iterrows():
                date_str = date_idx.strftime("%Y-%m-%d")
                if row["Close"] is None or row["Close"] != row["Close"]:
                    continue
                rows.append({
                    "symbol": symbol,
                    "date": date_str,
                    "open": round(float(row["Open"]), 2) if row["Open"] == row["Open"] else None,
                    "high": round(float(row["High"]), 2) if row["High"] == row["High"] else None,
                    "low": round(float(row["Low"]), 2) if row["Low"] == row["Low"] else None,
                    "close": round(float(row["Close"]), 2),
                    "adjusted_close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
                    "source": "YAHOO",
                })

            all_data[symbol] = rows
            success += 1
            print(f"{len(rows)} candles")

        except Exception as e:
            print(f"ERROR: {e}")
            failed += 1

        if i < len(SYMBOLS) - 1:
            time.sleep(DELAY_BETWEEN_SYMBOLS)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_data, f)

    print(f"\nDone. Success: {success}, Failed: {failed}")
    print(f"Data saved to {OUTPUT_FILE}")
    total_candles = sum(len(v) for v in all_data.values())
    print(f"Total candles: {total_candles}")


if __name__ == "__main__":
    main()
