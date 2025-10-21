-- Create session tracking table for live users
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_id TEXT NOT NULL REFERENCES bases(id),
  ip_address TEXT,
  user_agent TEXT,
  session_start TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create API metrics table for system health
CREATE TABLE IF NOT EXISTS api_metrics (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  error_message TEXT,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Create transaction metrics table for revenue tracking
CREATE TABLE IF NOT EXISTS transaction_metrics (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id),
  base_id TEXT NOT NULL REFERENCES bases(id),
  amount FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user event tracking for behavior analytics
CREATE TABLE IF NOT EXISTS user_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_id TEXT NOT NULL REFERENCES bases(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'listing_created', 'listing_sold', 'message_sent', 'verification_completed', 'transaction_completed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_base_id ON user_sessions(base_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_api_metrics_recorded_at ON api_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_transaction_metrics_base_id ON transaction_metrics(base_id);
CREATE INDEX IF NOT EXISTS idx_transaction_metrics_created_at ON transaction_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_base_id ON user_events(base_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at);
