CREATE TABLE IF NOT EXISTS adaptive_thresholds (
    id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol                   VARCHAR(20)   NOT NULL,
    date                     DATE          NOT NULL,
    vix_threshold            DECIMAL(8,4),
    volume_spike_threshold   BIGINT UNSIGNED,
    rsi_oversold             DECIMAL(8,4),
    rsi_pullback             DECIMAL(8,4),
    rsi_overbought           DECIMAL(8,4),
    created_at               TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_symbol_date (symbol, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
