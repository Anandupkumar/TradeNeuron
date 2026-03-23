ALTER TABLE paper_trades
  ADD COLUMN shares_to_buy   INT UNSIGNED,
  ADD COLUMN gross_pnl_inr   DECIMAL(14,2);
