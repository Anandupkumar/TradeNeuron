#!/bin/bash
cd /opt/projects/TradeNeuron/backend

LOG_FILE="/opt/projects/TradeNeuron/backend/logs/data_refresh.log"

echo "=== Data Refresh Start: $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"

python3 scripts/download_yahoo_data.py >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo "Download complete, starting seed..." >> "$LOG_FILE"
  NODE_ENV=production node scripts/seed_historical.js >> "$LOG_FILE" 2>&1
  echo "Seed complete: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
else
  echo "Download FAILED: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
fi

echo "=== Data Refresh End ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
