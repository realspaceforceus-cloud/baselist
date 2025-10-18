import express, { Router } from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export const setupRouter = Router();

interface SetupRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail: string;
  includeSampleData: boolean;
}

interface SetupResponse {
  success: boolean;
  message: string;
  error?: string;
  step?: string;
  progress?: number;
}

// Check if setup is already complete
setupRouter.get("/status", (_req, res) => {
  const setupCompleteFile = path.join(process.cwd(), ".setup-complete");
  const isComplete = fs.existsSync(setupCompleteFile);

  res.json({
    isSetupComplete: isComplete,
    message: isComplete
      ? "Setup already completed"
      : "Setup wizard available",
  });
});

// Test database connection
setupRouter.post<never, SetupResponse>("/test-connection", async (req, res) => {
  try {
    const { host, port, username, password, database } = req.body as Partial<
      SetupRequest
    >;

    // Validate inputs
    if (!host || !username || !password || !database) {
      return res.status(400).json({
        success: false,
        message: "Missing required database credentials",
        error: "Please provide host, username, password, and database name",
      });
    }

    if (port && (port < 1 || port > 65535)) {
      return res.status(400).json({
        success: false,
        message: "Invalid port number",
        error: "Port must be between 1 and 65535",
      });
    }

    // Attempt connection
    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      user: username,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
    });

    await connection.end();

    res.json({
      success: true,
      message: "Database connection successful",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    res.status(400).json({
      success: false,
      message: "Database connection failed",
      error: errorMessage.includes("Access denied")
        ? "Invalid username or password"
        : errorMessage.includes("Unknown database")
          ? "Database does not exist. Please create it first in cPanel."
          : errorMessage.includes("ECONNREFUSED")
            ? "Cannot connect to MySQL server. Check host and port."
            : errorMessage,
    });
  }
});

// Initialize database with tables
setupRouter.post<never, SetupResponse>("/initialize-database", async (req, res) => {
  try {
    const { host, port, username, password, database } = req.body as Partial<
      SetupRequest
    >;

    if (!host || !username || !password || !database) {
      return res.status(400).json({
        success: false,
        message: "Missing database credentials",
      });
    }

    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      user: username,
      password,
      database,
    });

    // All table creation queries
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
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
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_base_id (base_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Bases table
      `CREATE TABLE IF NOT EXISTS bases (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        abbreviation VARCHAR(20) UNIQUE,
        region VARCHAR(255),
        timezone VARCHAR(10),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_abbr (abbreviation)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Listings table
      `CREATE TABLE IF NOT EXISTS listings (
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
        INDEX idx_seller (seller_id),
        INDEX idx_base (base_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Message threads
      `CREATE TABLE IF NOT EXISTS message_threads (
        id VARCHAR(36) PRIMARY KEY,
        listing_id VARCHAR(36) NOT NULL,
        participants JSON NOT NULL,
        status ENUM('active', 'completed', 'disputed') DEFAULT 'active',
        archived_by JSON,
        deleted_by JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (listing_id) REFERENCES listings(id),
        INDEX idx_listing (listing_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Messages
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        thread_id VARCHAR(36) NOT NULL,
        author_id VARCHAR(36) NOT NULL,
        body TEXT NOT NULL,
        type ENUM('user', 'system') DEFAULT 'user',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES message_threads(id),
        FOREIGN KEY (author_id) REFERENCES users(id),
        INDEX idx_thread (thread_id),
        INDEX idx_author (author_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Transactions with two-stage completion
      `CREATE TABLE IF NOT EXISTS transactions (
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
        INDEX idx_status (status),
        INDEX idx_completed (completed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Ratings
      `CREATE TABLE IF NOT EXISTS ratings (
        id VARCHAR(36) PRIMARY KEY,
        thread_id VARCHAR(36) NOT NULL,
        rater_id VARCHAR(36) NOT NULL,
        rated_user_id VARCHAR(36) NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES message_threads(id),
        FOREIGN KEY (rater_id) REFERENCES users(id),
        FOREIGN KEY (rated_user_id) REFERENCES users(id),
        UNIQUE KEY unique_rating (thread_id, rater_id),
        INDEX idx_user (rated_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Reports
      `CREATE TABLE IF NOT EXISTS reports (
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
        INDEX idx_status (status),
        INDEX idx_reporter (reporter_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Verifications
      `CREATE TABLE IF NOT EXISTS verifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL UNIQUE,
        status ENUM('pending', 'approved', 'denied') DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by VARCHAR(36),
        review_notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Refresh tokens
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        device_id VARCHAR(255),
        user_agent VARCHAR(500),
        revoked_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user (user_id),
        INDEX idx_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      // Audit log
      `CREATE TABLE IF NOT EXISTS audit_log (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(255) NOT NULL,
        details JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user (user_id),
        INDEX idx_time (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    // Execute all table creation queries
    for (const tableQuery of tables) {
      await connection.execute(tableQuery);
    }

    await connection.end();

    res.json({
      success: true,
      message: "Database tables created successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      message: "Failed to initialize database",
      error: errorMessage,
    });
  }
});

// Create admin user and insert seed data
setupRouter.post<never, SetupResponse>("/finalize", async (req, res) => {
  try {
    const {
      host,
      port,
      username,
      password,
      database,
      adminUsername,
      adminPassword,
      adminEmail,
      includeSampleData,
    } = req.body as SetupRequest;

    // Validate admin inputs
    if (!adminUsername || adminUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin username",
        error: "Username must be at least 3 characters",
      });
    }

    if (!adminPassword || adminPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin password",
        error: "Password must be at least 8 characters",
      });
    }

    if (!adminEmail || !adminEmail.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Invalid admin email",
        error: "Please provide a valid email address",
      });
    }

    const connection = await mysql.createConnection({
      host,
      port: port || 3306,
      user: username,
      password,
      database,
    });

    // Hash password
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    const adminId = randomUUID();
    const now = new Date().toISOString();

    // Insert base (default)
    const baseId = randomUUID();
    await connection.execute(
      "INSERT INTO bases (id, name, abbreviation, region, timezone, latitude, longitude, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [baseId, "Home Base", "HB", "Main", "CT", 39.7684, -104.9595, now, now]
    );

    // Insert admin user
    await connection.execute(
      "INSERT INTO users (id, username, email, password_hash, name, base_id, role, status, verified, is_dow_verified, notifications_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        adminId,
        adminUsername,
        adminEmail,
        passwordHash,
        adminUsername,
        baseId,
        "admin",
        "active",
        true,
        true,
        true,
        now,
        now,
      ]
    );

    // Insert sample data if requested
    if (includeSampleData) {
      // Sample categories (as base data)
      const categories = [
        "Vehicles",
        "Furniture",
        "Electronics",
        "Kids",
        "Free",
        "Other",
      ];

      // Optional: Insert sample listing from admin
      const sampleListingId = randomUUID();
      await connection.execute(
        "INSERT INTO listings (id, title, description, category, seller_id, base_id, status, price, is_free, photos, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          sampleListingId,
          "Sample Item - Edit or Delete",
          "This is a sample listing. You can edit or delete it from the admin panel. To create more listings, use the POST button in the app.",
          "Other",
          adminId,
          baseId,
          "active",
          null,
          true,
          JSON.stringify([]),
          now,
          now,
        ]
      );
    }

    await connection.end();

    res.json({
      success: true,
      message: "Admin user and database finalized successfully",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      message: "Failed to finalize setup",
      error: errorMessage,
    });
  }
});

// Mark setup as complete
setupRouter.post<never, SetupResponse>("/complete", async (req, res) => {
  try {
    const { host, port, username, password, database } = req.body as Partial<
      SetupRequest
    >;

    // Create .setup-complete flag file
    const setupCompleteFile = path.join(process.cwd(), ".setup-complete");
    fs.writeFileSync(setupCompleteFile, JSON.stringify({
      completedAt: new Date().toISOString(),
      database,
      host,
    }), "utf-8");

    // Generate .env file
    const envPath = path.join(process.cwd(), ".env");
    const envContent = `# BaseList Environment Configuration
# Generated by Setup Wizard on ${new Date().toISOString()}

# MySQL Configuration
MYSQL_HOST=${host}
MYSQL_PORT=${port || 3306}
MYSQL_USER=${username}
MYSQL_PASSWORD=${password}
MYSQL_DATABASE=${database}

# Application
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
PING_MESSAGE="BaseList Production"

# Security - Please update these to secure random values
JWT_SECRET=${generateJWTSecret()}

# Features
ALLOW_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=true
`;

    fs.writeFileSync(envPath, envContent, "utf-8");

    // Secure .env permissions
    fs.chmodSync(envPath, 0o600);

    res.json({
      success: true,
      message: ".env file created and setup marked complete",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      message: "Failed to complete setup",
      error: errorMessage,
    });
  }
});

// Helper function to generate JWT secret
function generateJWTSecret(): string {
  return require("crypto")
    .randomBytes(32)
    .toString("base64");
}
