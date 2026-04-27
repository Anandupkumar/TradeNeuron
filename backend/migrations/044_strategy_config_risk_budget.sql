-- Phase C / Fix 7: continuous per-strategy risk budget.
-- The sizing layer reads risk_budget_multiplier from strategy_config and scales
-- per-trade rupee risk by it. The weekly recalibration job updates this field
-- based on each strategy's rolling expectancy vs the baseline, then clamps it
-- to [RISK_BUDGET_MIN_MULTIPLIER, RISK_BUDGET_MAX_MULTIPLIER].
-- Partial blend (RISK_BUDGET_BLEND) is applied at the job, not the DB.
ALTER TABLE strategy_config
    ADD COLUMN risk_budget_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00 AFTER min_confidence,
    ADD COLUMN risk_budget_updated_at TIMESTAMP NULL AFTER risk_budget_multiplier,
    ADD COLUMN risk_budget_trade_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER risk_budget_updated_at,
    ADD COLUMN risk_budget_expectancy_pct DECIMAL(8,4) NULL AFTER risk_budget_trade_count;
