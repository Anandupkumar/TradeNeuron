CREATE TABLE backtest_results (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    strategy_name       VARCHAR(50)     NOT NULL,
    run_date            DATE            NOT NULL,
    train_start         DATE            NOT NULL,
    train_end           DATE            NOT NULL,
    test_start          DATE            NOT NULL,
    test_end            DATE            NOT NULL,
    total_signals       INT UNSIGNED    NOT NULL,
    wins                INT UNSIGNED    NOT NULL,
    losses              INT UNSIGNED    NOT NULL,
    neutral             INT UNSIGNED    NOT NULL,
    win_rate_pct        DECIMAL(5,2)    NOT NULL,
    avg_return_pct      DECIMAL(8,4)    NOT NULL,
    max_drawdown_pct    DECIMAL(8,4)    NOT NULL,
    sharpe_ratio        DECIMAL(8,4),
    profit_factor       DECIMAL(8,4),
    avg_holding_days    DECIMAL(5,2),
    weight_config       JSON            NOT NULL,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_strategy (strategy_name),
    INDEX idx_run_date (run_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
