-- Phase A: Partial profit exits, BE stop move, and dynamic frequency threshold metadata.
-- Adds leg-level columns to signals, paper_trades, signal_outcomes and extends
-- exit_reason enums to encode the multi-leg exit lifecycle introduced in Fix 1.
-- Fix 2 (dynamic frequency threshold) introduces no schema changes — its state is
-- derived on demand from signals.date / YEARWEEK, but a rejection-stage string
-- 'FREQUENCY_DYNAMIC_FLOOR' is added to the rejected_signals enum for observability.

-- signals.status stays at 4 lifecycle states (ACTIVE/TARGET_HIT/SL_HIT/EXPIRED).
-- Multi-leg detail lives in paper_trades.exit_reason and signal_outcomes.outcome.
ALTER TABLE signals
    ADD COLUMN partial_exit_price      DECIMAL(12,2) NULL AFTER target_price,
    ADD COLUMN partial_exit_date       DATE          NULL AFTER partial_exit_price,
    ADD COLUMN partial_shares_booked   INT UNSIGNED  NULL AFTER partial_exit_date,
    ADD COLUMN partial_realized_pnl_inr DECIMAL(12,2) NULL AFTER partial_shares_booked,
    ADD COLUMN sl_moved_to_breakeven   TINYINT(1) NOT NULL DEFAULT 0 AFTER partial_realized_pnl_inr;

ALTER TABLE paper_trades
    ADD COLUMN partial_exit_price      DECIMAL(12,2) NULL AFTER target_price,
    ADD COLUMN partial_exit_date       DATE          NULL AFTER partial_exit_price,
    ADD COLUMN partial_shares_booked   INT UNSIGNED  NULL AFTER partial_exit_date,
    ADD COLUMN partial_realized_pnl_inr DECIMAL(12,2) NULL AFTER partial_shares_booked,
    ADD COLUMN partial_pnl_pct         DECIMAL(8,4)  NULL AFTER partial_realized_pnl_inr,
    ADD COLUMN sl_moved_to_breakeven   TINYINT(1) NOT NULL DEFAULT 0 AFTER partial_pnl_pct,
    MODIFY COLUMN exit_reason ENUM(
        'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
        'EXPIRED','MANUAL','EXPIRED_PENALIZED',
        'PARTIAL_THEN_TARGET','PARTIAL_THEN_BE_STOP','PARTIAL_THEN_TRAIL_STOP','PARTIAL_THEN_EXPIRED',
        'VOL_COMPRESSION'
    );

ALTER TABLE signal_outcomes
    MODIFY COLUMN outcome ENUM(
        'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
        'EXPIRED','EXPIRED_PENALIZED',
        'PARTIAL_THEN_TARGET','PARTIAL_THEN_BE_STOP','PARTIAL_THEN_TRAIL_STOP','PARTIAL_THEN_EXPIRED',
        'VOL_COMPRESSION'
    ) NOT NULL,
    MODIFY COLUMN paper_trade_exit_reason ENUM(
        'TARGET_HIT','SL_HIT','TRAILING_STOP_HIT','GAP_STOP',
        'EXPIRED','MANUAL','EXPIRED_PENALIZED',
        'PARTIAL_THEN_TARGET','PARTIAL_THEN_BE_STOP','PARTIAL_THEN_TRAIL_STOP','PARTIAL_THEN_EXPIRED',
        'VOL_COMPRESSION'
    ) NULL,
    ADD COLUMN partial_exit_hit        TINYINT(1) NOT NULL DEFAULT 0 AFTER gap_open_loss,
    ADD COLUMN partial_pnl_pct         DECIMAL(8,4) NULL AFTER partial_exit_hit,
    ADD COLUMN bars_to_partial         INT UNSIGNED NULL AFTER partial_pnl_pct;

-- Extend rejected_signals stages for dynamic-frequency observability.
ALTER TABLE rejected_signals
    MODIFY COLUMN reject_stage ENUM(
        'FUNDAMENTAL_FILTER','SENTIMENT_FILTER','VWAP_FILTER','PCR_FILTER',
        'SECTOR_GATE','CONFIDENCE_GATE','RR_GATE','LIQUIDITY_GATE',
        'MERGED_RISK_ZERO','ACTIVE_CAP','POSITION_SIZING','DUPLICATE',
        'FREQUENCY_CAP','EARNINGS_BLACKOUT','PORTFOLIO_RISK_CAP',
        'FREQUENCY_DYNAMIC_FLOOR'
    ) NOT NULL;
