-- Phase B / Fix 3: per-strategy x per-direction confidence calibration with fallback.
-- Adds slice_level, strategy, direction columns to confidence_calibration so the
-- calibration job can emit three slices per bucket:
--   slice_level='STRATEGY_DIRECTION' (strategy, direction, bucket)
--   slice_level='STRATEGY'           (strategy, '*',       bucket)
--   slice_level='GLOBAL'             ('*',      '*',       bucket)
-- Lookup follows this order; first slice with total_signals >= minimum wins.

ALTER TABLE confidence_calibration
    ADD COLUMN slice_level ENUM('GLOBAL','STRATEGY','STRATEGY_DIRECTION') NOT NULL DEFAULT 'GLOBAL' AFTER confidence_bucket,
    ADD COLUMN strategy VARCHAR(64) NOT NULL DEFAULT '*' AFTER slice_level,
    ADD COLUMN direction ENUM('LONG','SHORT','*') NOT NULL DEFAULT '*' AFTER strategy,
    DROP INDEX uq_bucket_date,
    ADD UNIQUE INDEX uq_slice_bucket_date (slice_level, strategy, direction, confidence_bucket, computed_at),
    ADD INDEX idx_slice_bucket (slice_level, strategy, direction, confidence_bucket);
