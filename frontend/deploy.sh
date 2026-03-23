#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "====================================="
echo "  TradeNeuron Frontend Deploy"
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
    echo "  *** IMPORTANT: Edit .env and set VITE_API_KEY to match backend API_KEY ***"
    exit 1
  else
    echo "ERROR: No .env or .env.example found"
    exit 1
  fi
fi

echo "[2/5] Installing dependencies..."
npm install

echo "[3/5] Running type check..."
npx tsc --noEmit

echo "[4/5] Building for production..."
npm run build
echo "  Build output in dist/"

echo "[5/5] Starting preview server..."
echo ""
echo "  Frontend will start on http://localhost:4173"
echo "  Press Ctrl+C to stop"
echo ""

npx vite preview --host
