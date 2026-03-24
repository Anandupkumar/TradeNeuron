-- Improvement 1: Soft Breakout Confirmation — close_position
-- Improvement 3: Trend Slope Soft Filter — ema50_slope
ALTER TABLE features
  ADD COLUMN close_position DECIMAL(5,4) DEFAULT NULL AFTER is_breakout,
  ADD COLUMN ema50_slope DECIMAL(12,4) DEFAULT NULL AFTER close_position;
