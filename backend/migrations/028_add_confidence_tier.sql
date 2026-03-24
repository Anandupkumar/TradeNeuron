-- Improvement 2: Confidence Tier System
ALTER TABLE signals
  ADD COLUMN confidence_tier ENUM('HIGH', 'NORMAL', 'LOW') DEFAULT NULL AFTER confidence;
