-- Create successful login attempts table for tracking user logins
CREATE TABLE IF NOT EXISTS successful_login_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_id TEXT,
  logged_in_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_successful_login_attempts_user_id ON successful_login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_successful_login_attempts_ip ON successful_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_successful_login_attempts_logged_in_at ON successful_login_attempts(logged_in_at);
