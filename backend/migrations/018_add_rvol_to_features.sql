ALTER TABLE features
  ADD COLUMN rvol DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN volume_tier ENUM('normal','elevated','high','extreme') DEFAULT 'normal';
