CREATE TABLE IF NOT EXISTS nifty50_composition (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol        VARCHAR(20) NOT NULL,
    added_date    DATE NOT NULL,
    removed_date  DATE DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_dates (added_date, removed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
