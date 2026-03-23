CREATE TABLE fundamentals (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol          VARCHAR(20)     NOT NULL,
    fetched_date    DATE            NOT NULL,
    debt_to_equity  DECIMAL(8,4),
    eps_growth_yoy  DECIMAL(8,4),
    revenue_growth  DECIMAL(8,4),
    promoter_pledge DECIMAL(8,4),
    is_healthy      TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, fetched_date),
    INDEX idx_symbol (symbol),
    INDEX idx_healthy (is_healthy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
