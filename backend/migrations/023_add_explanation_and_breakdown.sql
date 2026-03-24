ALTER TABLE signals
  ADD COLUMN explanation JSON DEFAULT NULL,
  ADD COLUMN confidence_breakdown JSON DEFAULT NULL;
