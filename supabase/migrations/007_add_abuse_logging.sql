-- Abuse event log for tracking suspicious activity
CREATE TABLE abuse_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- verification_failed, too_many_requests, invalid_code_attempts, duplicate_requests, etc.
  identifier text NOT NULL, -- IP address, email, user ID, etc.
  details jsonb, -- Additional context about the event
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_abuse_log_identifier ON abuse_log(identifier);
CREATE INDEX idx_abuse_log_event_type ON abuse_log(event_type);
CREATE INDEX idx_abuse_log_created_at ON abuse_log(created_at);
CREATE INDEX idx_abuse_log_identifier_created_at ON abuse_log(identifier, created_at);

-- Rate limit tracking (optional, for persistence across function invocations)
CREATE TABLE rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  count integer NOT NULL DEFAULT 0,
  reset_time timestamp with time zone NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_rate_limit_key ON rate_limit_tracking(key);
CREATE INDEX idx_rate_limit_reset_time ON rate_limit_tracking(reset_time);
