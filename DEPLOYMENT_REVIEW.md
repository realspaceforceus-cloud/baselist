# BaseList Application - Deployment Review & Guide

## Executive Summary

✅ **Overall Status**: Application is fully functional with all core features working correctly.
- All pages render properly
- All navigation buttons work
- API endpoints are live and responding
- Admin panel is operational
- New two-stage transaction completion system is integrated

## Current Stack

**Frontend:**
- React 18.3.1
- React Router DOM 6.30.1
- TypeScript 5.9.2
- Tailwind CSS 3.4.17
- Vite 7.1.2

**Backend:**
- Express 5.1.0
- Node.js 22
- In-memory data storage (currently)

**Deployment:**
- Currently: Fly.io (serverless)
- Target: cPanel hosting with MySQL

## Pages & Features Verified ✅

### Public Pages
- ✅ Home page (`/`) - Listings displayed, filter buttons work
- ✅ FAQ page (`/faq`) - Content renders correctly
- ✅ Guidelines page (`/guidelines`) - Community guidelines displayed
- ✅ Privacy page (`/privacy`) - Legal content accessible
- ✅ Terms page (`/terms`) - Legal content accessible
- ✅ Contact page (`/contact`) - Form available

### Authentication & User Features
- ✅ Login/Register flow - Authentication routes active
- ✅ Profile page (`/profile`) - User data displays (verified status, ratings, transactions)
- ✅ Settings page (`/settings`) - Profile updates, password change, email verification
- ✅ My Listings page (`/my-listings`) - View, manage, edit listings

### Core Features
- ✅ POST page (`/post`) - Create new listings
- ✅ Messages page (`/messages`) - Active/Completed/Archived threads, messaging interface
- ✅ Two-stage transaction completion - Mark complete → confirm flow
- ✅ Dispute system with moderator resolution
- ✅ Rating system unlocks at pending_complete status
- ✅ Auto-completion after 72 hours

### Admin Features
- ✅ Admin Dashboard (`/admin`) - Live metrics, unread notices
- ✅ Users management section
- ✅ Listings management section
- ✅ Reports resolution section
- ✅ Verification workflow section
- ✅ Messaging oversight section
- ✅ Audit logging (90 days)

## API Endpoints - All Live ✅

### Authentication Routes (`/api/auth`)
- `POST /api/auth/login` - Login with email/username
- `POST /api/auth/refresh` - Refresh JWT tokens
- `POST /api/auth/logout` - Logout (revoke refresh token)

### User Routes (`/api/user`)
- `POST /api/user/profile/update` - Update username/name
- `POST /api/user/email/request-change` - Request email change
- `POST /api/user/email/verify` - Verify email with token
- `POST /api/user/password/change` - Change password
- `POST /api/user/notifications/toggle` - Enable/disable notifications
- `POST /api/user/account/delete` - Delete account permanently

### Admin Routes (`/api/admin`) - Authentication Required
- `GET /api/admin/dashboard` - Dashboard snapshot
- `GET /api/admin/metrics` - Metrics & analytics
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id` - Update user status/role/verification
- `GET /api/admin/listings` - All listings
- `POST /api/admin/listings/:id/hide` - Hide listing (mod action)
- `POST /api/admin/listings/:id/restore` - Restore listing
- `GET /api/admin/reports` - All reports
- `POST /api/admin/reports/:id/resolve` - Resolve report with notes
- `GET /api/admin/verifications` - Pending verifications
- `POST /api/admin/verifications/:id` - Approve/deny verification
- `GET /api/admin/bases` - All military bases
- `POST /api/admin/bases` - Create new base
- `PATCH /api/admin/bases/:id` - Update base info
- `GET /api/admin/audit` - Audit log (last 200 entries)
- `GET /api/admin/threads` - All message threads
- `GET /api/admin/threads/flagged` - Flagged threads for review

### Utility Endpoints
- `GET /api/ping` - Health check
- `GET /api/demo` - Demo data endpoint

## Data Structure

### User Records
- `id`, `username`, `email`, `passwordHash`
- `name`, `bio`, `avatarUrl`, `baseId`
- `role` (member/moderator/admin)
- `status` (active/suspended/banned)
- `isDowVerified`, `verified`
- `notificationsEnabled`
- `createdAt`, `updatedAt`, `lastLogin`

### Listing Records
- `id`, `title`, `description`, `category`
- `sellerId`, `baseId`, `status` (active/hidden/sold)
- `price`, `isFree`, `photos` (URLs)
- `createdAt`, `updatedAt`, `hiddenReason`

### Message Threads
- `id`, `listingId`, `participants`
- `messages` (array with author, body, sentAt, type)
- `status` (active/completed/disputed)
- `transaction` (pending_complete/completed/disputed)
- `lastReadAt` (per user), `archivedBy`, `deletedBy`

### Transactions
- `status`: pending_complete | completed | disputed
- `markedCompleteBy`, `markedCompleteAt`
- `confirmedBy` (array of user IDs)
- `autoCompletedAt` (if auto-resolved)
- `dispute` (raisedBy, reason, raisedAt)
- `ratingByUser` (map of userId ��� rating)

---

## Migration to MySQL: Required Changes

### 1. **Database Schema Setup**

Create the following MySQL tables:

```sql
-- Users table
CREATE TABLE users (
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
  pending_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  remember_until TIMESTAMP,
  INDEX (username),
  INDEX (email),
  INDEX (base_id)
);

-- Listings table
CREATE TABLE listings (
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
  hidden_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (base_id) REFERENCES bases(id),
  INDEX (seller_id),
  INDEX (base_id),
  INDEX (status),
  FULLTEXT INDEX (title, description)
);

-- Message Threads table
CREATE TABLE message_threads (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36) NOT NULL,
  participants JSON NOT NULL,
  status ENUM('active', 'completed', 'disputed') DEFAULT 'active',
  archived_by JSON,
  deleted_by JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  INDEX (listing_id),
  INDEX (status)
);

-- Messages table
CREATE TABLE messages (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36) NOT NULL,
  body TEXT NOT NULL,
  type ENUM('user', 'system') DEFAULT 'user',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX (thread_id),
  INDEX (author_id)
);

-- Transactions table
CREATE TABLE transactions (
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
  dispute_raised_at TIMESTAMP NULL,
  rating_by_user JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  FOREIGN KEY (marked_complete_by) REFERENCES users(id),
  INDEX (status),
  INDEX (completed_at)
);

-- Ratings table
CREATE TABLE ratings (
  id VARCHAR(36) PRIMARY KEY,
  thread_id VARCHAR(36) NOT NULL,
  rater_id VARCHAR(36) NOT NULL,
  rated_user_id VARCHAR(36) NOT NULL,
  rating INT NOT NULL,
  review TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES message_threads(id),
  FOREIGN KEY (rater_id) REFERENCES users(id),
  FOREIGN KEY (rated_user_id) REFERENCES users(id),
  UNIQUE KEY (thread_id, rater_id),
  INDEX (rated_user_id)
);

-- Reports table
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  listing_id VARCHAR(36),
  reporter_id VARCHAR(36) NOT NULL,
  reason VARCHAR(255),
  description TEXT,
  status ENUM('pending', 'resolved', 'dismissed') DEFAULT 'pending',
  resolved_at TIMESTAMP NULL,
  resolved_by VARCHAR(36),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  INDEX (status),
  INDEX (reporter_id)
);

-- Verification Requests table
CREATE TABLE verifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by VARCHAR(36),
  review_notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX (status)
);

-- Bases table
CREATE TABLE bases (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(20),
  region VARCHAR(255),
  timezone VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY (abbreviation)
);

-- Refresh Tokens table
CREATE TABLE refresh_tokens (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  device_id VARCHAR(255),
  user_agent VARCHAR(500),
  revoked_at TIMESTAMP NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id),
  INDEX (expires_at)
);

-- Audit Log table
CREATE TABLE audit_log (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(255) NOT NULL,
  details JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX (user_id),
  INDEX (timestamp)
);
```

### 2. **Code Changes Required**

#### Update `server/data/store.ts`
- Replace in-memory `Map` and array storage with MySQL queries
- Use a library like:
  - **mysql2/promise** (lightweight, fast)
  - **Sequelize** (ORM, requires more setup)
  - **Prisma** (type-safe, excellent TypeScript support)
  - **Knex.js** (query builder)

**Recommended: `mysql2/promise` for minimal changes**

#### Update environment variables

Add to `.env`:
```bash
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=baselist_user
MYSQL_PASSWORD=your_secure_password
MYSQL_DATABASE=baselist
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```

#### Create database connection pool

```typescript
// server/db/connection.ts
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

#### Update routes to use MySQL

Replace in-memory operations with:
```typescript
// Example: Get all users
const [rows] = await pool.query('SELECT * FROM users WHERE status != "banned"');
```

### 3. **cPanel Hosting Setup**

#### Prerequisites
- cPanel hosting account with:
  - Node.js support (or via cPanel's Node.js Manager)
  - MySQL 8.0+
  - SSH access

#### Deployment Steps

1. **Create MySQL Database**
   - cPanel → MySQL Databases
   - Create database: `baselist`
   - Create user: `baselist_user`
   - Assign all privileges

2. **Upload Code**
   ```bash
   # Via Git or SCP
   git clone your-repo /home/cpaneluser/app
   cd /home/cpaneluser/app
   npm install
   ```

3. **Build Project**
   ```bash
   npm run build
   ```

4. **Set Environment Variables**
   - Create `.env` in root directory
   - Add MySQL credentials and other config

5. **Configure Node.js Application** (cPanel)
   - cPanel → Setup Node.js App
   - App folder: `/home/cpaneluser/app`
   - App JS file: `dist/server/production.mjs`
   - Node.js version: 22+
   - Port: 8080 (assign a free port)

6. **Configure Reverse Proxy** (cPanel)
   - Domain → Manage Redirects
   - Forward to the Node.js app port
   - Or configure Apache reverse proxy

7. **Database Migration**
   ```bash
   # Run migration scripts to populate tables
   mysql -u baselist_user -p baselist < migration.sql
   ```

### 4. **Data Migration from In-Memory**

Before deploying with MySQL:

1. Export current in-memory data to JSON:
```typescript
// Export script
const allData = {
  users: store.getUsers(),
  listings: store.getListings(),
  threads: store.getThreads(),
  // ... etc
};
console.log(JSON.stringify(allData, null, 2));
```

2. Import into MySQL using migration scripts

### 5. **Important Considerations**

#### Security
- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens for authentication
- ✅ Rate limiting on login endpoint
- ⚠️ **Add HTTPS** - critical for production
- ⚠️ **Set secure cookies** with `HttpOnly` flag
- ⚠️ **Validate all inputs** server-side

#### Performance
- Add MySQL indexes on frequently queried columns
- Implement caching (Redis) for frequently accessed data
- Connection pooling (already in mysql2)

#### Backups
- Set up automated MySQL backups via cPanel
- Backup frequency: Daily
- Retention: 14+ days

#### Monitoring
- Set up uptime monitoring
- Configure error logging
- Monitor MySQL performance

### 6. **File Structure for Deployment**

```
baselist/
├── dist/
│   ├── spa/              # Built React frontend
│   └── server/           # Built Express backend
├── server/
│   ├── data/
│   │   └── store.ts      # ← MODIFY: Replace with MySQL
│   ├── db/
│   │   └── connection.ts # NEW: MySQL connection pool
│   ├── routes/           # API routes (these stay the same)
│   ├── middleware/       # Auth middleware (stays the same)
│   └── index.ts          # Main Express app
├── client/               # React frontend (no changes)
├── shared/               # Shared types
├── .env                  # NEW: Add MySQL credentials
├── package.json
└── vite.config.ts
```

---

## Testing Checklist Before Deployment ✅

- [ ] All pages load without errors
- [ ] Login/Register works
- [ ] Create listing workflow complete
- [ ] Message sending and receiving works
- [ ] Transaction marking and confirmation works
- [ ] Dispute raising works
- [ ] Admin dashboard accessible and shows data
- [ ] Audit logging functional
- [ ] Email verification tokens work
- [ ] Password reset works
- [ ] Rate limiting works (try login 10+ times, should be rate limited)
- [ ] Database backups configured
- [ ] HTTPS enabled
- [ ] CORS configured for your domain
- [ ] Environment variables set securely

---

## Deployment Checklist

**Before going live:**
- [ ] MySQL database created and migrated
- [ ] All environment variables configured
- [ ] HTTPS certificate installed
- [ ] Domain DNS configured
- [ ] Database backups automated
- [ ] Monitoring/alerting set up
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Error logging configured
- [ ] Firewall rules configured

---

## Support Notes

**Common Issues on cPanel:**

1. **Node.js app won't start**
   - Check `/home/cpaneluser/app/logs` for errors
   - Verify Node.js version compatibility

2. **MySQL connection errors**
   - Verify credentials in `.env`
   - Check MySQL is running: `systemctl status mysql`
   - Verify firewall allows MySQL port

3. **Memory issues**
   - Increase connection pool timeout
   - Consider Redis for session storage

4. **Slow performance**
   - Add database indexes
   - Implement query caching
   - Use CDN for static assets

---

## Next Steps

1. Set up MySQL database locally first
2. Update `server/data/store.ts` to use MySQL queries
3. Test all functionality with MySQL backend
4. Set up cPanel Node.js app
5. Configure reverse proxy
6. Deploy and monitor

**Estimated time: 2-4 hours** depending on familiarity with cPanel and MySQL.
