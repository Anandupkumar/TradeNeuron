CREATE TABLE features (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol                      VARCHAR(20)     NOT NULL,
    date                        DATE            NOT NULL,
    is_uptrend                  TINYINT(1)      NOT NULL DEFAULT 0,
    rsi_zone                    ENUM('OVERSOLD', 'PULLBACK', 'NEUTRAL', 'OVERBOUGHT') NOT NULL DEFAULT 'NEUTRAL',
    is_volume_spike             TINYINT(1)      NOT NULL DEFAULT 0,
    is_breakout                 TINYINT(1)      NOT NULL DEFAULT 0,
    near_support                TINYINT(1)      NOT NULL DEFAULT 0,
    distance_from_52w_high_pct  DECIMAL(8,4),
    relative_strength_vs_nifty  DECIMAL(8,4),
    created_at                  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
