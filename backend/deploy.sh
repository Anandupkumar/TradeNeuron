#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "====================================="
echo "  TradeNeuron Backend Deploy"
echo "====================================="

# --- Check prerequisites ---
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is not installed"
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm is not installed"
  exit 1
fi

echo "[1/5] Checking .env file..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "  Created .env from .env.example"
    echo "  *** IMPORTANT: Edit .env and set your DB credentials and API_KEY ***"
    exit 1
  else
    echo "ERROR: No .env or .env.example found"
    exit 1
  fi
fi

echo "[2/5] Installing dependencies..."
npm install --production

echo "[3/5] Running database migrations..."
node scripts/migrate.js

echo "[4/5] Checking if port 3000 is free..."
if lsof -ti:3000 &>/dev/null; then
  echo "  Port 3000 is in use. Killing existing process..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "[5/5] Starting backend server..."
echo ""
echo "  Backend will start on http://localhost:3000"
echo "  Press Ctrl+C to stop"
echo ""

node server.js
