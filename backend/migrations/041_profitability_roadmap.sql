ALTER TABLE signals
  ADD COLUMN market_regime ENUM('BULLISH','SIDEWAYS','BEARISH','HIGH_VOLATILITY','UNKNOWN') NULL AFTER confidence_breakdown,
  ADD COLUMN ranking_score DECIMAL(6,2) NULL AFTER market_regime,
  ADD COLUMN ranking_components JSON NULL AFTER ranking_score,
  ADD COLUMN exit_policy JSON NULL AFTER ranking_components,
  ADD COLUMN max_hold_days INT UNSIGNED NULL AFTER exit_policy;

ALTER TABLE paper_trades
  MODIFY COLUMN exit_reason ENUM(
    'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
    'EXPIRED','MANUAL','EXPIRED_PENALIZED'
  ),
  ADD COLUMN exit_policy JSON NULL AFTER target_price,
  ADD COLUMN max_hold_days INT UNSIGNED NULL AFTER exit_policy,
  ADD COLUMN mfe_pct DECIMAL(8,4) NULL AFTER pnl_pct,
  ADD COLUMN mae_pct DECIMAL(8,4) NULL AFTER mfe_pct,
  ADD COLUMN bars_held INT UNSIGNED NULL AFTER mae_pct,
  ADD COLUMN entry_gap_pct DECIMAL(8,4) NULL AFTER bars_held;

ALTER TABLE signal_outcomes
  MODIFY COLUMN outcome ENUM(
    'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
    'EXPIRED','EXPIRED_PENALIZED'
  ) NOT NULL,
  ADD COLUMN raw_confidence DECIMAL(5,2) NULL AFTER strategy,
  ADD COLUMN confidence_bucket INT NULL AFTER raw_confidence,
  ADD COLUMN ranking_score DECIMAL(6,2) NULL AFTER confidence_bucket,
  ADD COLUMN market_regime ENUM('BULLISH','SIDEWAYS','BEARISH','HIGH_VOLATILITY','UNKNOWN') NULL AFTER ranking_score,
  ADD COLUMN sector VARCHAR(64) NULL AFTER market_regime,
  ADD COLUMN relative_strength_vs_nifty DECIMAL(8,4) NULL AFTER sector,
  ADD COLUMN rs_bucket VARCHAR(16) NULL AFTER relative_strength_vs_nifty,
  ADD COLUMN bars_held INT UNSIGNED NULL AFTER rs_bucket,
  ADD COLUMN mfe_pct DECIMAL(8,4) NULL AFTER bars_held,
  ADD COLUMN mae_pct DECIMAL(8,4) NULL AFTER mfe_pct,
  ADD COLUMN gap_open_loss TINYINT(1) NOT NULL DEFAULT 0 AFTER mae_pct,
  ADD COLUMN expected_entry_price DECIMAL(12,2) NULL AFTER gap_open_loss,
  ADD COLUMN actual_entry_price DECIMAL(12,2) NULL AFTER expected_entry_price,
  ADD COLUMN entry_slippage_pct DECIMAL(8,4) NULL AFTER actual_entry_price,
  ADD COLUMN paper_trade_pnl_pct DECIMAL(8,4) NULL AFTER entry_slippage_pct,
  ADD COLUMN paper_trade_exit_reason ENUM(
    'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
    'EXPIRED','MANUAL','EXPIRED_PENALIZED'
  ) NULL AFTER paper_trade_pnl_pct;

ALTER TABLE backtest_results
  ADD COLUMN expectancy_pct DECIMAL(8,4) NULL AFTER avg_return_pct,
  ADD COLUMN avg_mfe_pct DECIMAL(8,4) NULL AFTER avg_holding_days,
  ADD COLUMN avg_mae_pct DECIMAL(8,4) NULL AFTER avg_mfe_pct,
  ADD COLUMN gap_open_losses INT UNSIGNED NOT NULL DEFAULT 0 AFTER avg_mae_pct,
  ADD COLUMN avg_entry_gap_pct DECIMAL(8,4) NULL AFTER gap_open_losses,
  ADD COLUMN exit_reason_distribution JSON NULL AFTER avg_entry_gap_pct;

CREATE TABLE strategy_performance_snapshots (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  strategy_name VARCHAR(100) NOT NULL,
  scope_type ENUM('GLOBAL','REGIME','SECTOR') NOT NULL,
  scope_value VARCHAR(64) NOT NULL,
  trade_count INT UNSIGNED NOT NULL,
  win_rate_pct DECIMAL(5,2) NOT NULL,
  avg_pnl_pct DECIMAL(8,4) NULL,
  profit_factor DECIMAL(8,4) NULL,
  expectancy_pct DECIMAL(8,4) NULL,
  max_drawdown_pct DECIMAL(8,4) NULL,
  recommendation ENUM('KEEP','WATCH','DISABLE') NOT NULL,
  recommendation_reason VARCHAR(255) NULL,
  applied TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_strategy_snapshot (snapshot_date, strategy_name, scope_type, scope_value),
  INDEX idx_strategy_scope (strategy_name, scope_type, scope_value)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE shadow_validation_runs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  comparison_date DATE NOT NULL,
  regime ENUM('BULLISH','SIDEWAYS','BEARISH','HIGH_VOLATILITY','UNKNOWN') NOT NULL,
  candidate_count INT UNSIGNED NOT NULL,
  baseline_selected INT UNSIGNED NOT NULL,
  improved_selected INT UNSIGNED NOT NULL,
  overlap_selected INT UNSIGNED NOT NULL,
  baseline_selection JSON NOT NULL,
  improved_selection JSON NOT NULL,
  baseline_avg_confidence DECIMAL(6,2) NULL,
  improved_avg_ranking_score DECIMAL(6,2) NULL,
  criteria_json JSON NULL,
  promotion_ready TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shadow_run (comparison_date, regime),
  INDEX idx_shadow_date (comparison_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
