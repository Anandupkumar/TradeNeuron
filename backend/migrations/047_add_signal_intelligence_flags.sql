ALTER TABLE signals
  ADD COLUMN target_reachability_warning TINYINT(1) NOT NULL DEFAULT 0 AFTER max_hold_days,
  ADD COLUMN signal_flags JSON NULL AFTER target_reachability_warning,
  ADD INDEX idx_signals_target_reachability_warning (target_reachability_warning);
