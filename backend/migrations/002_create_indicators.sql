CREATE TABLE indicators (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    ema_20          DECIMAL(12,2),
    ema_50          DECIMAL(12,2),
    ema_200         DECIMAL(12,2),
    rsi             DECIMAL(8,4),
    macd_line       DECIMAL(12,4),
    macd_signal     DECIMAL(12,4),
    macd_histogram  DECIMAL(12,4),
    atr             DECIMAL(12,4),
    volume_sma_20   BIGINT UNSIGNED,
    volume_change   DECIMAL(8,4),
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
