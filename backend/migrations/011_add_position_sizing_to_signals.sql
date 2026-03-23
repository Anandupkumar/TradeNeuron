ALTER TABLE signals
  ADD COLUMN shares_to_buy     INT UNSIGNED,
  ADD COLUMN position_value    DECIMAL(14,2),
  ADD COLUMN capital_risk_inr  DECIMAL(14,2);
