CREATE TABLE sentiment_flags (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    symbol      VARCHAR(20)     NOT NULL,
    flag_date   DATE            NOT NULL,
    sentiment   ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE') NOT NULL DEFAULT 'NEUTRAL',
    headline    TEXT,
    source      VARCHAR(100)    DEFAULT 'GOOGLE_NEWS_RSS',
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX uq_symbol_date (symbol, flag_date),
    INDEX idx_symbol (symbol),
    INDEX idx_sentiment (sentiment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
