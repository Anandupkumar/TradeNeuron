ALTER TABLE features
  CHANGE COLUMN vwap vwma DECIMAL(12,2) NULL,
  CHANGE COLUMN vwap_distance_pct vwma_distance_pct DECIMAL(8,4) NULL,
  CHANGE COLUMN is_near_vwap is_near_vwma TINYINT(1) NULL;
