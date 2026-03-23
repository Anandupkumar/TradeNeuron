CREATE TABLE candles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    open            DECIMAL(12,2)   NOT NULL,
    high            DECIMAL(12,2)   NOT NULL,
    low             DECIMAL(12,2)   NOT NULL,
    close           DECIMAL(12,2)   NOT NULL,
    adjusted_close  DECIMAL(12,2)   NOT NULL,
    volume          BIGINT UNSIGNED NOT NULL,
    source          ENUM('YAHOO', 'BHAVCOPY') NOT NULL DEFAULT 'YAHOO',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, date),
    INDEX idx_symbol (symbol),
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
