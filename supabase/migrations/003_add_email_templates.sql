-- Create email_templates table for managing email templates
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  description TEXT,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);
