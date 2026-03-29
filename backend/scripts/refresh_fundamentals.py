#!/usr/bin/env python3
"""Fetch fundamental data for NIFTY 50 stocks via yfinance and upsert into MySQL.

Called by the Node.js weekly fundamentals cron job.
Outputs a JSON summary line to stdout for the caller to parse.
Exit code 0 = success, 1 = failure.
"""

import json
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

import mysql.connector
import yfinance as yf
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

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
]

BASE_THROTTLE_S = 2.0
JITTER_S = 0.5

MAX_DEBT_TO_EQUITY = float(os.getenv("MAX_DEBT_TO_EQUITY", "2.0"))
MAX_PROMOTER_PLEDGE_PCT = float(os.getenv("MAX_PROMOTER_PLEDGE_PCT", "50"))


def round_or_none(value, decimals=4):
    if value is None:
        return None
    try:
        return round(float(value), decimals)
    except (TypeError, ValueError):
        return None


def fetch_fundamentals(symbol):
    """Fetch fundamental metrics from yfinance for a single symbol."""
    ticker = yf.Ticker(symbol)
    info = ticker.info

    debt_to_equity = round_or_none(info.get("debtToEquity"))
    eps_growth_yoy = round_or_none(info.get("earningsQuarterlyGrowth"))
    revenue_growth = round_or_none(info.get("revenueGrowth"))

    held_pct = info.get("heldPercentInsiders")
    promoter_pledge = round_or_none(held_pct * 100, 4) if held_pct is not None else None

    return {
        "symbol": symbol,
        "debt_to_equity": debt_to_equity,
        "eps_growth_yoy": eps_growth_yoy,
        "revenue_growth": revenue_growth,
        "promoter_pledge": promoter_pledge,
    }


def compute_health_flag(data):
    """Mirror of fundamental.service.js computeHealthFlag()."""
    if data["debt_to_equity"] is not None and data["debt_to_equity"] > MAX_DEBT_TO_EQUITY:
        return False, f"D/E ratio {data['debt_to_equity']} exceeds {MAX_DEBT_TO_EQUITY}"

    if data["eps_growth_yoy"] is not None and data["eps_growth_yoy"] < 0:
        return False, f"EPS growth negative ({data['eps_growth_yoy']})"

    if data["revenue_growth"] is not None and data["revenue_growth"] < 0:
        return False, f"Revenue growth negative ({data['revenue_growth']})"

    if data["promoter_pledge"] is not None and data["promoter_pledge"] > MAX_PROMOTER_PLEDGE_PCT:
        return False, f"Promoter pledge at {data['promoter_pledge']}% exceeds {MAX_PROMOTER_PLEDGE_PCT}%"

    return True, None


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
    )


def upsert_fundamental(cursor, data, is_healthy, fetched_date):
    sql = """
        INSERT INTO fundamentals
            (symbol, fetched_date, debt_to_equity, eps_growth_yoy, revenue_growth, promoter_pledge, is_healthy)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            debt_to_equity = VALUES(debt_to_equity),
            eps_growth_yoy = VALUES(eps_growth_yoy),
            revenue_growth = VALUES(revenue_growth),
            promoter_pledge = VALUES(promoter_pledge),
            is_healthy = VALUES(is_healthy)
    """
    cursor.execute(sql, (
        data["symbol"],
        fetched_date,
        data["debt_to_equity"],
        data["eps_growth_yoy"],
        data["revenue_growth"],
        data["promoter_pledge"],
        1 if is_healthy else 0,
    ))


def main():
    fetched_date = datetime.now().strftime("%Y-%m-%d")
    success_count = 0
    fail_count = 0
    unhealthy = []

    conn = get_db_connection()
    cursor = conn.cursor()

    print(f"Refreshing fundamentals for {len(SYMBOLS)} symbols ({fetched_date})", flush=True)

    for i, symbol in enumerate(SYMBOLS):
        try:
            data = fetch_fundamentals(symbol)
            is_healthy, reason = compute_health_flag(data)

            upsert_fundamental(cursor, data, is_healthy, fetched_date)
            conn.commit()

            if not is_healthy:
                unhealthy.append({"symbol": symbol, "reason": reason})
                print(f"  [{i+1}/{len(SYMBOLS)}] {symbol}: UNHEALTHY — {reason}", flush=True)
            else:
                print(f"  [{i+1}/{len(SYMBOLS)}] {symbol}: OK", flush=True)

            success_count += 1

        except Exception as e:
            print(f"  [{i+1}/{len(SYMBOLS)}] {symbol}: ERROR — {e}", flush=True)
            fail_count += 1

        if i < len(SYMBOLS) - 1:
            jitter = random.uniform(-JITTER_S, JITTER_S)
            time.sleep(BASE_THROTTLE_S + jitter)

    cursor.close()
    conn.close()

    summary = {
        "success": success_count,
        "failed": fail_count,
        "unhealthy_count": len(unhealthy),
        "unhealthy": unhealthy,
    }

    # Final line is JSON for the Node.js caller to parse
    print(f"SUMMARY:{json.dumps(summary)}", flush=True)

    if fail_count > len(SYMBOLS) // 2:
        print(f"Too many failures ({fail_count}/{len(SYMBOLS)}), exiting with error", flush=True)
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
