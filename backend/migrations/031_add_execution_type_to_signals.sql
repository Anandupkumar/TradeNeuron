ALTER TABLE signals
  ADD COLUMN execution_type
    ENUM('EQUITY', 'FUTURES', 'OPTIONS', 'NONE')
    NOT NULL DEFAULT 'EQUITY'
    AFTER direction;

ALTER TABLE signals
  ADD COLUMN is_executable
    TINYINT(1) NOT NULL DEFAULT 1
    AFTER execution_type;

ALTER TABLE paper_trades
  ADD COLUMN execution_type
    ENUM('EQUITY', 'FUTURES', 'OPTIONS', 'NONE')
    NOT NULL DEFAULT 'EQUITY'
    AFTER direction;
