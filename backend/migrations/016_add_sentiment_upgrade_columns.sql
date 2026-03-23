ALTER TABLE sentiment_flags
  ADD COLUMN confidence    ENUM('HIGH','LOW') DEFAULT 'HIGH',
  ADD COLUMN finnhub_score DECIMAL(5,4),
  ADD COLUMN overridden    TINYINT(1) DEFAULT 0;
