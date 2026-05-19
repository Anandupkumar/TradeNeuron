CREATE TABLE blocked_signal_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  strategy_source VARCHAR(100) NULL,
  direction ENUM('LONG','SHORT') NULL,
  blocked_reason VARCHAR(64) NOT NULL,
  blocked_confidence DECIMAL(5,2) NULL,
  blocked_rr DECIMAL(6,2) NULL,
  blocked_expected_value DECIMAL(10,4) NULL,
  active_trade_id BIGINT UNSIGNED NULL,
  active_trade_symbol VARCHAR(20) NULL,
  active_trade_lifecycle_state VARCHAR(32) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_blocked_signal_events_date (date),
  INDEX idx_blocked_signal_events_reason (blocked_reason),
  INDEX idx_blocked_signal_events_symbol (symbol),
  INDEX idx_blocked_signal_events_active_trade (active_trade_id),
  CONSTRAINT fk_blocked_signal_events_active_trade
    FOREIGN KEY (active_trade_id) REFERENCES paper_trades(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
