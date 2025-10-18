# Quick Start: cPanel Deployment Guide

## Step-by-Step Deployment (30 minutes)

### Phase 1: Prepare cPanel (5 minutes)

#### 1.1 Create MySQL Database
```
cPanel Dashboard → Databases → MySQL Databases

Database Name: baselist_db
Username: baselist_user
Password: [Generate secure password]
Privileges: ALL
```

#### 1.2 Create cPanel User Directory
```bash
SSH into server:
mkdir -p /home/cpaneluser/baselist
cd /home/cpaneluser/baselist
```

### Phase 2: Upload & Build Code (10 minutes)

#### 2.1 Upload Code (Choose one method)

**Method A: Git Clone (Recommended)**
```bash
cd /home/cpaneluser/baselist
git clone https://github.com/yourrepo/baselist.git .
```

**Method B: SCP Upload**
```bash
scp -r ./dist cpaneluser@cpanelhost:/home/cpaneluser/baselist/
scp -r ./server cpaneluser@cpanelhost:/home/cpaneluser/baselist/
scp package.json cpaneluser@cpanelhost:/home/cpaneluser/baselist/
```

#### 2.2 Install Dependencies
```bash
cd /home/cpaneluser/baselist
npm install

# Install MySQL driver (CRITICAL FOR MYSQL)
npm install mysql2
```

#### 2.3 Build Application
```bash
npm run build
# Creates:
# - dist/spa/  (React frontend)
# - dist/server/ (Express backend)
```

### Phase 3: Configure Environment (5 minutes)

#### 3.1 Create `.env` file
```bash
cat > /home/cpaneluser/baselist/.env << 'EOF'
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=baselist_user
MYSQL_PASSWORD=your_secure_password_here
MYSQL_DATABASE=baselist_db

# Application
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
PING_MESSAGE="BaseList - Live on cPanel"

# JWT (use strong random strings)
JWT_SECRET=your_random_jwt_secret_here
EOF
```

**⚠️ Security Note:**
- Make `.env` readable only by your user: `chmod 600 .env`
- Change `your_secure_password_here` to actual password from step 1.1
- Use strong random strings for JWT_SECRET

#### 3.2 Verify Permissions
```bash
chmod 755 /home/cpaneluser/baselist
chmod 644 /home/cpaneluser/baselist/.env
chmod +x /home/cpaneluser/baselist/dist/server/production.mjs
```

### Phase 4: Setup Node.js App in cPanel (5 minutes)

1. Go to **cPanel Dashboard → Software → Setup Node.js App**

2. Click **Create Application** with these settings:
   ```
   Node.js version: 22.x (or latest)
   Application Root: /home/cpaneluser/baselist
   Application Startup File: dist/server/production.mjs
   Application URL: yourdomain.com
   (or: yoursubdomain.yourdomain.com)
   ```

3. Click **Create** and note the assigned port (e.g., 8080)

4. cPanel will:
   - Set up reverse proxy automatically
   - Create an Nginx configuration
   - Start the Node.js application
   - Monitor and restart on crashes

### Phase 5: Verify Deployment (5 minutes)

#### 5.1 Check Application Status
```bash
# In cPanel Setup Node.js App section, you'll see:
- Application is running ✓
- Port: 8080
- Status: Active
```

#### 5.2 Test Endpoints
```bash
# Test frontend
curl -I https://yourdomain.com/

# Test API health check
curl https://yourdomain.com/api/ping

# Should return: { "message": "BaseList - Live on cPanel" }
```

#### 5.3 Check Logs
```bash
# View application logs in cPanel:
# Software → Node.js Manager → Select App → View Logs
# Or via SSH:
tail -f /home/cpaneluser/baselist/logs/error.log
```

---

## Minimal MySQL Setup (Without Code Changes)

**For quick testing** without modifying `server/data/store.ts`:

1. Create database and user (steps above)
2. Import schema: 
```bash
mysql -u baselist_user -p baselist_db < migration.sql
```
3. Deploy with current in-memory storage
4. Migrate code to MySQL connections later

---

## Database Migration Scripts

### Initial Schema Load

Save as `migration.sql`:

```sql
-- Users table with indexes
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(255),
  base_id VARCHAR(36),
  role ENUM('member', 'moderator', 'admin') DEFAULT 'member',
  status ENUM('active', 'suspended', 'banned') DEFAULT 'active',
  is_dow_verified BOOLEAN DEFAULT FALSE,
  verified BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_base_id (base_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  seller_id VARCHAR(36) NOT NULL,
  base_id VARCHAR(36) NOT NULL,
  status ENUM('active', 'hidden', 'sold') DEFAULT 'active',
  price DECIMAL(10, 2),
  is_free BOOLEAN DEFAULT FALSE,
  photos JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (base_id) REFERENCES bases(id),
  INDEX idx_seller (seller_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Message threads
CREATE TABLE IF NOT EXISTS message_threads (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  participants JSON NOT NULL,
  status ENUM('active', 'completed', 'disputed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  INDEX idx_listing (listing_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  type ENUM('user', 'system') DEFAULT 'user',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  INDEX idx_thread (thread_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions with two-stage completion
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('pending_complete', 'completed', 'disputed') DEFAULT 'pending_complete',
  marked_complete_by VARCHAR(36),
  marked_complete_at TIMESTAMP NULL,
  confirmed_by JSON,
  completed_at TIMESTAMP NULL,
  auto_completed_at TIMESTAMP NULL,
  dispute_raised_by VARCHAR(36),
  dispute_reason TEXT,
  rating_by_user JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL,
  rater_id VARCHAR(36) NOT NULL,
  rated_user_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  UNIQUE KEY unique_rating (thread_id, rater_id),
  INDEX idx_user (rated_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36),
  reporter_id VARCHAR(36) NOT NULL,
  reason VARCHAR(255),
  description TEXT,
  status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
  resolved_by VARCHAR(36),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verifications
CREATE TABLE IF NOT EXISTS verifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(36),
  review_notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bases
CREATE TABLE IF NOT EXISTS bases (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(20) UNIQUE,
  region VARCHAR(255),
  timezone VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_abbr (abbreviation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  device_id VARCHAR(255),
  revoked_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(255) NOT NULL,
  details JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_time (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Load it:
```bash
mysql -u baselist_user -p baselist_db < migration.sql
```

---

## Post-Deployment Checklist

- [ ] Application running (`cPanel → Setup Node.js App`)
- [ ] Frontend loads at https://yourdomain.com
- [ ] API responds to `/api/ping`
- [ ] Login page works
- [ ] Database accessible from Node.js
- [ ] Logs show no errors
- [ ] HTTPS redirects working (domain → https://)
- [ ] Set up automated backups in cPanel

---

## Troubleshooting

### App Won't Start
```bash
# Check for startup errors
cPanel → Setup Node.js App → Select App → View Logs

# Common issues:
# - .env not found
# - MySQL credentials wrong
# - Port already in use
```

### MySQL Connection Fails
```bash
# Verify credentials
mysql -u baselist_user -p baselist_db -h localhost

# Check if MySQL running
systemctl status mysql

# Verify user privileges
mysql -u root -p
GRANT ALL PRIVILEGES ON baselist_db.* TO 'baselist_user'@'localhost';
FLUSH PRIVILEGES;
```

### Performance Issues
- Check memory usage: `free -h`
- Check MySQL status: `mysql -u root -p -e "SHOW STATUS;"`
- Review Node.js logs for slow queries

---

## Next: Code Migration to MySQL

After deployment is working, to fully utilize MySQL:

1. Replace in-memory store with MySQL queries
2. Add connection pooling
3. Implement caching layer
4. Set up automated backups

See `DEPLOYMENT_REVIEW.md` for detailed MySQL migration guide.
