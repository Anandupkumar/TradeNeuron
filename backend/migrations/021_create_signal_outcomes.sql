CREATE TABLE IF NOT EXISTS signal_outcomes (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id      BIGINT UNSIGNED NOT NULL,
    outcome        ENUM('TARGET_HIT','SL_HIT','EXPIRED') NOT NULL,
    strategy       VARCHAR(100),
    features_json  JSON,
    resolved_at    DATE NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_signal_id (signal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE adaptive_thresholds
  ADD COLUMN weight_trend       DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_rsi         DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_volume      DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN weight_breakout    DECIMAL(5,2) DEFAULT NULL;
