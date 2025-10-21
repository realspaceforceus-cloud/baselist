-- Add join method tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_method TEXT DEFAULT 'email' CHECK (join_method IN ('email', 'code', 'sponsor'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_code_id TEXT REFERENCES invitation_codes(id) ON DELETE SET NULL;

-- Create invitation codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  base_id TEXT NOT NULL REFERENCES bases(id) ON DELETE CASCADE,
  max_uses INTEGER, -- NULL means unlimited
  uses_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL means never expires
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_base_id ON invitation_codes(base_id);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(active);

-- Create account strikes/notes table
CREATE TABLE IF NOT EXISTS account_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('strike', 'warning', 'info', 'note')),
  strike_reason TEXT, -- For strikes: 'spam', 'fraud', 'harassment', 'inappropriate_content', etc.
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP -- For strikes that auto-expire
);

CREATE INDEX IF NOT EXISTS idx_account_notes_user_id ON account_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_account_notes_created_by ON account_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_account_notes_type ON account_notes(note_type);

-- Create failed login attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL, -- email or username
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  attempted_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_identifier ON failed_login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_attempted_at ON failed_login_attempts(attempted_at);

-- Create IP blacklist table
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id TEXT PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  added_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip_address ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_active ON ip_blacklist(active);
