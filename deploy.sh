#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "======================================="
echo "  TradeNeuron Full Stack Deploy"
echo "======================================="
echo ""

MODE="${1:-dev}"

# ---------- Development mode ----------
if [ "$MODE" = "dev" ]; then
  echo "Mode: DEVELOPMENT (hot reload)"
  echo ""

  # Start backend
  echo "[Backend] Installing dependencies..."
  cd "$ROOT_DIR/backend"
  npm install

  if [ ! -f .env ]; then
    echo "ERROR: backend/.env not found. Copy .env.example and configure it."
    exit 1
  fi

  echo "[Backend] Checking Python dependencies (FinBERT)..."
  if command -v python3 &>/dev/null; then
    if python3 -c "import fastapi, uvicorn, transformers, torch" 2>/dev/null; then
      echo "  All Python deps already installed."
    elif [ -f scripts/requirements.txt ]; then
      echo "  Installing Python deps (torch download may take a few minutes)..."
      pip3 install --user --break-system-packages -r scripts/requirements.txt || \
        echo "  WARNING: Could not install Python deps. FinBERT may not start."
    fi
  fi

  echo "[Backend] Running migrations..."
  node scripts/migrate.js

  echo "[Backend] Starting Node.js server on port 3000..."
  node server.js &
  BACKEND_PID=$!

  echo "[Backend] Starting FinBERT sentiment server on port 8765..."
  FINBERT_PID=""
  if command -v python3 &>/dev/null; then
    python3 scripts/sentiment_server.py &
    FINBERT_PID=$!
  else
    echo "  WARNING: python3 not found. Skipping FinBERT server."
  fi

  # Wait for backend to be ready
  echo "[Backend] Waiting for server..."
  for i in {1..15}; do
    if curl -s http://localhost:3000/api/v1/health >/dev/null 2>&1; then
      echo "[Backend] Ready!"
      break
    fi
    sleep 1
  done

  # Start frontend
  echo ""
  cd "$ROOT_DIR/frontend"

  if [ ! -f .env ]; then
    echo "ERROR: frontend/.env not found. Copy .env.example and configure it."
    kill $BACKEND_PID 2>/dev/null
    [ -n "$FINBERT_PID" ] && kill $FINBERT_PID 2>/dev/null
    exit 1
  fi

  echo "[Frontend] Installing dependencies..."
  npm install

  echo "[Frontend] Starting dev server on port 5173..."
  echo ""
  echo "====================================="
  echo "  Backend:  http://localhost:3000"
  echo "  FinBERT:  http://localhost:8765"
  echo "  Frontend: http://localhost:5173"
  echo "  Press Ctrl+C to stop all"
  echo "====================================="
  echo ""

  cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null
    [ -n "$FINBERT_PID" ] && kill $FINBERT_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    [ -n "$FINBERT_PID" ] && wait $FINBERT_PID 2>/dev/null
    echo "Done."
  }
  trap cleanup EXIT INT TERM

  npx vite --host

# ---------- Production mode ----------
elif [ "$MODE" = "prod" ]; then
  echo "Mode: PRODUCTION (build + serve)"
  echo ""

  # Build frontend
  cd "$ROOT_DIR/frontend"

  if [ ! -f .env ]; then
    cp .env.production .env 2>/dev/null || true
  fi

  echo "[Frontend] Installing dependencies..."
  npm install

  echo "[Frontend] Building..."
  npm run build
  echo "[Frontend] Build complete -> frontend/dist/"

  # Start backend
  cd "$ROOT_DIR/backend"

  if [ ! -f .env ]; then
    echo "ERROR: backend/.env not found. Copy .env.example and configure it."
    exit 1
  fi

  echo ""
  echo "[Backend] Installing dependencies..."
  npm install --production

  echo "[Backend] Checking Python dependencies (FinBERT)..."
  if command -v python3 &>/dev/null; then
    if python3 -c "import fastapi, uvicorn, transformers, torch" 2>/dev/null; then
      echo "  All Python deps already installed."
    elif [ -f scripts/requirements.txt ]; then
      echo "  Installing Python deps (torch download may take a few minutes)..."
      pip3 install --user --break-system-packages -r scripts/requirements.txt || \
        echo "  WARNING: Could not install Python deps. FinBERT may not start."
    fi
  fi

  echo "[Backend] Running migrations..."
  node scripts/migrate.js

  echo "[Backend] Starting services..."
  echo ""
  echo "====================================="
  echo "  Backend:  http://localhost:3000"
  echo "  FinBERT:  http://localhost:8765"
  echo "  Frontend: Serve frontend/dist/ with Nginx"
  echo "  Press Ctrl+C to stop"
  echo "====================================="
  echo ""

  npx concurrently -n node,finbert -c cyan,magenta \
    "node server.js" \
    "python3 scripts/sentiment_server.py || echo 'FinBERT exited — keyword sentiment fallback active'"

else
  echo "Usage: ./deploy.sh [dev|prod]"
  echo ""
  echo "  dev   Start both servers with hot reload (default)"
  echo "  prod  Build frontend + start backend for production"
  exit 1
fi
