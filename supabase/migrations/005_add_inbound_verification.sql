-- Email verification codes for inbound .mil email verification
CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending, verified, expired
  verification_method text DEFAULT 'inbound', -- inbound, outbound
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  verified_from_email text, -- the .mil email that verified it
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, email, status) -- one active verification per user per email
);

CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(code);
CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_status ON email_verifications(status);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Audit log for email verification events
CREATE TABLE email_verification_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email text NOT NULL,
  verification_id TEXT REFERENCES email_verifications(id) ON DELETE SET NULL,
  event_type text NOT NULL, -- code_generated, verification_received, verification_success, verification_failed, code_expired
  details jsonb, -- SPF check result, DKIM result, parsed email data, etc.
  sender_email text, -- for inbound events, the email address that sent verification
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_email_verification_audit_user_id ON email_verification_audit(user_id);
CREATE INDEX idx_email_verification_audit_email ON email_verification_audit(email);
CREATE INDEX idx_email_verification_audit_event_type ON email_verification_audit(event_type);
CREATE INDEX idx_email_verification_audit_created_at ON email_verification_audit(created_at);
