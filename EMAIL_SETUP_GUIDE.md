# Email Setup Guide for BaseList

This guide walks you through setting up email verification and templates for BaseList.

## Overview

The app now has:
1. **SendGrid Integration** - Real email sending in production
2. **Email Template Management** - Admin panel to create/edit email templates
3. **Database-driven Templates** - Store templates in your Neon database

## Step 1: Set Up SendGrid

### 1.1 Create a SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up for a free account (includes 100 emails/day)
3. Verify your email address

### 1.2 Get Your SendGrid API Key

1. Log in to SendGrid dashboard
2. Go to **Settings > API Keys**
3. Click **Create API Key**
4. Name it "BaseList" 
5. Select "Full Access"
6. Copy the API key (you'll only see it once)

### 1.3 Verify Your Sender Email

1. Go to **Settings > Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter your email (e.g., `noreply@baselist.mil` or your domain)
4. Verify the email by clicking the link in the confirmation email

## Step 2: Set Environment Variables

### For Netlify Deployment:

1. Go to your Netlify project settings
2. Navigate to **Build & Deploy > Environment**
3. Add these variables:
   - `SENDGRID_API_KEY` = Your SendGrid API key (from Step 1.2)
   - `SENDGRID_FROM_EMAIL` = Your verified sender email (e.g., `noreply@baselist.mil`)
   - `NETLIFY_DATABASE_URL` = Your Neon PostgreSQL connection string
   - `DATABASE_URL` = Your Neon PostgreSQL connection string

4. **Redeploy** your site after adding these variables

### For Local Development:

Update your `.env` file (or `.env.local`):
```
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=noreply@baselist.mil
DATABASE_URL=your_neon_connection_string
NETLIFY_DATABASE_URL=your_neon_connection_string
```

## Step 3: Run Database Migrations

You need to create the email template tables in your Neon database.

### Option A: Using Neon SQL Editor (Easiest)

1. Go to [neon.tech](https://neon.tech)
2. Log in and open your BaseList project
3. Go to the **SQL Editor** tab
4. Run each migration file in order:

**Migration 1: verification_codes table** (if not already created)
```sql
-- From: supabase/migrations/002_add_verification_codes.sql
CREATE TABLE verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email)
);

CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_expires_at ON verification_codes(expires_at);
```

**Migration 2: email_templates table**
```sql
-- From: supabase/migrations/003_add_email_templates.sql
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

CREATE INDEX idx_email_templates_template_key ON email_templates(template_key);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);
```

**Migration 3: Seed default template**
```sql
-- From: supabase/migrations/004_seed_email_templates.sql
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
```

## Step 4: Test Email Sending

### Test in Production:

1. Go to your deployed BaseList app
2. Create a new account with your military email
3. Check your inbox for the verification code email
4. If you don't see it, check spam folder

### Troubleshooting:

**Email not received?**
- Check that `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` are set in Netlify
- Verify your sender email is authenticated in SendGrid
- Check Netlify function logs for errors

**Email stuck in spam?**
- Add your domain to SendGrid's authentication
- Or use a custom domain email instead of noreply@

## Step 5: Manage Email Templates (Optional)

Once everything is set up:

1. **Admin Panel** > **Email Templates**
2. Click **New Template** to create custom emails
3. Use variables like `{{ code }}`, `{{ email }}`, etc.
4. Toggle templates as **Active** to use them

## Available Email Template Variables

### Verification Code Template (`verify`)
- `{{ code }}` - The 6-digit verification code
- `{{ email }}` - The user's email address

### Adding More Templates

You can create additional templates for:
- Password reset
- Newsletter notifications
- Account updates
- Custom announcements

## Troubleshooting

### "SENDGRID_API_KEY is not set"
- Add the environment variable to Netlify settings
- Make sure to redeploy after adding it

### "Failed to send verification code email"
- Check SendGrid API key is correct
- Verify sender email is authenticated
- Check network connectivity

### "Template not found"
- Run the migration to create the `email_templates` table
- Seed the default template

### Emails only logged in development
- This is expected. In development (`NODE_ENV !== "production"`), emails are logged to console
- In production, they're sent via SendGrid
- To test in development with real emails, set `NODE_ENV=production` in your build

## Production Checklist

- [ ] SendGrid account created
- [ ] API key generated and stored securely
- [ ] Sender email verified in SendGrid
- [ ] Environment variables set in Netlify:
  - [ ] `SENDGRID_API_KEY`
  - [ ] `SENDGRID_FROM_EMAIL`
  - [ ] `DATABASE_URL` (Neon connection string)
  - [ ] `NETLIFY_DATABASE_URL` (Neon connection string)
- [ ] Database migrations run (email_templates table created)
- [ ] Default template seeded
- [ ] Site redeployed after env changes
- [ ] Test signup flow sends actual email

## Next Steps

1. Set up SendGrid (Steps 1-2)
2. Run migrations in Neon (Step 3)
3. Redeploy to Netlify
4. Test email verification (Step 4)
5. Customize templates as needed (Step 5)
