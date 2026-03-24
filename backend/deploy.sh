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

echo "[1/7] Checking .env file..."
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

echo "[2/7] Installing Node dependencies..."
npm install --omit=dev

echo "[3/7] Checking Python dependencies (FinBERT sentiment server)..."
if command -v python3 &>/dev/null; then
  if python3 -c "import fastapi, uvicorn, transformers, torch" 2>/dev/null; then
    echo "  All Python deps already installed."
  elif [ -f scripts/requirements.txt ]; then
    echo "  Installing Python deps (torch download may take a few minutes)..."
    pip3 install --user --break-system-packages -r scripts/requirements.txt || \
      echo "  WARNING: Could not install Python deps. FinBERT server will not start."
  fi
else
  echo "  WARNING: python3 not found. FinBERT sentiment server will not start."
fi

echo "[4/7] Running database migrations..."
node scripts/migrate.js

echo "[5/7] Checking if port 3000 is free..."
if lsof -ti:3000 &>/dev/null; then
  echo "  Port 3000 is in use. Killing existing process..."
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "[6/7] Checking if port 8765 is free (FinBERT)..."
if lsof -ti:8765 &>/dev/null; then
  echo "  Port 8765 is in use. Killing existing process..."
  lsof -ti:8765 | xargs kill -9 2>/dev/null || true
  sleep 2
fi

echo "[7/7] Starting backend services..."
echo ""
echo "  Node.js API   → http://localhost:3000"
echo "  FinBERT API   → http://localhost:8765"
echo "  Press Ctrl+C to stop both"
echo ""

npx concurrently -n node,finbert -c cyan,magenta \
  "node server.js" \
  "python3 scripts/sentiment_server.py || echo 'FinBERT exited — keyword sentiment fallback active'"
