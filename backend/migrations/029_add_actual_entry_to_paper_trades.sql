-- Fix 1: Next-day open entry price — eliminates look-ahead bias
ALTER TABLE paper_trades
  ADD COLUMN actual_entry_price DECIMAL(12,2) DEFAULT NULL AFTER entry_price;
