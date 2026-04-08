ALTER TABLE strategy_config
    ADD COLUMN min_confidence INT NOT NULL DEFAULT 65;

UPDATE strategy_config SET min_confidence = 58 WHERE strategy_name = 'BREAKDOWN';
UPDATE strategy_config SET min_confidence = 65 WHERE strategy_name = 'TREND_PULLBACK_SHORT';
