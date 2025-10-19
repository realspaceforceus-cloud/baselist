-- Family member links - one active spouse per DoD member sponsor
CREATE TABLE family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active', -- active, revoked
  relationship text DEFAULT 'spouse', -- spouse, parent, etc.
  created_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  revoked_by uuid REFERENCES users(id),
  revocation_reason text,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(sponsor_id, status) -- only one active family member per sponsor
);

CREATE INDEX idx_family_links_sponsor_id ON family_links(sponsor_id);
CREATE INDEX idx_family_links_family_member_id ON family_links(family_member_id);
CREATE INDEX idx_family_links_status ON family_links(status);

-- Sponsor approval requests - pending requests awaiting sponsor approval
CREATE TABLE sponsor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sponsor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sponsor_username text NOT NULL, -- what the family member entered
  status text NOT NULL DEFAULT 'pending', -- pending, approved, denied, expired
  denial_reason text, -- why sponsor denied
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL, -- auto-expire after a few days
  approved_at timestamp with time zone,
  denied_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(family_member_id, status) -- one active request per family member
);

CREATE INDEX idx_sponsor_requests_family_member_id ON sponsor_requests(family_member_id);
CREATE INDEX idx_sponsor_requests_sponsor_id ON sponsor_requests(sponsor_id);
CREATE INDEX idx_sponsor_requests_status ON sponsor_requests(status);
CREATE INDEX idx_sponsor_requests_expires_at ON sponsor_requests(expires_at);

-- Sponsor cooldown - optional rate limiting for re-linking after revocation
CREATE TABLE sponsor_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cooldown_until timestamp with time zone NOT NULL,
  reason text, -- why cooldown was applied
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(sponsor_id)
);

CREATE INDEX idx_sponsor_cooldowns_sponsor_id ON sponsor_cooldowns(sponsor_id);
CREATE INDEX idx_sponsor_cooldowns_cooldown_until ON sponsor_cooldowns(cooldown_until);

-- Audit log for sponsor actions
CREATE TABLE sponsor_actions_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES users(id) ON DELETE SET NULL,
  family_link_id uuid REFERENCES family_links(id) ON DELETE SET NULL,
  sponsor_request_id uuid REFERENCES sponsor_requests(id) ON DELETE SET NULL,
  action_type text NOT NULL, -- request_created, request_approved, request_denied, link_revoked, cooldown_applied, cooldown_lifted
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_sponsor_actions_audit_sponsor_id ON sponsor_actions_audit(sponsor_id);
CREATE INDEX idx_sponsor_actions_audit_family_member_id ON sponsor_actions_audit(family_member_id);
CREATE INDEX idx_sponsor_actions_audit_action_type ON sponsor_actions_audit(action_type);
CREATE INDEX idx_sponsor_actions_audit_created_at ON sponsor_actions_audit(created_at);
