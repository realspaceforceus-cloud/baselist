# BaseList Deployment Checklist

## Pre-Deployment Phase (Before Uploading Code)

### Infrastructure Setup
- [ ] cPanel account active with:
  - [ ] Node.js support enabled
  - [ ] MySQL 8.0+ installed
  - [ ] SSH access available
  - [ ] SSL/TLS certificate (auto-renewal preferred)
- [ ] Domain DNS configured to point to cPanel server
- [ ] Email forwarding setup for notifications@yourdomain.com
- [ ] Backup plan documented (frequency, retention)

### Security Preparation
- [ ] Generate strong JWT_SECRET (32+ random characters)
  ```bash
  openssl rand -base64 32
  # Example: X9kL2mN8pQ6rS4tU1vW3xY5zA7bC9dE0f=
  ```
- [ ] Generate MySQL password (16+ characters, mix of types)
  ```bash
  openssl rand -base64 20
  # Example: aBc1De2FgH3iJk4lMn5/Op==
  ```
- [ ] Prepare SSL certificate (use Let's Encrypt via cPanel)
- [ ] Create .env template with placeholders

### MySQL Database Setup
- [ ] Login to cPanel
- [ ] Navigate to: Databases → MySQL Databases
- [ ] Create database:
  ```
  Name: baselist_db
  ```
- [ ] Create user:
  ```
  Username: baselist_user
  Password: [use generated secure password from above]
  ```
- [ ] Assign privileges:
  - [ ] SELECT
  - [ ] INSERT
  - [ ] UPDATE
  - [ ] DELETE
  - [ ] CREATE
  - [ ] ALTER
  - [ ] INDEX
  - [ ] GRANT all to: baselist_user@localhost
- [ ] Test connection:
  ```bash
  mysql -h localhost -u baselist_user -p baselist_db
  # Should connect successfully
  ```

---

## Deployment Phase (Upload & Configure)

### Step 1: Create Application Directory
```bash
# SSH into server
cd /home/cpaneluser/
mkdir -p baselist
chmod 755 baselist
cd baselist
```
- [ ] Directory created
- [ ] Permissions set (755)

### Step 2: Upload Application Code
Choose one method:

**Method A: Git Clone** (Recommended)
```bash
cd /home/cpaneluser/baselist
git clone https://github.com/yourrepo/baselist.git .
# Or: git clone --depth 1 https://github.com/yourrepo/baselist.git .
```
- [ ] Repository cloned successfully
- [ ] All files present

**Method B: SCP Upload**
```bash
# From local machine
scp -r ./* cpaneluser@yourserver.com:/home/cpaneluser/baselist/
```
- [ ] All files uploaded
- [ ] No files corrupted

**Method C: cPanel File Manager**
- [ ] ZIP file uploaded
- [ ] Extracted successfully
- [ ] All files readable

### Step 3: Install Dependencies
```bash
cd /home/cpaneluser/baselist
npm install
npm install mysql2
```
- [ ] npm install completed without errors
- [ ] mysql2 package installed
- [ ] node_modules directory created
- [ ] package-lock.json generated

### Step 4: Build Application
```bash
npm run build
```
- [ ] Build completed successfully
- [ ] dist/spa/ directory created (frontend)
- [ ] dist/server/ directory created (backend)
- [ ] No TypeScript errors
- [ ] No build warnings (check logs)

### Step 5: Create Environment File
```bash
cat > /home/cpaneluser/baselist/.env << 'EOF'
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=baselist_user
MYSQL_PASSWORD=YOUR_SECURE_PASSWORD_HERE
MYSQL_DATABASE=baselist_db

# Application
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Security - Change these to secure random values
JWT_SECRET=YOUR_RANDOM_JWT_SECRET_HERE
PING_MESSAGE="BaseList Production"
EOF
```
- [ ] .env file created
- [ ] MYSQL_PASSWORD updated with actual password
- [ ] JWT_SECRET updated with secure value
- [ ] CORS_ORIGIN updated with actual domain
- [ ] File not readable by other users
- [ ] No secrets in version control

### Step 6: Set Proper Permissions
```bash
chmod 600 /home/cpaneluser/baselist/.env
chmod 755 /home/cpaneluser/baselist
chmod -R 755 /home/cpaneluser/baselist/dist
chmod +x /home/cpaneluser/baselist/dist/server/production.mjs
```
- [ ] .env readable only by owner (600)
- [ ] dist/ executable (755)
- [ ] Startup file executable (+x)
- [ ] No world-readable secrets

### Step 7: Initialize MySQL Database
```bash
# Connect to MySQL
mysql -h localhost -u baselist_user -p baselist_db

# Then run migration script
mysql -h localhost -u baselist_user -p baselist_db < migration.sql
```

**Or save migration as file:**
```bash
# Create migration.sql with all CREATE TABLE statements
# Then run:
mysql -h localhost -u baselist_user -p baselist_db < /home/cpaneluser/baselist/migration.sql
```

Verify tables created:
```bash
mysql -h localhost -u baselist_user -p baselist_db
SHOW TABLES;
# Should show: users, listings, message_threads, messages, transactions, 
#             ratings, reports, verifications, bases, refresh_tokens, audit_log
```

- [ ] All 11 tables created
- [ ] No errors during migration
- [ ] Tables have correct structure
- [ ] Indexes created successfully

### Step 8: Setup Node.js Application in cPanel

1. Login to cPanel
2. Navigate to: **Software → Setup Node.js App**
3. Click **Create Application**
4. Fill in form:
   ```
   Node.js version: 22.x (or latest available)
   Application Root: /home/cpaneluser/baselist
   Application Startup File: dist/server/production.mjs
   Application URL: yourdomain.com
   (or select from dropdown if domain exists)
   Application Mode: production
   ```
5. Click **Create**

- [ ] Application created in cPanel
- [ ] Assigned port noted (e.g., 8080)
- [ ] Status shows "Running" ✓
- [ ] Reverse proxy created automatically

### Step 9: Configure Reverse Proxy (If needed)

cPanel typically auto-configures, but verify:
- [ ] Apache VirtualHost configured
- [ ] ProxyPass configured
- [ ] ProxyPassReverse configured
- [ ] Domain resolves to application

### Step 10: Verify SSL/TLS Certificate

1. Go to cPanel: **Security → AutoSSL**
2. Force certificate issuance or
3. Go to: **Domains → yourdomain.com → Manage SSL/TLS**
4. Verify "Certificate Status" shows "Active"

- [ ] SSL certificate installed
- [ ] Auto-renewal enabled
- [ ] HTTPS accessible (https://yourdomain.com)
- [ ] Mixed content warnings resolved

---

## Post-Deployment Verification

### Test 1: Frontend Accessibility
```bash
# Test from command line
curl -I https://yourdomain.com

# Expected: HTTP/2 200
```
- [ ] HTTPS redirects working
- [ ] Frontend loads (HTTP 200)
- [ ] No SSL warnings
- [ ] Page renders in browser

### Test 2: API Health Check
```bash
curl https://yourdomain.com/api/ping

# Expected JSON response: 
# { "message": "BaseList Production" }
```
- [ ] API responds
- [ ] Returns correct message
- [ ] CORS headers present

### Test 3: Database Connectivity
```bash
# In your app logs or test endpoint
# Should see successful MySQL connection

# Check cPanel logs:
# tail -f /home/cpaneluser/baselist/logs/error.log
```
- [ ] MySQL connection successful
- [ ] No connection timeout errors
- [ ] Query execution working

### Test 4: Authentication Flow
1. Go to https://yourdomain.com
2. Click login
3. Try login with test credentials
4. Check cookies in browser dev tools

- [ ] Login form loads
- [ ] Accepts credentials
- [ ] Access token set
- [ ] Redirect to home succeeds

### Test 5: Create Listing (End-to-End)
1. Login as user
2. Click POST
3. Fill in listing details
4. Submit
5. Check if visible on home

- [ ] Form submits
- [ ] Database insert succeeds
- [ ] Listing appears in list
- [ ] No errors in logs

### Test 6: Messages/Transactions
1. Contact another user
2. Send message
3. Mark transaction complete
4. Verify two-stage flow
5. Dispute if needed

- [ ] Messages send/receive
- [ ] Transaction statuses update
- [ ] Disputes work
- [ ] Auto-complete timer set

### Test 7: Admin Access
1. Login as admin user
2. Navigate to /admin
3. Check all sections load
4. Test one moderation action

- [ ] Admin panel accessible
- [ ] All sections render
- [ ] Data displays
- [ ] Actions execute (no errors)

### Test 8: Logging & Monitoring
```bash
# Check application logs
cPanel → Setup Node.js App → Select App → View Logs

# Should show:
# - Successful startup
# - MySQL connection
# - No critical errors
```
- [ ] Logs accessible
- [ ] No startup errors
- [ ] Database queries logging
- [ ] Request logs present

---

## Production Hardening

### Security Measures
- [ ] HTTPS enforced (redirect http → https)
- [ ] Secure headers set:
  - [ ] Strict-Transport-Security
  - [ ] X-Content-Type-Options
  - [ ] X-Frame-Options
  - [ ] Content-Security-Policy
- [ ] Rate limiting verified (5 login attempts/15 min)
- [ ] Cookie flags set:
  - [ ] HttpOnly ✓ (server-side)
  - [ ] Secure ✓ (HTTPS only)
  - [ ] SameSite ✓ (CSRF protection)
- [ ] CORS whitelist verified (only yourdomain.com)
- [ ] .env file not accessible via web
- [ ] database credentials not in logs
- [ ] Error messages don't leak sensitive info

### Performance Optimization
- [ ] MySQL connection pooling enabled
- [ ] Query optimization verified
- [ ] Database indexes created
- [ ] File compression enabled (gzip)
- [ ] Cache headers configured
- [ ] CDN considered for static assets

### Monitoring & Backups
- [ ] Automated daily MySQL backups configured
- [ ] Backup retention: 14+ days
- [ ] Backup testing scheduled (weekly)
- [ ] Error alerts configured
- [ ] Uptime monitoring enabled (24/7)
- [ ] Performance monitoring setup

### Documentation
- [ ] Deployment procedure documented
- [ ] Emergency contacts listed
- [ ] Recovery procedure documented
- [ ] Admin account credentials secure
- [ ] Backup restoration procedure tested

---

## Post-Deployment Maintenance (First Week)

### Day 1
- [ ] Monitor error logs continuously
- [ ] Check database connection stability
- [ ] Verify all pages load correctly
- [ ] Test on different devices/browsers
- [ ] Monitor server resource usage

### Day 2-3
- [ ] Run load test (simulate users)
- [ ] Check auto-completion timer works
- [ ] Test all moderation features
- [ ] Verify email notifications (if enabled)
- [ ] Check backup completion

### Day 4-7
- [ ] Review admin logs for unusual activity
- [ ] Test disaster recovery procedure
- [ ] Monitor API response times
- [ ] Check database query performance
- [ ] Plan capacity expansion if needed

---

## Rollback Plan (If Issues)

If critical issues occur:

### Quick Rollback (Restart)
```bash
# Via cPanel: Setup Node.js App → Restart
# Or via SSH:
killall node
npm start  # Will auto-restart via cPanel
```

### Database Rollback
```bash
# If data corruption, restore from backup:
mysql baselist_db < backup-2025-01-15.sql
```

### Code Rollback
```bash
cd /home/cpaneluser/baselist
git revert HEAD
npm run build
# Restart via cPanel
```

- [ ] Rollback procedure documented
- [ ] Team trained on rollback
- [ ] Recovery time target: 15 minutes
- [ ] Backup tested before deployment

---

## Sign-Off

- [ ] Project Manager Sign-off: _________________ Date: _____
- [ ] System Administrator Sign-off: _________________ Date: _____
- [ ] QA/Testing Sign-off: _________________ Date: _____
- [ ] Security Review Sign-off: _________________ Date: _____

---

## Deployment Complete! ✅

**Application:** BaseList  
**Environment:** Production  
**Server:** cPanel + MySQL  
**Date Deployed:** _______________  
**Deployed By:** _______________  
**Status:** LIVE

**Post-Deployment Contacts:**
- Technical Issues: [Contact Info]
- Database Issues: [Contact Info]
- General Support: [Contact Info]

---

## Useful Commands Reference

### Monitor Application
```bash
# View logs
tail -f /home/cpaneluser/baselist/logs/error.log

# Check process
ps aux | grep node

# Check port
netstat -tulpn | grep 8080
```

### MySQL Management
```bash
# Connect to database
mysql -h localhost -u baselist_user -p baselist_db

# Common commands
SHOW DATABASES;
USE baselist_db;
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM listings;
```

### Restart Application
```bash
# Via cPanel: Setup Node.js App → Restart App
# Or kill and let cPanel restart:
killall node
```

### Check Disk Space
```bash
df -h
du -sh /home/cpaneluser/baselist
```

### Emergency Contact
```bash
# If app down, check:
1. MySQL connectivity
2. Disk space (df -h)
3. Application logs
4. cPanel Node.js status
5. Server CPU/Memory
```

---

## Success Criteria ✅

Your deployment is successful when:

1. ✅ https://yourdomain.com loads in browser
2. ✅ /api/ping returns JSON response
3. ✅ Login works with valid credentials
4. ✅ Can create and view listings
5. ✅ Messaging between users works
6. ✅ Admin panel accessible and functional
7. ��� No errors in application logs
8. ✅ Database queries executing successfully
9. ✅ 72-hour auto-complete timer active
10. ✅ Backups running on schedule

**All criteria met = PRODUCTION READY! 🎉**
