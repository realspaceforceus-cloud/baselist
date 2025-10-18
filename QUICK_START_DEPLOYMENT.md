# BaseList Quick Start Deployment

## TL;DR - Deploy in 10-15 Minutes

### Step 1: cPanel Database Setup (3 min)
```
cPanel → Databases → MySQL Databases
Create:
- Database: baselist_db
- User: baselist_user
- Password: [generate strong password]
```

### Step 2: Upload & Build Code (5 min)
```bash
cd /home/cpaneluser
git clone https://github.com/yourrepo/baselist.git baselist
cd baselist
npm install
npm run build
```

### Step 3: Setup Node.js App (2 min)
```
cPanel → Setup Node.js App → Create Application
- Root: /home/cpaneluser/baselist
- Startup File: dist/server/production.mjs
- Domain: yourdomain.com
```

### Step 4: Web-Based Installer (5 min) ⭐ NEW!
```
1. Visit: https://yourdomain.com/setup
2. Fill form with database credentials
3. Create admin account
4. Click "Start Installation"
5. Done! ✅ Auto-redirects to login
```

**Total Time: 15 minutes**

---

## What Installer Does Automatically

✅ Test MySQL connection  
✅ Create all 11 database tables  
✅ Create admin user with bcrypt hashing  
✅ Generate .env file  
✅ Create setup completion flag  
✅ Disable itself (one-time execution)  

**Zero manual SQL commands needed!** 🎉

---

## Detailed Steps

### 1️⃣ Create Database in cPanel (3 min)

**Login to cPanel**
```
cPanel Dashboard → Databases → MySQL Databases
```

**Create Database**
- Database Name: `baselist_db`
- Click "Create Database"

**Create User**
- Username: `baselist_user`
- Password: [Generate strong password - save it!]
- Click "Create User"

**Assign Privileges**
- User: `baselist_user`
- Database: `baselist_db`
- Check "ALL PRIVILEGES"
- Click "Make Changes"

**Result:** You now have MySQL credentials
```
Host: localhost
Database: baselist_db
Username: baselist_user
Password: [your_password]
```

---

### 2️⃣ Upload Code & Dependencies (5 min)

**Via SSH (Recommended)**
```bash
# Login to cPanel server
ssh cpaneluser@yourserver.com

# Navigate to home directory
cd /home/cpaneluser

# Clone repository
git clone https://github.com/yourrepo/baselist.git baselist
cd baselist

# Install dependencies
npm install

# Build application
npm run build
```

**Done!** Code is ready. You should see:
- `dist/spa/` - React frontend
- `dist/server/` - Express backend

---

### 3️⃣ Setup Node.js Application in cPanel (2 min)

**Login to cPanel**

**Navigate to Setup Node.js App**
```
Software → Setup Node.js App → Create Application
```

**Fill Form**
```
Node.js version: 22.x (or latest)
Application Root: /home/cpaneluser/baselist
Application Startup File: dist/server/production.mjs
Application URL: yourdomain.com
(or your desired subdomain)
```

**Click "Create"**

✅ cPanel will:
- Create reverse proxy
- Set up Nginx/Apache
- Start Node.js app
- Monitor & auto-restart

---

### 4️⃣ Run Web-Based Installer ⭐ (5 min)

**Visit Setup Wizard**
```
https://yourdomain.com/setup
```

**You should see:**
- Beautiful "BaseList Setup Wizard" form
- Blue database icon
- Input fields for database credentials

**Fill Database Configuration**
```
MySQL Host: localhost
Port: 3306
Database Name: baselist_db
Username: baselist_user
Password: [paste from Step 1]
```

**Fill Admin Account**
```
Admin Username: admin (or your choice)
Admin Password: [create strong password, min 8 chars]
Admin Email: admin@yourdomain.com
Sample Data: ✓ (check to include sample)
```

**Click "Start Installation"**

**Watch Progress**
The installer will run 4 steps:
1. ✅ Test Database Connection
2. ✅ Create Database Tables
3. ✅ Create Admin User
4. ✅ Finalize Setup

**Wait 5-10 seconds...**

**Auto-Redirect** → You're done! 🎉

---

## After Installation

### Login to Application
```
URL: https://yourdomain.com
Username: [admin username you created]
Password: [admin password you created]
```

### First Actions
1. ✅ Login to app
2. ✅ Visit admin panel (/admin)
3. ✅ Create test users
4. ✅ Create listings
5. ✅ Test messaging

### Important: Update .env File

The installer generates `.env` but you should update:

**1. Update JWT_SECRET**
```bash
# Generate secure value
openssl rand -base64 32

# Update .env:
JWT_SECRET=your_secure_random_value
```

**2. Update CORS_ORIGIN**
```
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

**3. Restart Node.js App**
- cPanel → Setup Node.js App → Restart App

---

## Verify Installation

### Check Website is Live
```
https://yourdomain.com → Should load home page
```

### Check Admin Panel
```
https://yourdomain.com/admin → Login with admin account
```

### Check Database
```bash
# Via SSH:
mysql -h localhost -u baselist_user -p baselist_db
SHOW TABLES;  # Should show 11 tables
SELECT COUNT(*) FROM users;  # Should show 1
```

### Check Setup Completion
```bash
# Should exist:
ls -la /home/cpaneluser/baselist/.setup-complete

# Should contain DB config:
cat /home/cpaneluser/baselist/.env
```

---

## Common Issues & Solutions

### "Cannot reach https://yourdomain.com"
- **Check:** Domain DNS points to server
- **Check:** cPanel Node.js app status
- **Solution:** Wait 5 min for DNS to propagate

### "Setup page won't load"
- **Check:** Application is running in cPanel
- **Check:** Port isn't blocked
- **Solution:** Restart Node.js app in cPanel

### "Database connection failed"
- **Check:** Credentials from cPanel
- **Check:** MySQL is running
- **Solution:** Test credentials: 
  ```bash
  mysql -h localhost -u baselist_user -p baselist_db
  ```

### "Admin login doesn't work"
- **Check:** Username and password from setup
- **Check:** Browser cookies enabled
- **Solution:** Clear browser cache and try again

### "Installation already complete"
- **Info:** `.setup-complete` flag file exists
- **To Reset:** Delete `.setup-complete` file and retry setup

---

## What Gets Created

### Database Tables (11 total)
```
✓ users
✓ bases
�� listings
✓ message_threads
✓ messages
✓ transactions
✓ ratings
✓ reports
✓ verifications
✓ refresh_tokens
✓ audit_log
```

### Configuration Files
```
✓ .env             (database credentials)
✓ .setup-complete  (flag file)
```

### Admin Account
```
Username: [Your choice]
Password: [Your choice]
Email: [Your choice]
Role: Admin (full access)
```

---

## Next Steps (Optional)

### 1. Configure HTTPS
```
cPanel → SSL/TLS Status
(Usually auto-enabled via AutoSSL)
```

### 2. Setup Backups
```
cPanel → Backup → Backup Configuration
- Frequency: Daily
- Retention: 14+ days
```

### 3. Configure Email
```
Admin Panel → Settings
- Add email for notifications
- Test email delivery
```

### 4. Create Additional Users
```
Admin Panel → Users → Create User
- Can assign roles (member, moderator)
- Can edit profiles
- Can verify users
```

### 5. Monitor Performance
```
cPanel → Metrics or use:
- Application logs
- MySQL performance
- Disk space
```

---

## Deployment Checklist

- [ ] Database created in cPanel
- [ ] Code uploaded and built
- [ ] Node.js app created in cPanel
- [ ] https://yourdomain.com/setup accessible
- [ ] Installer form displays correctly
- [ ] Database credentials filled in
- [ ] Admin account created
- [ ] Installation completes (4 steps)
- [ ] Auto-redirects to home page
- [ ] Can login with admin account
- [ ] Admin panel accessible
- [ ] Database shows 11 tables
- [ ] .env file created
- [ ] .setup-complete flag exists
- [ ] HTTPS working (if using SSL)

---

## Support Commands

### SSH Access
```bash
# Connect to server
ssh cpaneluser@yourserver.com

# View application logs
tail -f /home/cpaneluser/baselist/logs/error.log

# Check processes
ps aux | grep node

# Check MySQL
mysql -u baselist_user -p baselist_db -e "SHOW TABLES;"
```

### cPanel Access
```
Dashboard → Software → Setup Node.js App
- View app status
- Restart application
- View logs
- Change settings
```

### Database Access
```
cPanel → phpMyAdmin (if available)
Or via command line:
mysql -h localhost -u baselist_user -p baselist_db
```

---

## Performance Expectations

| Metric | Value |
|--------|-------|
| Setup Time | 10-15 min |
| Installation (backend) | 5-10 sec |
| First Page Load | <2 sec |
| API Response | <200ms |
| Database Queries | <100ms |

---

## Security Checklist

- [ ] HTTPS enabled (Let's Encrypt)
- [ ] Strong admin password (8+ chars, mixed)
- [ ] Database password strong (from cPanel)
- [ ] .env file has 600 permissions (owner only)
- [ ] JWT_SECRET updated (random value)
- [ ] CORS_ORIGIN set to your domain
- [ ] No test/demo accounts left
- [ ] Backups configured
- [ ] Monitoring enabled

---

## Success Criteria ✅

✅ Can visit https://yourdomain.com and see home page  
✅ Can login with admin account  
✅ Can access admin panel (/admin)  
✅ Can create listings (POST button)  
✅ Database shows 11 tables  
✅ .env file exists with credentials  
✅ Logs show no errors  
✅ HTTPS working  

**All criteria met = DEPLOYED SUCCESSFULLY! 🎉**

---

## Estimated Costs

| Item | Time | Cost |
|------|------|------|
| Database Setup | 3 min | Free (cPanel) |
| Code Upload | 5 min | Free (Git) |
| Node.js Setup | 2 min | Free (cPanel) |
| Installer | 5 min | Free (automated) |
| **Total** | **15 min** | **FREE** ✅ |

---

## Questions?

**See full documentation:**
- INSTALLER_GUIDE.md - Complete installer details
- DEPLOYMENT_REVIEW.md - Technical deep dive
- CPANEL_DEPLOYMENT_GUIDE.md - Advanced setup
- TESTING_REPORT.md - Feature verification

---

## 🚀 You're Ready!

**Everything is set up and ready to deploy!**

1. Follow the 4 steps above
2. Visit /setup
3. Fill the form
4. Done! ✅

**Deployment time: 15 minutes**  
**Difficulty: Easy**  
**Manual steps: None (all automated!)**

---

**Let's deploy BaseList! 🎉**
