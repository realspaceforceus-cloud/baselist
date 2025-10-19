-- Seed default email templates
-- Note: We'll use a placeholder user_id since templates will be created by the system
-- In production, you can update the created_by user_id after the first admin is created

INSERT INTO email_templates (
  id,
  name,
  template_key,
  subject,
  html_content,
  description,
  variables,
  is_active,
  created_by,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Email Verification Code',
  'verify',
  'Verify your BaseList account',
  '<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Verify your BaseList account</h2>
    <p>Hi,</p>
    <p>Your verification code is:</p>
    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <h1 style="letter-spacing: 5px; color: #1565c0; margin: 0;">{{ code }}</h1>
    </div>
    <p>Enter this code in the BaseList app to verify your account. The code expires in 10 minutes.</p>
    <p>If you didn''t sign up for BaseList, you can safely ignore this email.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">BaseList - Verified classifieds for military bases</p>
  </body>
</html>',
  'Sent when a user signs up with a military email address',
  '["code", "email"]'::jsonb,
  true,
  '00000000-0000-0000-0000-000000000000',
  NOW()
) ON CONFLICT (template_key) DO NOTHING;
