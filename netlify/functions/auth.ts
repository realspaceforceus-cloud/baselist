import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const ALLOWED_DOW_DOMAINS = [
  ".mil",
  ".defense.gov",
  ".disa.mil",
  ".dia.mil",
  ".dla.mil",
  ".dcma.mil",
  ".js.mil",
  ".osd.mil",
  ".ng.mil",
  ".spaceforce.mil",
  ".usmc.mil",
  ".army.mil",
  ".af.mil",
  ".navy.mil",
  ".uscg.mil",
  ".va.gov",
  ".us.af.mil",
];

const isDowEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  const emailPattern = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  if (!emailPattern.test(trimmed)) {
    return false;
  }

  return ALLOWED_DOW_DOMAINS.some((domain) => trimmed.endsWith(domain));
};

const isValidUsername = (username: string): boolean => {
  const pattern = /^[a-zA-Z0-9_]{3,20}$/;
  return pattern.test(username);
};

// POST /api/auth/signup
// Creates a new user account and sends verification code
const handleSignup = async (event: any) => {
  const { username, email, password, baseId } = JSON.parse(event.body || "{}");

  if (!username || !email || !password || !baseId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const trimmedUsername = username.trim().toLowerCase();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!isValidUsername(trimmedUsername)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error:
          "Username must be 3-20 characters using letters, numbers, or underscores",
      }),
    };
  }

  if (!isDowEmail(trimmedEmail)) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Use an approved DoW email (.mil or .defense.gov)",
      }),
    };
  }

  if (trimmedPassword.length < 12) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Password must be at least 12 characters",
      }),
    };
  }

  const client = await pool.connect();

  try {
    // Check if email already exists
    const emailCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (emailCheck.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Email already registered" }),
      };
    }

    // Check if username already exists
    const usernameCheck = await client.query(
      "SELECT id FROM users WHERE username = $1",
      [trimmedUsername],
    );

    if (usernameCheck.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "Username already taken" }),
      };
    }

    // Check if base exists
    const baseCheck = await client.query("SELECT id FROM bases WHERE id = $1", [
      baseId,
    ]);

    if (baseCheck.rows.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid base ID" }),
      };
    }

    // Create user
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(trimmedPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(trimmedUsername)}&backgroundType=gradientLinear&fontWeight=700`;

    await client.query(
      `INSERT INTO users (id, username, email, password_hash, role, status, base_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        trimmedUsername,
        trimmedEmail,
        passwordHash,
        "member",
        "active",
        baseId,
        avatarUrl,
      ],
    );

    // Don't generate or send verification code here
    // Users verify by sending an email to verify@yourdomain.com with their code in the subject
    // See inbound-email.ts for the inbound verification handler

    return {
      statusCode: 201,
      body: JSON.stringify({
        userId,
        username: trimmedUsername,
        email: trimmedEmail,
        baseId,
        message: "Account created. Send an email to verify@yourdomain.com with your verification code in the subject to complete signup.",
      }),
    };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create account" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/auth/verify-code
// Verifies the code and marks user as verified
const handleVerifyCode = async (event: any) => {
  const { email, code } = JSON.parse(event.body || "{}");

  if (!email || !code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email and code required" }),
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  const client = await pool.connect();

  try {
    // Get verification code record
    const codeResult = await client.query(
      `SELECT id, code, attempts, max_attempts, expires_at, verified_at
       FROM verification_codes
       WHERE email = $1`,
      [trimmedEmail],
    );

    if (codeResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No verification code found for this email",
        }),
      };
    }

    const record = codeResult.rows[0];

    // Check if already verified
    if (record.verified_at) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Email already verified" }),
      };
    }

    // Check if expired
    if (new Date() > new Date(record.expires_at)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Verification code expired. Request a new one.",
        }),
      };
    }

    // Check max attempts
    if (record.attempts >= record.max_attempts) {
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: "Too many failed attempts. Request a new code.",
        }),
      };
    }

    // Verify code
    if (record.code !== trimmedCode) {
      // Increment attempts
      await client.query(
        "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = $1",
        [trimmedEmail],
      );

      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid verification code" }),
      };
    }

    // Mark as verified
    const now = new Date();
    await client.query(
      "UPDATE verification_codes SET verified_at = $1, attempts = 0 WHERE email = $2",
      [now, trimmedEmail],
    );

    // Update user as dow_verified
    await client.query(
      "UPDATE users SET dow_verified_at = $1 WHERE email = $2",
      [now, trimmedEmail],
    );

    // Get updated user info
    const userResult = await client.query(
      `SELECT id, username, email, base_id, avatar_url, role
       FROM users
       WHERE email = $1`,
      [trimmedEmail],
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const user = userResult.rows[0];

    return {
      statusCode: 200,
      body: JSON.stringify({
        userId: user.id,
        username: user.username,
        email: user.email,
        baseId: user.base_id,
        verified: true,
        message: "Email verified successfully",
      }),
    };
  } catch (error) {
    console.error("Verify code error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Verification failed" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/auth/resend-code
// Resends verification code
const handleResendCode = async (event: any) => {
  const { email } = JSON.parse(event.body || "{}");

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email required" }),
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  const client = await pool.connect();

  try {
    // Check if user exists
    const userResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    // Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const codeId = randomUUID();

    await client.query(
      `INSERT INTO verification_codes (id, email, code, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET code = $3, expires_at = $4, verified_at = NULL, attempts = 0`,
      [codeId, trimmedEmail, code, expiresAt],
    );

    // Send code
    await sendVerificationCode(trimmedEmail, code);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Verification code sent" }),
    };
  } catch (error) {
    console.error("Resend code error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to resend code" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/auth/login - Backend login validation
const handleLogin = async (event: any) => {
  const { email, password } = JSON.parse(event.body || "{}");

  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email and password required" }),
    };
  }

  const client = await pool.connect();

  try {
    const trimmedEmail = email.trim().toLowerCase();

    // Find user by email
    const userResult = await client.query(
      "SELECT id, email, dow_verified_at FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    const user = userResult.rows[0];

    // Check if email is verified
    if (!user.dow_verified_at) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error:
            "Confirm your DoW email from the link we sent before signing in.",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        userId: user.id,
        email: user.email,
        verified: true,
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process login" }),
    };
  } finally {
    client.release();
  }
};

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path =
    event.path.replace("/.netlify/functions/auth", "") ||
    event.rawUrl?.split("?")[0]?.replace(/.*auth/, "") ||
    "";

  if (method === "POST" && path === "/signup") {
    return handleSignup(event);
  }

  if (method === "POST" && path === "/login") {
    return handleLogin(event);
  }

  if (method === "POST" && path === "/verify-code") {
    return handleVerifyCode(event);
  }

  if (method === "POST" && path === "/resend-code") {
    return handleResendCode(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
