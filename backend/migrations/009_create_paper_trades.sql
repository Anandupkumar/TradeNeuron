CREATE TABLE paper_trades (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id       BIGINT UNSIGNED NOT NULL,
    symbol          VARCHAR(20)     NOT NULL,
    entry_date      DATE            NOT NULL,
    entry_price     DECIMAL(12,2)   NOT NULL,
    stop_loss       DECIMAL(12,2)   NOT NULL,
    target_price    DECIMAL(12,2)   NOT NULL,
    exit_date       DATE,
    exit_price      DECIMAL(12,2),
    exit_reason     ENUM('TARGET_HIT', 'SL_HIT', 'EXPIRED', 'MANUAL'),
    pnl_pct         DECIMAL(8,4),
    status          ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_signal (signal_id),
    INDEX idx_symbol (symbol),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
