CREATE TABLE pipeline_runs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    run_date        DATE            NOT NULL,
    started_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP       NULL,
    status          ENUM('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
    duration_ms     INT UNSIGNED    NULL,
    signals_generated INT UNSIGNED  NOT NULL DEFAULT 0,
    regime          VARCHAR(20)     NULL,

    INDEX idx_status (status),
    INDEX idx_completed_at (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
