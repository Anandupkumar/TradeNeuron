ALTER TABLE paper_trades
  ADD COLUMN lifecycle_state ENUM(
    'ACTIVE',
    'PARTIAL_EXITED',
    'TRAILING',
    'STALE',
    'COMPRESSING',
    'FAILED',
    'EXITED'
  ) NOT NULL DEFAULT 'ACTIVE' AFTER status,
  ADD COLUMN lifecycle_note VARCHAR(255) NULL AFTER lifecycle_state,
  ADD COLUMN lifecycle_state_changed_at TIMESTAMP NULL AFTER lifecycle_note,
  ADD INDEX idx_paper_trades_lifecycle_state (lifecycle_state),
  ADD INDEX idx_paper_trades_status_lifecycle (status, lifecycle_state);
