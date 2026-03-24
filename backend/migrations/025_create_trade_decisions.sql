CREATE TABLE IF NOT EXISTS trade_decisions (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    signal_id        BIGINT UNSIGNED NOT NULL,
    user_identifier  VARCHAR(64)     NOT NULL,
    decision         ENUM('TAKEN', 'SKIPPED', 'MODIFIED') NOT NULL,
    notes            TEXT,
    actual_entry     DECIMAL(12,2)   DEFAULT NULL,
    actual_qty       INT UNSIGNED    DEFAULT NULL,
    decided_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_signal_user (signal_id, user_identifier),
    INDEX idx_user (user_identifier),
    INDEX idx_signal (signal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
