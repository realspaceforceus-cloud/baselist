# Inbound Email Verification Setup

This guide explains how to set up the inbound email verification system for .mil address verification.

## System Overview

Instead of sending emails to .mil addresses (which DoD mail filters block), users verify their .mil email by **sending us an email**. This reverses the normal flow:

1. User signs up and gets a verification code
2. User sends an email with the code to `verify@yourdomain.com`
3. Our webhook receives and validates the email
4. We mark the user as verified (no .mil address needed to receive our email)

## Architecture

```
User's .mil Email → SendGrid Inbound Parse Webhook → /.netlify/functions/inbound-email
                                                         ↓
                                                      Validate SPF/DKIM
                                                      Extract code
                                                      Update database
                                                      ↓
                                               User marked as verified
```

## Setup Steps

### 1. Configure Your Domain MX Records

For SendGrid to receive inbound emails, you need to add MX records:

**For SendGrid Inbound Parse:**

Add these MX records to your domain DNS:

```
Priority 1: mx.sendgrid.net.
Priority 10: mx2.sendgrid.net.
Priority 100: mx3.sendgrid.net.
```

Example (Route53, Cloudflare, etc.):

- Host: `@` (or your domain)
- Type: MX
- Value: `1 mx.sendgrid.net`
- Value: `10 mx2.sendgrid.net`
- Value: `100 mx3.sendgrid.net`

**Verification email account:**

Create an email address or subdomain for verification. Options:

- Use `verify@yourdomain.com` (requires SPF/DKIM for subdomain)
- Use `noreply@yourdomain.com` (common pattern)
- Use `verification@yourdomain.com`

### 2. Set Up SendGrid Inbound Parse

1. Log into your SendGrid account
2. Go to **Settings > Inbound Parse**
3. Click **Create New Endpoint**
4. Fill in the form:
   - **Hostname:** `yourdomain.com` (or your verification subdomain)
   - **URL:** `https://yourdomain.com/.netlify/functions/inbound-email`
   - **POST the raw, full MIME message:** Check this box
   - **Spam Check:** Enable (optional, adds X-Spam-\* headers)
   - **Open Tracking:** Disable
   - **Click Tracking:** Disable

5. Click **Create**

### 3. Verify SPF/DKIM Records

For the webhook to validate that emails actually come from .mil addresses:

**Add SPF record:**

```
v=spf1 include:sendgrid.net ~all
```

**Add DKIM records:**

SendGrid will give you DKIM records to add. Go to:

- Settings > Sender Authentication > Domain Authentication
- Follow the steps to add DKIM records to your DNS

### 4. Test the Setup

1. **Verify MX records are working:**

```bash
# This should show SendGrid MX records
nslookup -type=MX yourdomain.com

# Or use dig
dig yourdomain.com MX
```

2. **Test sending an email to verify@yourdomain.com:**

```bash
# From command line (if you have mail utilities)
echo "VER-ABC12" | mail -s "VER-ABC12" verify@yourdomain.com

# Or use any email client
# Send to: verify@yourdomain.com
# Subject: VER-ABC12
# Body: VER-ABC12
```

3. **Check SendGrid logs:**
   - Go to **Activity > Search**
   - Filter by recipient: `yourdomain.com`
   - You should see the inbound message

4. **Check your webhook logs:**
   - Go to Netlify Functions
   - View logs for `inbound-email` function
   - Look for `[INBOUND EMAIL]` log entries

### 5. Configure Environment Variables

Make sure these are set in your Netlify environment:

```
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com (for any outbound emails)
```

No additional environment variables are needed for inbound parsing—SendGrid handles authentication with the webhook URL itself.

## Frontend Integration

When a user creates an account:

1. Account is created in database
2. Verification code is generated (format: `VER-XXXXX`)
3. Frontend displays instructions:
   - Copy the code
   - Send email to `verify@yourdomain.com`
   - Put code in subject or body
4. Frontend polls `/api/verify/status` every 2 seconds
5. When email arrives and is processed, user is marked verified

## Webhook Validation

The inbound email webhook validates:

✅ **SPF Check**: Email passed SPF authentication  
✅ **DKIM Check**: Email has valid DKIM signature  
✅ **Sender Domain**: Email came from a .mil domain  
✅ **Code Match**: Extracted code matches a pending verification  
✅ **Code Expiry**: Code hasn't expired (30 minutes)

If any check fails, the request is rejected and logged as an abuse event.

## Troubleshooting

### Emails not reaching the webhook

**Problem**: SendGrid shows inbound emails but webhook isn't receiving them

**Solutions**:

1. Check MX records are configured correctly
2. Verify SendGrid Inbound Parse endpoint URL is correct
3. Check firewall/WAF isn't blocking SendGrid IPs
4. Check Netlify function logs for errors

### SPF/DKIM validation failing

**Problem**: Webhook is rejecting all emails with "authentication failed"

**Solutions**:

1. Verify SPF record is correct: `v=spf1 include:sendgrid.net ~all`
2. Ensure DKIM records are fully added to DNS (can take time to propagate)
3. Check that the .mil sender's domain has valid SPF/DKIM records themselves

### Code not being extracted

**Problem**: Email arrives but code isn't found

**Solutions**:

1. Code must be in format `VER-XXXXX` or just `XXXXX` (5+ alphanumeric chars)
2. Code can be in subject line or first part of body
3. Check the extraction regex in `netlify/functions/inbound-email.ts`

### Verification times out

**Problem**: User sends email but polling shows it as still pending

**Solutions**:

1. Check database logs for webhook events
2. Verify code hasn't expired (30 minutes)
3. Check if email is being processed as spam (check SendGrid logs)
4. Ensure database connection is working in webhook

## Monitoring

Monitor these metrics:

**Database:**

```sql
-- Check verification success rate
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
FROM email_verifications
WHERE created_at > now() - interval '24 hours';

-- Check abuse patterns
SELECT event_type, COUNT(*) as count
FROM email_verification_audit
WHERE event_type LIKE '%failed%'
  AND created_at > now() - interval '24 hours'
GROUP BY event_type;
```

**SendGrid:**

1. Go to **Activity > Search**
2. Filter by recipient domain: `yourdomain.com`
3. Check bounce rates and delivery status

**Netlify:**

1. Monitor function invocations and errors
2. Check execution time (should be < 2 seconds)
3. Monitor memory usage

## API Endpoints

### Verification Flow

**POST /.netlify/functions/verify-status/request**

Request a new verification code.

```json
{
  "email": "user@us.af.mil"
}
```

Response:

```json
{
  "verificationId": "uuid",
  "code": "VER-ABC12",
  "email": "user@us.af.mil",
  "expiresAt": "2024-10-19T11:05:00Z",
  "message": "Verification code generated..."
}
```

**GET /.netlify/functions/verify-status/status?email=user@us.af.mil**

Check verification status (poll this every 2 seconds).

Response when pending:

```json
{
  "email": "user@us.af.mil",
  "status": "pending",
  "code": "VER-ABC12",
  "timeRemainingSeconds": 1234
}
```

Response when verified:

```json
{
  "email": "user@us.af.mil",
  "status": "verified",
  "verifiedAt": "2024-10-19T10:10:00Z"
}
```

**POST /.netlify/functions/verify-status/resend**

Generate a new code if the first one expired.

```json
{
  "email": "user@us.af.mil"
}
```

### Webhook (Internal)

**POST /.netlify/functions/inbound-email**

SendGrid sends inbound emails here (automatic, no manual invocation needed).

Payload structure:

```json
{
  "from": "user@us.af.mil",
  "to": "verify@yourdomain.com",
  "subject": "VER-ABC12",
  "text": "...",
  "html": "<html>...</html>",
  "spf": { "result": "pass" },
  "dkim": {
    "domain.mil": { "result": "pass" }
  }
}
```

## Production Considerations

### 1. Email Rate Limiting

Current limits (configurable):

- 5 verification requests per email per hour
- 30-minute code expiration
- 10-minute polling window

Adjust in `netlify/functions/rate-limit.ts` and `verify-status.ts`.

### 2. Database Backups

The inbound verification system stores sensitive data:

- User emails and verification status
- SPF/DKIM validation results
- Audit logs

Ensure your Supabase/PostgreSQL backups are configured.

### 3. Logging & Compliance

All verification events are logged in `email_verification_audit` table including:

- Code generation
- Verification success/failure
- SPF/DKIM results
- Timestamp of verification

This provides a complete audit trail for compliance.

### 4. Error Handling

The webhook handles:

- Invalid JSON payloads (400)
- Missing verification code (400)
- SPF/DKIM failures (401)
- Expired codes (410)
- Code not found (404)
- Database errors (500)

All errors are logged with details for debugging.

## Security Notes

⚠️ **SPF/DKIM Validation is Critical**

Never trust email origin without verifying SPF/DKIM headers. This prevents:

- Spoofed .mil emails from non-military addresses
- Replay attacks
- Man-in-the-middle attacks

✅ **Code Expiration**

Codes expire after 30 minutes. This prevents:

- Brute force attacks
- Reuse of old codes
- Long-lived verification tokens

✅ **Rate Limiting**

Max 5 requests per email per hour. This prevents:

- Verification code enumeration
- Spam/DoS attacks
- Abuse of the inbound email system

## Next Steps

1. **Configure DNS MX records** (5-15 minutes)
2. **Set up SendGrid Inbound Parse** (5 minutes)
3. **Add SPF/DKIM records** (5 minutes, may take time to propagate)
4. **Test with a .mil email** (5 minutes)
5. **Monitor webhook logs** (ongoing)

If you encounter issues, check the troubleshooting section or review the webhook logs in Netlify.
