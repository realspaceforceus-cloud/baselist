import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

// POST /api/sponsor/request - Family member requests sponsor approval
const handleRequestApproval = async (event: any) => {
  const { email, sponsorUsername } = JSON.parse(event.body || "{}");

  if (!email || !sponsorUsername) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Email and sponsor username required" }),
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedSponsorUsername = sponsorUsername.trim().toLowerCase();

  const client = await pool.connect();

  try {
    // Get family member user
    const familyMemberResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [trimmedEmail],
    );

    if (familyMemberResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const familyMemberId = familyMemberResult.rows[0].id;

    // Find sponsor by username
    const sponsorResult = await client.query(
      "SELECT id, dow_verified_at FROM users WHERE username = $1",
      [trimmedSponsorUsername],
    );

    if (sponsorResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Sponsor not found" }),
      };
    }

    const sponsor = sponsorResult.rows[0];

    // Check if sponsor is DoD verified
    if (!sponsor.dow_verified_at) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Sponsor must be DoD verified first",
        }),
      };
    }

    // Check if family member already has an active link or pending request
    const existingLinkResult = await client.query(
      `SELECT id, status FROM family_links 
       WHERE family_member_id = $1 AND status = 'active'`,
      [familyMemberId],
    );

    if (existingLinkResult.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "You already have an active family member link",
        }),
      };
    }

    const existingRequestResult = await client.query(
      `SELECT id, status FROM sponsor_requests 
       WHERE family_member_id = $1 AND status = 'pending'`,
      [familyMemberId],
    );

    if (existingRequestResult.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "You already have a pending approval request",
        }),
      };
    }

    // Check if sponsor has an active cooldown
    const cooldownResult = await client.query(
      `SELECT id, cooldown_until FROM sponsor_cooldowns 
       WHERE sponsor_id = $1 AND cooldown_until > now()`,
      [sponsor.id],
    );

    if (cooldownResult.rows.length > 0) {
      const cooldownUntil = new Date(cooldownResult.rows[0].cooldown_until);
      return {
        statusCode: 429,
        body: JSON.stringify({
          error: "Sponsor is in cooldown period",
          cooldownUntil,
        }),
      };
    }

    // Create approval request
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await client.query(
      `INSERT INTO sponsor_requests (id, family_member_id, sponsor_id, sponsor_username, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        requestId,
        familyMemberId,
        sponsor.id,
        trimmedSponsorUsername,
        "pending",
        expiresAt,
      ],
    );

    // Log the request
    await client.query(
      `INSERT INTO sponsor_actions_audit (sponsor_id, family_member_id, sponsor_request_id, action_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        sponsor.id,
        familyMemberId,
        requestId,
        "request_created",
        JSON.stringify({
          familyMemberEmail: trimmedEmail,
          sponsorUsername: trimmedSponsorUsername,
        }),
      ],
    );

    console.log(
      `[SPONSOR REQUEST] Created request ${requestId} for sponsor ${sponsor.id}`,
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        requestId,
        message: "Approval request sent to sponsor",
        expiresAt,
      }),
    };
  } catch (error) {
    console.error("Sponsor request error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create approval request" }),
    };
  } finally {
    client.release();
  }
};

// GET /api/sponsor/requests/:sponsorId - Get pending approval requests for sponsor
const handleGetRequests = async (event: any) => {
  const sponsorId = event.queryStringParameters?.sponsorId;

  if (!sponsorId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Sponsor ID required" }),
    };
  }

  const client = await pool.connect();

  try {
    let requestsResult: any = { rows: [] };
    let familyLinkResult: any = { rows: [] };
    let cooldownResult: any = { rows: [] };

    try {
      // Get all pending requests for this sponsor
      requestsResult = await client.query(
        `SELECT
          sr.id, sr.family_member_id, sr.sponsor_username, sr.status,
          sr.created_at, sr.expires_at, sr.approval_reason,
          u.username, u.email, u.avatar_url
         FROM sponsor_requests sr
         JOIN users u ON sr.family_member_id = u.id
         WHERE sr.sponsor_id = $1 AND sr.status IN ('pending', 'approved', 'denied')
         ORDER BY sr.created_at DESC`,
        [sponsorId],
      );
    } catch (err) {
      console.error("Error fetching sponsor requests:", err);
      // Table may not exist yet, return empty
    }

    try {
      // Get current active family member (if any)
      familyLinkResult = await client.query(
        `SELECT
          fl.id, fl.family_member_id, fl.status, fl.created_at,
          u.username, u.email, u.avatar_url
         FROM family_links fl
         JOIN users u ON fl.family_member_id = u.id
         WHERE fl.sponsor_id = $1 AND fl.status = 'active'
         LIMIT 1`,
        [sponsorId],
      );
    } catch (err) {
      console.error("Error fetching family links:", err);
      // Table may not exist yet, return null
    }

    try {
      // Get cooldown status (if any)
      cooldownResult = await client.query(
        `SELECT id, cooldown_until FROM sponsor_cooldowns
         WHERE sponsor_id = $1 AND cooldown_until > now()
         LIMIT 1`,
        [sponsorId],
      );
    } catch (err) {
      console.error("Error fetching sponsor cooldowns:", err);
      // Table may not exist yet, return null
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        requests: requestsResult.rows.map((row: any) => ({
          id: row.id,
          familyMemberId: row.family_member_id,
          username: row.username,
          email: row.email,
          avatarUrl: row.avatar_url,
          status: row.status,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
        })),
        activeFamily:
          familyLinkResult.rows.length > 0
            ? {
                id: familyLinkResult.rows[0].id,
                familyMemberId: familyLinkResult.rows[0].family_member_id,
                username: familyLinkResult.rows[0].username,
                email: familyLinkResult.rows[0].email,
                avatarUrl: familyLinkResult.rows[0].avatar_url,
                linkedAt: familyLinkResult.rows[0].created_at,
              }
            : null,
        cooldown:
          cooldownResult.rows.length > 0
            ? {
                until: cooldownResult.rows[0].cooldown_until,
              }
            : null,
      }),
    };
  } catch (error) {
    console.error("Get requests error:", error);
    // Return safe default even if everything fails
    return {
      statusCode: 200,
      body: JSON.stringify({
        requests: [],
        activeFamily: null,
        cooldown: null,
      }),
    };
  } finally {
    client.release();
  }
};

// POST /api/sponsor/approve/:requestId - Approve a family member
const handleApproveRequest = async (event: any) => {
  const { requestId } = JSON.parse(event.body || "{}");

  if (!requestId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request ID required" }),
    };
  }

  const client = await pool.connect();

  try {
    // Get the request
    const requestResult = await client.query(
      `SELECT id, sponsor_id, family_member_id FROM sponsor_requests 
       WHERE id = $1 AND status = 'pending'`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Request not found or already processed",
        }),
      };
    }

    const request = requestResult.rows[0];

    // Check if sponsor already has an active family member
    const existingLinkResult = await client.query(
      `SELECT id FROM family_links 
       WHERE sponsor_id = $1 AND status = 'active'`,
      [request.sponsor_id],
    );

    if (existingLinkResult.rows.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "Sponsor already has an active family member",
        }),
      };
    }

    const now = new Date();

    // Create the family link
    const linkId = randomUUID();
    await client.query(
      `INSERT INTO family_links (id, sponsor_id, family_member_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [linkId, request.sponsor_id, request.family_member_id, "active", now],
    );

    // Update the request to approved
    await client.query(
      `UPDATE sponsor_requests SET status = 'approved', approved_at = $1 
       WHERE id = $2`,
      [now, requestId],
    );

    // Update family member as family_verified
    await client.query(
      `UPDATE users SET family_verified_at = $1 
       WHERE id = $2`,
      [now, request.family_member_id],
    );

    // Log the approval
    await client.query(
      `INSERT INTO sponsor_actions_audit 
       (sponsor_id, family_member_id, sponsor_request_id, family_link_id, action_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        request.sponsor_id,
        request.family_member_id,
        requestId,
        linkId,
        "request_approved",
      ],
    );

    console.log(
      `[SPONSOR APPROVE] Request ${requestId} approved, link ${linkId} created`,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Family member approved",
        linkId,
        familyMemberId: request.family_member_id,
      }),
    };
  } catch (error) {
    console.error("Approve request error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to approve request" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/sponsor/deny/:requestId - Deny a family member request
const handleDenyRequest = async (event: any) => {
  const { requestId, reason } = JSON.parse(event.body || "{}");

  if (!requestId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request ID required" }),
    };
  }

  const client = await pool.connect();

  try {
    // Get the request
    const requestResult = await client.query(
      `SELECT id, sponsor_id, family_member_id FROM sponsor_requests 
       WHERE id = $1 AND status = 'pending'`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "Request not found or already processed",
        }),
      };
    }

    const request = requestResult.rows[0];
    const now = new Date();

    // Update request to denied
    await client.query(
      `UPDATE sponsor_requests 
       SET status = 'denied', denied_at = $1, denial_reason = $2
       WHERE id = $3`,
      [now, reason || null, requestId],
    );

    // Log the denial
    await client.query(
      `INSERT INTO sponsor_actions_audit 
       (sponsor_id, family_member_id, sponsor_request_id, action_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        request.sponsor_id,
        request.family_member_id,
        requestId,
        "request_denied",
        JSON.stringify({ reason: reason || "No reason provided" }),
      ],
    );

    console.log(`[SPONSOR DENY] Request ${requestId} denied`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Request denied",
      }),
    };
  } catch (error) {
    console.error("Deny request error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to deny request" }),
    };
  } finally {
    client.release();
  }
};

// POST /api/sponsor/revoke/:linkId - Revoke an active family member link
const handleRevokeLink = async (event: any) => {
  const { linkId, reason } = JSON.parse(event.body || "{}");

  if (!linkId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Link ID required" }),
    };
  }

  const client = await pool.connect();

  try {
    // Get the link
    const linkResult = await client.query(
      `SELECT id, sponsor_id, family_member_id FROM family_links 
       WHERE id = $1 AND status = 'active'`,
      [linkId],
    );

    if (linkResult.rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Link not found or not active" }),
      };
    }

    const link = linkResult.rows[0];
    const now = new Date();

    // Revoke the link
    await client.query(
      `UPDATE family_links 
       SET status = 'revoked', revoked_at = $1, revocation_reason = $2
       WHERE id = $3`,
      [now, reason || null, linkId],
    );

    // Remove family_verified status from family member
    await client.query(
      `UPDATE users SET family_verified_at = NULL WHERE id = $1`,
      [link.family_member_id],
    );

    // Apply cooldown to sponsor (7 days)
    const cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const cooldownId = randomUUID();

    await client.query(
      `INSERT INTO sponsor_cooldowns (id, sponsor_id, cooldown_until, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (sponsor_id) DO UPDATE
       SET cooldown_until = $3, reason = $4`,
      [cooldownId, link.sponsor_id, cooldownUntil, reason || "Link revoked"],
    );

    // Log the revocation
    await client.query(
      `INSERT INTO sponsor_actions_audit 
       (sponsor_id, family_member_id, family_link_id, action_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        link.sponsor_id,
        link.family_member_id,
        linkId,
        "link_revoked",
        JSON.stringify({
          reason: reason || "No reason provided",
          cooldownUntil,
        }),
      ],
    );

    console.log(
      `[SPONSOR REVOKE] Link ${linkId} revoked, cooldown applied until ${cooldownUntil}`,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Link revoked and cooldown applied",
        cooldownUntil,
      }),
    };
  } catch (error) {
    console.error("Revoke link error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to revoke link" }),
    };
  } finally {
    client.release();
  }
};

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path =
    event.path.replace("/.netlify/functions/sponsor", "") ||
    event.rawUrl?.split("?")[0]?.replace(/.*sponsor/, "") ||
    "";

  if (method === "POST" && path === "/request") {
    return handleRequestApproval(event);
  }

  if (method === "GET" && path === "/requests") {
    return handleGetRequests(event);
  }

  if (method === "POST" && path === "/approve") {
    return handleApproveRequest(event);
  }

  if (method === "POST" && path === "/deny") {
    return handleDenyRequest(event);
  }

  if (method === "POST" && path === "/revoke") {
    return handleRevokeLink(event);
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
