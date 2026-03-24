CREATE TABLE IF NOT EXISTS rejected_signals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    strategy_source VARCHAR(100)    NOT NULL,
    reject_stage    ENUM(
      'FUNDAMENTAL_FILTER',
      'SENTIMENT_FILTER',
      'VWAP_FILTER',
      'PCR_FILTER',
      'SECTOR_GATE',
      'CONFIDENCE_GATE',
      'RR_GATE',
      'LIQUIDITY_GATE',
      'MERGED_RISK_ZERO',
      'ACTIVE_CAP',
      'POSITION_SIZING'
    ) NOT NULL,
    reject_reason   VARCHAR(500)    NOT NULL,
    raw_confidence  DECIMAL(5,2)    DEFAULT NULL,
    raw_rr          DECIMAL(5,2)    DEFAULT NULL,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_symbol (symbol),
    INDEX idx_date   (date),
    INDEX idx_stage  (reject_stage)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
