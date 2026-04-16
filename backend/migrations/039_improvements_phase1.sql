-- Earnings blackout + signal calibration / freshness + reject stages

ALTER TABLE fundamentals
  ADD COLUMN next_earnings_date DATE NULL AFTER promoter_pledge;

ALTER TABLE signals
  ADD COLUMN raw_confidence DECIMAL(5,2) NULL AFTER confidence,
  ADD COLUMN confidence_calibrated TINYINT(1) NOT NULL DEFAULT 0 AFTER raw_confidence,
  ADD COLUMN entry_degraded TINYINT(1) NOT NULL DEFAULT 0 AFTER confidence_calibrated;

ALTER TABLE rejected_signals
  MODIFY COLUMN reject_stage ENUM(
    'FUNDAMENTAL_FILTER','SENTIMENT_FILTER','VWAP_FILTER','PCR_FILTER',
    'SECTOR_GATE','CONFIDENCE_GATE','RR_GATE','LIQUIDITY_GATE',
    'MERGED_RISK_ZERO','ACTIVE_CAP','POSITION_SIZING','DUPLICATE',
    'FREQUENCY_CAP','EARNINGS_BLACKOUT','PORTFOLIO_RISK_CAP'
  ) NOT NULL;
