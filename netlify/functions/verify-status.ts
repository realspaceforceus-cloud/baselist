import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { checkRateLimit, logAbuseEvent } from "./rate-limit";

// POST /api/verify/request - Create a new verification code for .mil email
const handleRequestVerification = async (event: any) => {
  const { email } = JSON.parse(event.body || "{}");
  const clientIp = event.headers["client-ip"] || "unknown";

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email required" }),
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Rate limit: max 5 requests per email per hour
  const rateLimitCheck = await checkRateLimit(
    {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      key: "verify_request",
    },
    trimmedEmail,
  );

  if (!rateLimitCheck.allowed) {
    await logAbuseEvent("verify_request_rate_limit", trimmedEmail, {
      clientIp,
      remaining: rateLimitCheck.remaining,
    });

    return {
      statusCode: 429,
      body: JSON.stringify({
        error: "Too many verification requests. Try again later.",
        resetTime: rateLimitCheck.resetTime,
      }),
    };
  }

  const client = await pool.connect();

  try {
    // Find user by email
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

    const userId = userResult.rows[0].id;

    // Generate code in format: VER-XXXXX (5 uppercase alphanumeric characters)
    const generateCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const verificationId = randomUUID();

    // Create verification record
    await client.query(
      `INSERT INTO email_verifications (id, user_id, email, code, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, email, status) DO UPDATE 
       SET code = $4, expires_at = $6, created_at = now()`,
      [verificationId, userId, trimmedEmail, code, "pending", expiresAt],
    );

    // Log the code generation
    await client.query(
      `INSERT INTO email_verification_audit (user_id, email, event_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        trimmedEmail,
        "code_generated",
        JSON.stringify({
          code,
          method: "inbound",
          expiresIn: "30 minutes",
        }),
      ],
    );

    console.log(`[VERIFY REQUEST] Generated code for ${trimmedEmail}: ${code}`);

    return {
      statusCode: 201,
      body: JSON.stringify({
        verificationId,
        code,
        email: trimmedEmail,
        expiresAt,
        message:
          "Verification code generated. Send this code in an email to verify@yourdomain.com",
      }),
    };
  } catch (error) {
    console.error("Verify request error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate verification code" }),
    };
  } finally {
    client.release();
  }
};

// GET /api/verify/status/:email - Check verification status
const handleCheckStatus = async (event: any) => {
  const email = event.queryStringParameters?.email;

  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email required" }),
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  const client = await pool.connect();

  try {
    // Find user by email
    const userResult = await client.query(
      "SELECT id, dow_verified_at FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (userResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.dow_verified_at) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          email: trimmedEmail,
          status: "verified",
          verifiedAt: user.dow_verified_at,
        }),
      };
    }

    // Get pending verification
    const verificationResult = await client.query(
      `SELECT id, code, status, created_at, expires_at 
       FROM email_verifications 
       WHERE email = $1 AND status = 'pending'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [trimmedEmail],
    );

    if (verificationResult.rows.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          email: trimmedEmail,
          status: "no_pending_verification",
          message: "No active verification request found",
        }),
      };
    }

    const verification = verificationResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);
    const isExpired = now > expiresAt;

    if (isExpired) {
      // Update status to expired
      await client.query(
        "UPDATE email_verifications SET status = 'expired' WHERE id = $1",
        [verification.id],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          email: trimmedEmail,
          status: "expired",
          message: "Verification code has expired. Request a new one.",
        }),
      };
    }

    // Calculate time remaining
    const timeRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / 1000,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        email: trimmedEmail,
        status: "pending",
        code: verification.code,
        expiresAt: verification.expires_at,
        timeRemainingSeconds: timeRemaining,
        message: `Verification pending. Send the code "${verification.code}" to verify@yourdomain.com`,
      }),
    };
  } catch (error) {
    console.error("Status check error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to check verification status" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/verify/resend - Resend verification code
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
    // Find user by email
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

    const userId = userResult.rows[0].id;

    // Generate new code
    const generateCode = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let code = "";
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const verificationId = randomUUID();

    // Create new verification record
    await client.query(
      `INSERT INTO email_verifications (id, user_id, email, code, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, email, status) DO UPDATE 
       SET code = $4, expires_at = $6, created_at = now()`,
      [verificationId, userId, trimmedEmail, code, "pending", expiresAt],
    );

    // Log the resend
    await client.query(
      `INSERT INTO email_verification_audit (user_id, email, event_type, details)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        trimmedEmail,
        "code_generated",
        JSON.stringify({
          code,
          reason: "resend",
          method: "inbound",
        }),
      ],
    );

    console.log(`[VERIFY RESEND] New code for ${trimmedEmail}: ${code}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        verificationId,
        code,
        email: trimmedEmail,
        expiresAt,
        message: "New verification code generated",
      }),
    };
  } catch (error) {
    console.error("Resend code error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to resend verification code" }),
    };
  } finally {
    client.release();
  }
};

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path =
    event.path.replace("/.netlify/functions/verify-status", "") ||
    event.rawUrl?.split("?")[0]?.replace(/.*verify-status/, "") ||
    "";

  if (method === "POST" && path === "/request") {
    return handleRequestVerification(event);
  }

  if (method === "GET" && path === "/status") {
    return handleCheckStatus(event);
  }

  if (method === "POST" && path === "/resend") {
    return handleResendCode(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
