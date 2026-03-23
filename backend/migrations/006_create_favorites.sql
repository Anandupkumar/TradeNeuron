CREATE TABLE favorites (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_identifier VARCHAR(64)     NOT NULL,
    symbol          VARCHAR(20)     NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_user_symbol (user_identifier, symbol),
    INDEX idx_user (user_identifier),
    INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
