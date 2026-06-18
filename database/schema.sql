CREATE DATABASE IF NOT EXISTS docguard;
USE docguard;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('owner','user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  originalname VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS access_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  role ENUM('read','write','download','share') NOT NULL,
  expiry_time DATETIME NULL,
  geo_lat DECIMAL(10,8) NULL,
  geo_lon DECIMAL(11,8) NULL,
  geo_radius_m INT NULL,
  is_location_restricted BOOLEAN DEFAULT FALSE,
  allowed_locations JSON NULL COMMENT 'Array of allowed locations with coordinates and radius',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_file_user (file_id, user_email),
  INDEX idx_location_restricted (is_location_restricted)
);

CREATE TABLE IF NOT EXISTS logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(150),
  action VARCHAR(100),
  file_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS storage_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Access request workflow
CREATE TABLE IF NOT EXISTS access_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  role ENUM('read','download','share') NOT NULL,
  message TEXT NULL,
  expiry_time DATETIME NULL,
  geo_lat DECIMAL(10,8) NULL,
  geo_lon DECIMAL(11,8) NULL,
  geo_radius_m INT NULL,
  is_location_restricted BOOLEAN DEFAULT FALSE,
  allowed_locations JSON NULL COMMENT 'Array of allowed locations',
  status ENUM('pending','approved','denied') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- User Location History (for audit and location tracking)
CREATE TABLE IF NOT EXISTS user_location_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  file_id INT NOT NULL,
  access_type ENUM('view','download','grant','denied') NOT NULL,
  access_lat DECIMAL(10,8) NOT NULL,
  access_lon DECIMAL(11,8) NOT NULL,
  allowed BOOLEAN NOT NULL,
  reason VARCHAR(255) NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_user_access (user_email, file_id),
  INDEX idx_access_denied (allowed)
);

-- Evaluation results for performance and test harnesses
CREATE TABLE IF NOT EXISTS evaluation_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NULL,
  metric_key VARCHAR(128) NOT NULL,
  metric_value DOUBLE NULL,
  meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE crypto_evaluation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id VARCHAR(255),
  file_size_mb DECIMAL(10,2),
  operation_type VARCHAR(50), -- encrypt/decrypt
  time_ms DECIMAL(12,3),
  success TINYINT(1),
  meta JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);