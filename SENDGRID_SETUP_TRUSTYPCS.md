# SendGrid Inbound Email Setup for trustypcs.com

This guide walks you through setting up inbound email verification for BaseList using your trustypcs.com domain with Netlify DNS.

**Time estimate:** 30-45 minutes  
**Difficulty:** Beginner-friendly

---

## Step 1: Log Into Netlify DNS Dashboard

1. Go to https://app.netlify.com
2. Select your **trustypcs.com** project
3. Click **Domain settings** (top menu)
4. Click **DNS settings** on the left sidebar
5. You should see your domain listed

Keep this tab open - you'll need it multiple times.

---

## Step 2: Add MX Records in Netlify DNS

MX records tell email servers where to send emails for your domain.

### In Netlify DNS Dashboard:

1. Scroll down to find **DNS records** section
2. Click **Add record** (usually a blue button)
3. Fill in the form:

   **Record 1 - Priority 1:**
   - **Type:** MX
   - **Name:** `@` (or leave blank - means root domain)
   - **Value:** `mx.sendgrid.net`
   - **Priority:** `1`
   - Click **Save**

   **Record 2 - Priority 10:**
   - **Type:** MX
   - **Name:** `@`
   - **Value:** `mx2.sendgrid.net`
   - **Priority:** `10`
   - Click **Save**

   **Record 3 - Priority 100:**
   - **Type:** MX
   - **Name:** `@`
   - **Value:** `mx3.sendgrid.net`
   - **Priority:** `100`
   - Click **Save**

You should now see 3 MX records for trustypcs.com pointing to SendGrid.

**Screenshot of what it looks like:**

```
Type   Name  Value                  Priority  TTL
MX     @     mx.sendgrid.net        1         3600
MX     @     mx2.sendgrid.net       10        3600
MX     @     mx3.sendgrid.net       100       3600
```

✅ **Save and move to step 3**

---

## Step 3: Set Up SendGrid Inbound Parse

Now tell SendGrid where to send emails it receives.

### In SendGrid Dashboard:

1. Go to https://app.sendgrid.com
2. Navigate to **Settings > Inbound Parse** (left sidebar)
3. Click **Create New Endpoint** (blue button, top right)
4. Fill in the form:
   - **Hostname:** `trustypcs.com`
   - **URL:** `https://yournetlifysite.netlify.app/.netlify/functions/inbound-email`

     ⚠️ **IMPORTANT:** Replace `yournetlifysite` with your actual Netlify site URL. If you don't know it:
     - Go to https://app.netlify.com
     - Select your BaseList project
     - Look for the "Site name" at the top (it's usually something like `abc123-xyz789.netlify.app`)
     - Your full URL: `https://YOUR_SITE_NAME.netlify.app/.netlify/functions/inbound-email`

   - **POST the raw, full MIME message:** ☑️ Check this box
   - **Spam Check:** ☑️ Check this box (optional but recommended)
   - **Open Tracking:** ☐ Leave unchecked
   - **Click Tracking:** ☐ Leave unchecked

5. Click **Create Endpoint**

You should see a confirmation message. Write down your webhook URL - you'll need it for testing.

✅ **Move to step 4**

---

## Step 4: Set Up DKIM Authentication

DKIM proves emails are genuine. This is critical for security.

### In SendGrid Dashboard:

1. Go to **Settings > Sender Authentication** (left sidebar)
2. Click **Authenticate Your Domain**
3. Select **DKIM** option
4. Click **Create DKIM**
5. Enter your domain: `trustypcs.com`
6. Click **Next**
7. Copy the CNAME records you see (usually 2-3 of them)

**Example of what you'll see:**

```
Host: k1._domainkey.trustypcs.com
Value: k1.trustypcs.com.sendgrid.net

Host: k2._domainkey.trustypcs.com
Value: k2.trustypcs.com.sendgrid.net

Host: selector._domainkey.trustypcs.com
Value: selector.trustypcs.com.sendgrid.net
```

### Add DKIM Records to Netlify DNS:

8. Go back to your Netlify DNS dashboard tab
9. For each CNAME record SendGrid gave you:
   - Click **Add record**
   - **Type:** CNAME
   - **Name:** (copy the Host part, e.g., `k1._domainkey`)
   - **Value:** (copy the Value part, e.g., `k1.trustypcs.com.sendgrid.net`)
   - Click **Save**

10. Repeat for each record until all DKIM records are added

11. Go back to SendGrid
12. Click **Verify DNS** (it may take 5-30 minutes to propagate)
13. Wait for confirmation "DNS verified"

✅ **Move to step 5**

---

## Step 5: Add SPF Record (Email Security)

SPF tells email servers that SendGrid is authorized to send emails from your domain.

### In Netlify DNS Dashboard:

1. Click **Add record**
2. Fill in:
   - **Type:** TXT
   - **Name:** `@` (root domain)
   - **Value:** `v=spf1 include:sendgrid.net ~all`
   - Click **Save**

3. **IMPORTANT:** If you already have an SPF record, you need to modify it instead of creating a new one:
   - Find your existing SPF record (starts with `v=spf1`)
   - Click **Edit**
   - Add `include:sendgrid.net` before the `~all` part
   - Example: `v=spf1 include:sendgrid.net include:yourexistingspf.com ~all`

✅ **Now verify everything is working**

---

## Step 6: Verify MX Records Are Working

Before testing, verify your MX records are correctly set up.

### Using command line (Mac/Linux):

```bash
nslookup -type=MX trustypcs.com

# You should see output like:
# trustypcs.com mail exchanger = 1 mx.sendgrid.net
# trustypcs.com mail exchanger = 10 mx2.sendgrid.net
# trustypcs.com mail exchanger = 100 mx3.sendgrid.net
```

### Using online tool:

1. Go to https://mxtoolbox.com/mxlookup.aspx
2. Enter `trustypcs.com`
3. Click **MX Lookup**
4. You should see SendGrid's 3 MX records listed

If you don't see them, wait 15-30 minutes for DNS to propagate, then try again.

✅ **If you see the SendGrid MX records, continue to testing**

---

## Step 7: Test the Setup

Now test that emails actually get received by your webhook.

### Option A: Using SendGrid Sandbox (Easiest)

SendGrid has a test email feature:

1. In SendGrid, go to **Inbound Parse** settings
2. Find your endpoint (trustypcs.com)
3. Look for a "Test" or "Send Test Email" button
4. Click it

You should see in your browser's console or server logs:

```
[INBOUND EMAIL] Received from: test@us.af.mil
```

### Option B: Send a Real Email (Best Test)

Send an email from a .mil account to `verify@trustypcs.com`:

1. **If you have access to a .mil email:**
   - Open your .mil email inbox (Outlook, Gmail on .mil account, etc.)
   - Compose a new email
   - **To:** `verify@trustypcs.com`
   - **Subject:** `VER-TEST12`
   - **Body:** `VER-TEST12`
   - Send the email

2. **If you don't have a .mil email yet:**
   - Use any email address (for now)
   - Send to `verify@trustypcs.com`
   - Subject: `VER-TEST12`
   - Send it

3. **Check Netlify function logs:**
   - Go to https://app.netlify.com
   - Select your BaseList project
   - Click **Functions** (top menu)
   - Click **inbound-email** function
   - Click **Invocations** tab
   - You should see the email was received (timestamp and status)

4. **Check SendGrid activity log:**
   - In SendGrid, go to **Activity > Search**
   - Filter by recipient: `trustypcs.com`
   - You should see your test email listed

✅ **If the email appears in both places, you're set up correctly!**

---

## Step 8: Create a Verification Email Address (Optional but Recommended)

Right now emails can go to any address at trustypcs.com. You might want to create a specific mailbox for verification emails.

### Option 1: Catch-All Mailbox (Simple)

- Let all emails to trustypcs.com be caught by a single mailbox
- No action needed - emails are sent to your webhook regardless

### Option 2: Specific Verification Email (Recommended)

Create an email address like `verify@trustypcs.com` or `noreply@trustypcs.com`:

**In your email provider (Gmail, Outlook, etc.):**

1. Create a new email account or alias
2. Forward all emails to your main email or a team inbox
3. Use this address in instructions: "Send emails to verify@trustypcs.com"

---

## Troubleshooting

### Problem: MX records not showing up in DNS lookup

**Solution:**

- Wait 5-30 minutes for DNS to propagate
- Clear your browser cache
- Try a different DNS lookup tool: https://mxtoolbox.com/mxlookup.aspx
- Check Netlify DNS dashboard to confirm records are there

### Problem: Email arrives but webhook doesn't receive it

**Solution:**

1. Check SendGrid Activity log: Go to **Activity > Search** and filter by your domain
2. Look for bounce, spam, or error messages
3. Check Netlify function logs for errors
4. Verify the webhook URL in SendGrid Inbound Parse matches your site

### Problem: DKIM verification stuck

**Solution:**

- DKIM can take 24-48 hours to fully propagate
- Try clicking "Verify" again after waiting
- Make sure CNAME records are exactly as SendGrid provided (no extra characters)

### Problem: SPF record conflicts

**Solution:**

- You can only have ONE SPF record per domain
- If you already have one, edit it to include SendGrid:
  ```
  v=spf1 include:sendgrid.net include:yourexistingspf.com ~all
  ```

---

## Next Steps After Setup

### 1. Test with Real .mil Email

When you have access to a .mil email account:

- Go to BaseList signup page
- Sign up with your .mil email
- Follow the inbound verification instructions
- Send the code to `verify@trustypcs.com`
- Check if you get verified

### 2. Monitor Logs

- Watch Netlify function logs during testing
- Check SendGrid activity log for delivery status
- Look for SPF/DKIM pass/fail results

### 3. Set Up Admin Dashboard

- Create an admin account
- Go to Family Verification section
- Test sponsor approval flow

---

## Quick Reference Checklist

- [ ] 3 MX records added in Netlify DNS (mx.sendgrid.net, mx2, mx3)
- [ ] DKIM records added in Netlify DNS (k1 and k2)
- [ ] SPF record added in Netlify DNS
- [ ] SendGrid Inbound Parse endpoint created
- [ ] Webhook URL points to correct Netlify site
- [ ] MX lookup confirms SendGrid records (nslookup or mxtoolbox.com)
- [ ] DKIM verified in SendGrid
- [ ] Test email received in webhook (check logs)
- [ ] SendGrid activity log shows inbound email

---

## Support & Questions

If something doesn't work:

1. **Check the logs:**
   - Netlify: Functions > inbound-email > Invocations
   - SendGrid: Activity > Search, filter by domain

2. **Review error messages:**
   - Look for SPF/DKIM failures
   - Check webhook response codes
   - Look for "authentication failed" messages

3. **Verify DNS propagation:**
   - https://mxtoolbox.com/mxlookup.aspx (MX records)
   - https://mxtoolbox.com/spf.aspx (SPF records)
   - https://mxtoolbox.com/dkim.aspx (DKIM records)

4. **Wait for propagation:**
   - DNS changes can take 5 minutes to 48 hours
   - Most commonly takes 15-30 minutes

---

**You're ready to set up! Start with Step 1 and work through each step in order.**
