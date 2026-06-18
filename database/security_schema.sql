-- Enhanced Security Tables for DocGuard
-- Run this to add cybersecurity tracking capabilities

USE docguard;

-- Enhanced logs table with security metadata
ALTER TABLE logs 
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS geo_lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS geo_lon DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anomaly_type VARCHAR(100);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_time (email, attempt_time),
  INDEX idx_ip_time (ip_address, attempt_time)
);

-- Account lockout tracking
CREATE TABLE IF NOT EXISTS account_lockouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL UNIQUE,
  locked_until TIMESTAMP NULL,
  lockout_reason VARCHAR(255),
  failed_attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Security anomalies/alerts
CREATE TABLE IF NOT EXISTS security_anomalies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(150),
  anomaly_type ENUM('multiple_failed_logins', 'geofence_violation', 'unusual_access_pattern', 'suspicious_activity', 'rate_limit_exceeded', 'unauthorized_access_attempt') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  description TEXT,
  ip_address VARCHAR(45),
  file_id INT,
  metadata JSON,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  INDEX idx_user_email (user_email),
  INDEX idx_detected_at (detected_at),
  INDEX idx_severity (severity),
  INDEX idx_resolved (resolved)
);

-- IP whitelist/blacklist
CREATE TABLE IF NOT EXISTS ip_security (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  type ENUM('whitelist', 'blacklist') NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip (ip_address)
);

-- User session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(150) NOT NULL,
  token_hash VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  geo_lat DECIMAL(10,8),
  geo_lon DECIMAL(11,8),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_user_email (user_email),
  INDEX idx_token (token_hash)
);


