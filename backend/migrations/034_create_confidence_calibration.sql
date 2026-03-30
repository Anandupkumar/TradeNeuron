CREATE TABLE IF NOT EXISTS confidence_calibration (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    confidence_bucket   INT NOT NULL,
    total_signals       INT NOT NULL,
    actual_win_rate     DECIMAL(5,2) NOT NULL,
    computed_at         DATE NOT NULL,
    UNIQUE INDEX uq_bucket_date (confidence_bucket, computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
