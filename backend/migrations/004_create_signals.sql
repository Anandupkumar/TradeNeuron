CREATE TABLE signals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    date            DATE            NOT NULL,
    signal_type     ENUM('BUY')     NOT NULL,
    confidence      DECIMAL(5,2)    NOT NULL,
    entry_price     DECIMAL(12,2)   NOT NULL,
    stop_loss       DECIMAL(12,2)   NOT NULL,
    target_price    DECIMAL(12,2)   NOT NULL,
    risk_reward     DECIMAL(5,2)    NOT NULL,
    reasons         JSON            NOT NULL,
    status          ENUM('ACTIVE', 'TARGET_HIT', 'SL_HIT', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    strategy_source VARCHAR(100)    NOT NULL,
    closed_at       DATE,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_symbol (symbol),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_symbol_status (symbol, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
