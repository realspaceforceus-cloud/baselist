import { Handler } from "@netlify/functions";
import { pool } from "./db";

interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  envelope?: {
    from: string;
    to: string[];
  };
  spf?: {
    result: string;
  };
  dkim?: Record<string, { result: string }>;
  spam_report?: {
    score: number;
  };
}

// Extract verification code from email subject or body
const extractVerificationCode = (email: InboundEmailPayload): string | null => {
  // Look for pattern like VER-XXXXX or just 6-8 character alphanumeric code
  const codePattern = /(?:VER-)?([A-Z0-9]{4,8})/i;

  // Check subject line first
  if (email.subject) {
    const subjectMatch = email.subject.match(codePattern);
    if (subjectMatch) {
      return subjectMatch[1].toUpperCase();
    }
  }

  // Check body (text or html)
  const body = email.text || email.html || "";
  const bodyMatch = body.match(codePattern);
  if (bodyMatch) {
    return bodyMatch[1].toUpperCase();
  }

  return null;
};

// Verify SPF/DKIM headers to ensure email authenticity
const verifySPFDKIM = (
  email: InboundEmailPayload,
): { valid: boolean; details: Record<string, unknown> } => {
  const details: Record<string, unknown> = {};

  // Check SPF
  if (email.spf) {
    details.spf = email.spf.result;
    if (email.spf.result !== "pass") {
      return { valid: false, details };
    }
  }

  // Check DKIM - at least one signature should pass
  if (email.dkim) {
    const dkimResults = Object.values(email.dkim).map((d) => d.result);
    details.dkim = dkimResults;
    const hasDKIMPass = dkimResults.some((result) => result === "pass");
    if (!hasDKIMPass) {
      return { valid: false, details };
    }
  }

  return { valid: true, details };
};

// Validate that sender is from a .mil domain
const isMilEmail = (email: string): boolean => {
  const normalizedEmail = email.trim().toLowerCase();
  const milDomains = [
    "@af.mil",
    "@army.mil",
    "@navy.mil",
    "@usmc.mil",
    "@uscg.mil",
    "@spaceforce.mil",
    "@dod.mil",
    "@defense.mil",
    "@us.af.mil",
    "@mil.af.mil",
  ];

  return milDomains.some((domain) => normalizedEmail.endsWith(domain));
};

const handler: Handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    let payload: InboundEmailPayload;

    console.log("[INBOUND EMAIL] Raw event.body type:", typeof event.body);
    console.log(
      "[INBOUND EMAIL] Raw event.body:",
      event.body?.substring?.(0, 500) || event.body,
    );
    console.log(
      "[INBOUND EMAIL] Event isBase64Encoded:",
      event.isBase64Encoded,
    );

    let bodyStr = event.body;

    // Handle base64 encoded body
    if (event.isBase64Encoded && typeof event.body === "string") {
      bodyStr = Buffer.from(event.body, "base64").toString("utf-8");
      console.log(
        "[INBOUND EMAIL] Decoded base64 body:",
        bodyStr.substring(0, 500),
      );
    }

    // Parse the incoming email payload
    if (typeof bodyStr === "string") {
      // Try to parse as JSON first, fall back to form-encoded
      try {
        payload = JSON.parse(bodyStr);
        console.log("[INBOUND EMAIL] Parsed as JSON");
      } catch {
        // Parse as form-encoded data (SendGrid sends form data by default)
        console.log("[INBOUND EMAIL] Parsing as form-encoded...");
        const params = new URLSearchParams(bodyStr);

        console.log(
          "[INBOUND EMAIL] Form params count:",
          Array.from(params.keys()).length,
        );
        console.log(
          "[INBOUND EMAIL] Form param keys:",
          Array.from(params.keys()).slice(0, 10),
        );

        // Parse JSON fields if they exist
        const dkim: Record<string, { result: string }> = {};
        const spf: { result: string } | undefined = undefined;

        for (const [key, value] of params.entries()) {
          if (key.startsWith("dkim")) {
            try {
              const parsed = JSON.parse(value);
              Object.assign(dkim, parsed);
            } catch {
              // If parsing fails, skip
            }
          }
        }

        payload = {
          from: params.get("from") || "",
          to: params.get("to") || "",
          subject: params.get("subject") || "",
          text: params.get("text") || undefined,
          html: params.get("html") || undefined,
          headers: params.get("headers")
            ? JSON.parse(params.get("headers") || "{}")
            : undefined,
          envelope: params.get("envelope")
            ? JSON.parse(params.get("envelope") || "{}")
            : undefined,
          spf: params.get("spf") ? JSON.parse(params.get("spf") || "{}") : spf,
          dkim: Object.keys(dkim).length > 0 ? dkim : undefined,
          spam_report: params.get("spam_report")
            ? JSON.parse(params.get("spam_report") || "{}")
            : undefined,
        };
      }
    } else {
      payload = event.body;
    }

    // Extract sender email
    const senderEmail = (payload.envelope?.from || payload.from || "")
      .toLowerCase()
      .trim();

    console.log("[INBOUND EMAIL] Full payload:", JSON.stringify(payload));
    console.log("[INBOUND EMAIL] Received from:", senderEmail);
    console.log("[INBOUND EMAIL] Envelope from:", payload.envelope?.from);
    console.log("[INBOUND EMAIL] Payload from:", payload.from);

    // Validate sender is from .mil domain
    if (!isMilEmail(senderEmail)) {
      console.log("[INBOUND EMAIL] Rejected: not a .mil address");
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Sender must be from a .mil domain",
        }),
      };
    }

    // Verify SPF/DKIM
    const spfDkimCheck = verifySPFDKIM(payload);
    if (!spfDkimCheck.valid) {
      console.log(
        "[INBOUND EMAIL] Failed SPF/DKIM check:",
        spfDkimCheck.details,
      );

      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO email_verification_audit 
           (email, event_type, details, sender_email) 
           VALUES ($1, $2, $3, $4)`,
          [
            senderEmail,
            "verification_failed",
            JSON.stringify({
              reason: "SPF/DKIM validation failed",
              checks: spfDkimCheck.details,
            }),
            senderEmail,
          ],
        );
      } finally {
        client.release();
      }

      return {
        statusCode: 401,
        body: JSON.stringify({
          error: "Email authentication failed",
        }),
      };
    }

    // Extract verification code from email
    const code = extractVerificationCode(payload);
    if (!code) {
      console.log("[INBOUND EMAIL] No verification code found in email");
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "No verification code found in email",
        }),
      };
    }

    console.log("[INBOUND EMAIL] Extracted code:", code);

    const client = await pool.connect();

    try {
      // Find the verification record by code
      const verificationResult = await client.query(
        `SELECT id, user_id, email, expires_at, status 
         FROM email_verifications 
         WHERE code = $1 AND status = 'pending'`,
        [code],
      );

      if (verificationResult.rows.length === 0) {
        console.log("[INBOUND EMAIL] Code not found or already used:", code);

        await client.query(
          `INSERT INTO email_verification_audit 
           (email, event_type, details, sender_email) 
           VALUES ($1, $2, $3, $4)`,
          [
            senderEmail,
            "verification_failed",
            JSON.stringify({
              reason: "Code not found or already used",
              code,
            }),
            senderEmail,
          ],
        );

        return {
          statusCode: 404,
          body: JSON.stringify({
            error: "Verification code not found or already used",
          }),
        };
      }

      const verification = verificationResult.rows[0];

      // Check if code is expired
      const now = new Date();
      const expiresAt = new Date(verification.expires_at);
      if (now > expiresAt) {
        console.log("[INBOUND EMAIL] Code expired:", code);

        // Mark as expired
        await client.query(
          "UPDATE email_verifications SET status = 'expired' WHERE id = $1",
          [verification.id],
        );

        await client.query(
          `INSERT INTO email_verification_audit 
           (user_id, verification_id, event_type, details, sender_email) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            verification.user_id,
            verification.id,
            "code_expired",
            JSON.stringify({ code }),
            senderEmail,
          ],
        );

        return {
          statusCode: 410,
          body: JSON.stringify({
            error: "Verification code has expired",
          }),
        };
      }

      // Verify that the sender is actually the user's email or matches a known pattern
      const userResult = await client.query(
        "SELECT id, email FROM users WHERE id = $1",
        [verification.user_id],
      );

      if (userResult.rows.length === 0) {
        console.log("[INBOUND EMAIL] User not found:", verification.user_id);
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: "User not found",
          }),
        };
      }

      const user = userResult.rows[0];

      // The sender should be the user's registered email or a known .mil alias
      // For now, we'll accept any .mil email from a verified .mil domain
      // In production, you might want stricter validation

      // Mark verification as successful
      await client.query(
        `UPDATE email_verifications 
         SET status = 'verified', verified_at = $1, verified_from_email = $2
         WHERE id = $3`,
        [now, senderEmail, verification.id],
      );

      // Update user's dow_verified_at timestamp
      await client.query(
        "UPDATE users SET dow_verified_at = $1 WHERE id = $2",
        [now, verification.user_id],
      );

      // Log successful verification
      await client.query(
        `INSERT INTO email_verification_audit 
         (user_id, verification_id, email, event_type, details, sender_email) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          verification.user_id,
          verification.id,
          user.email,
          "verification_success",
          JSON.stringify({
            code,
            verified_from_email: senderEmail,
            spf_dkim: spfDkimCheck.details,
          }),
          senderEmail,
        ],
      );

      console.log(
        `[INBOUND EMAIL] Successfully verified user ${verification.user_id}`,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Email verification successful",
          userId: verification.user_id,
          verified: true,
        }),
      };
    } catch (error) {
      console.error("Database error during verification:", error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Inbound email webhook error:", error);

    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid JSON payload",
        }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
      }),
    };
  }
};

export { handler };
