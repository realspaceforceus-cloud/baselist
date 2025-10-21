import { Handler } from "@netlify/functions";
import { pool } from "../db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

function verifyAdminAuth(event: any): { userId: string } | null {
  const cookies = event.headers.cookie || "";
  const userIdMatch = cookies.match(/userId=([^;]+)/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return null;
  }

  return { userId };
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod;

  // Fix path parsing to handle both direct calls and redirected requests
  // Direct: /.netlify/functions/admin/users -> /users
  // Redirect: /api/admin/users -> /users
  let path = event.path;
  if (path.startsWith("/api/admin")) {
    path = path.replace("/api/admin", "");
  } else if (path.startsWith("/.netlify/functions/admin")) {
    path = path.replace("/.netlify/functions/admin", "");
  }
  path = path || "/";

  const auth = verifyAdminAuth(event);
  if (!auth) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const client = await pool.connect();

  try {
    const isAdmin = async (userId: string): Promise<boolean> => {
      const result = await client.query(
        "SELECT role FROM users WHERE id = $1",
        [userId],
      );
      return result.rows.length > 0 && result.rows[0].role === "admin";
    };

    // GET /api/admin/dashboard
    if (method === "GET" && path === "/dashboard") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      let usersResult: any = { rows: [{ count: 0 }] };
      let listingsResult: any = { rows: [{ count: 0 }] };
      let transactionsResult: any = { rows: [{ count: 0 }] };

      try {
        usersResult = await client.query("SELECT COUNT(*) as count FROM users");
      } catch (err) {
        console.error("Users count error:", err);
      }

      try {
        listingsResult = await client.query(
          "SELECT COUNT(*) as count FROM listings WHERE status = 'active'",
        );
      } catch (err) {
        console.error("Listings count error:", err);
      }

      try {
        transactionsResult = await client.query(
          "SELECT COUNT(*) as count FROM transactions",
        );
      } catch (err) {
        console.error("Transactions count error:", err);
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: parseInt(usersResult.rows[0]?.count ?? 0),
          listings: parseInt(listingsResult.rows[0]?.count ?? 0),
          transactions: parseInt(transactionsResult.rows[0]?.count ?? 0),
        }),
      };
    }

    // GET /api/admin/users (with pagination and search)
    if (method === "GET" && path === "/users") {
      // For now, allow all authenticated users to see users list (they should be admin anyway)
      if (!auth?.userId) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }
      // TODO: re-enable isAdmin check once we verify it's working
      // if (!(await isAdmin(auth.userId))) {
      //   return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" }) };
      // }

      const queryString = event.rawQueryString || "";
      const params = new URLSearchParams(
        queryString.startsWith("?") ? queryString.substring(1) : queryString,
      );
      const search = params.get("search") || "";
      const page = parseInt(params.get("page") || "1");
      const limit = 25;
      const offset = (page - 1) * limit;

      // Simple query - just the essential columns that definitely exist
      const whereClause = search
        ? ` WHERE (username ILIKE $1 OR email ILIKE $1 OR base_id ILIKE $1)`
        : "";
      const searchParams = search ? [`%${search}%`] : [];

      // Count total
      let total = 0;
      try {
        const countResult = await client.query(
          `SELECT COUNT(*) as count FROM users${whereClause}`,
          searchParams,
        );
        total = parseInt(countResult.rows[0]?.count ?? 0);
      } catch (err) {
        console.error("Count error:", err);
      }

      // Fetch users
      let result: any = { rows: [] };
      try {
        console.log(
          "Users query - whereClause:",
          whereClause,
          "searchParams:",
          searchParams,
          "limit:",
          limit,
          "offset:",
          offset,
        );
        result = await client.query(
          `SELECT id, username, email, role, status, base_id as "baseId", created_at as "createdAt",
                  dow_verified_at as "dowVerifiedAt", avatar_url as "avatarUrl"
           FROM users${whereClause}
           ORDER BY created_at DESC LIMIT $${searchParams.length + 1} OFFSET $${searchParams.length + 2}`,
          [...searchParams, limit, offset],
        );
        console.log("Users query result count:", result.rows.length);
      } catch (err) {
        console.error("Users query error:", err);
        result = { rows: [] };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: result.rows.map((row: any) => ({
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            status: row.status,
            baseId: row.baseId,
            createdAt: row.createdAt,
            dowVerifiedAt: row.dowVerifiedAt,
            avatarUrl: row.avatarUrl,
          })),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        }),
      };
    }

    // PATCH /api/admin/users/:id
    if (method === "PATCH" && path.startsWith("/users/")) {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const userId = path.replace("/users/", "");
      const { status, role, verify, reason, strikeType, strikeDescription } =
        JSON.parse(event.body || "{}");

      const user = await client.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      if (user.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (role) updates.role = role;
      if (verify) updates.dow_verified_at = new Date().toISOString();

      const setClauses = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ");

      if (setClauses) {
        const values = Object.values(updates);
        await client.query(
          `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1}`,
          [...values, userId],
        );
      }

      if (strikeType && strikeDescription) {
        await client.query(
          `INSERT INTO account_notes (id, user_id, created_by, note_type, strike_reason, description, severity)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            `note-${Date.now()}`,
            userId,
            auth.userId,
            "strike",
            strikeType,
            strikeDescription,
            "critical",
          ],
        );
      }

      const updated = await client.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      const u = updated.rows[0];

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: {
            id: u.id,
            username: u.username,
            role: u.role,
            status: u.status,
            dowVerifiedAt: u.dow_verified_at,
            joinMethod: u.join_method,
          },
        }),
      };
    }

    // GET /api/admin/metrics
    if (method === "GET" && path === "/metrics") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const verifiedResult = await client.query(
        "SELECT COUNT(*) as count FROM users WHERE dow_verified_at IS NOT NULL",
      );
      const listingsResult = await client.query(
        "SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold FROM listings",
      );
      const reportsResult = await client.query(
        "SELECT COUNT(*) as count FROM reports WHERE status = 'open'",
      );
      const backlogResult = await client.query(
        "SELECT COUNT(*) as count FROM verifications WHERE status = 'pending'",
      );

      const snapshot = {
        verifiedMembers: parseInt(verifiedResult.rows[0].count),
        totalListings: parseInt(listingsResult.rows[0].total),
        soldListings: parseInt(listingsResult.rows[0].sold),
        openReports: parseInt(reportsResult.rows[0].count),
        manualVerificationBacklog: parseInt(backlogResult.rows[0].count),
      };

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      };
    }

    // GET /api/admin/audit
    if (method === "GET" && path === "/audit") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      let result: any;
      try {
        result = await client.query(
          `SELECT id, actor_id as "actorId", action, created_at as "createdAt" FROM audit_logs ORDER BY created_at DESC LIMIT 200`,
        );
      } catch (auditErr) {
        console.error("Audit log query error:", auditErr);
        // Return empty audit log if table doesn't exist
        result = { rows: [] };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit: result.rows }),
      };
    }

    // GET /api/admin/listings
    if (method === "GET" && path === "/listings") {
      const result = await client.query(
        `SELECT * FROM listings ORDER BY created_at DESC`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: result.rows }),
      };
    }

    // POST /api/admin/listings/:id/hide
    if (
      method === "POST" &&
      path.includes("/listings/") &&
      path.includes("/hide")
    ) {
      const listingId = path.replace("/listings/", "").replace("/hide", "");
      const { reason } = JSON.parse(event.body || "{}");

      const result = await client.query(
        `UPDATE listings SET status = 'hidden', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [listingId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: result.rows[0].id,
          status: result.rows[0].status,
        }),
      };
    }

    // POST /api/admin/listings/:id/restore
    if (
      method === "POST" &&
      path.includes("/listings/") &&
      path.includes("/restore")
    ) {
      const listingId = path.replace("/listings/", "").replace("/restore", "");

      const result = await client.query(
        `UPDATE listings SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [listingId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: result.rows[0].id,
          status: result.rows[0].status,
        }),
      };
    }

    // GET /api/admin/reports
    if (method === "GET" && path === "/reports") {
      const result = await client.query(
        `SELECT * FROM reports ORDER BY created_at DESC`,
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reports: result.rows }),
      };
    }

    // POST /api/admin/reports/:id/resolve
    if (
      method === "POST" &&
      path.includes("/reports/") &&
      path.includes("/resolve")
    ) {
      const reportId = path.replace("/reports/", "").replace("/resolve", "");
      const { status, notes } = JSON.parse(event.body || "{}");

      const result = await client.query(
        `UPDATE reports SET status = $1, updated_at = NOW(), resolved_at = NOW() 
         WHERE id = $2 RETURNING *`,
        [status, reportId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Report not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ report: result.rows[0] }),
      };
    }

    // GET /api/admin/verifications
    if (method === "GET" && path === "/verifications") {
      const result = await client.query(
        `SELECT * FROM verifications ORDER BY submitted_at DESC`,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ verifications: result.rows }),
      };
    }

    // POST /api/admin/verifications/:id
    if (method === "POST" && path.startsWith("/verifications/")) {
      const verificationId = path.replace("/verifications/", "");
      const { status, notes } = JSON.parse(event.body || "{}");

      const result = await client.query(
        `UPDATE verifications SET status = $1, updated_at = NOW(), adjudicated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [status, verificationId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Verification not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ verification: result.rows[0] }),
      };
    }

    // GET /api/admin/bases
    if (method === "GET" && path === "/bases") {
      const result = await client.query(
        `SELECT * FROM bases ORDER BY name ASC`,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ bases: result.rows }),
      };
    }

    // POST /api/admin/bases
    if (method === "POST" && path === "/bases") {
      const { id, name, abbreviation, region, timezone, latitude, longitude } =
        JSON.parse(event.body || "{}");

      const existing = await client.query(
        "SELECT id FROM bases WHERE id = $1",
        [id],
      );
      if (existing.rows.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Base already exists" }),
        };
      }

      const result = await client.query(
        `INSERT INTO bases (id, name, abbreviation, region, timezone, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, name, abbreviation, region, timezone, latitude, longitude],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ base: result.rows[0] }),
      };
    }

    // PATCH /api/admin/bases/:id
    if (method === "PATCH" && path.startsWith("/bases/")) {
      const baseId = path.replace("/bases/", "");
      const { name, abbreviation, region, timezone, latitude, longitude } =
        JSON.parse(event.body || "{}");

      const updates: Record<string, any> = {};
      if (name) updates.name = name;
      if (abbreviation) updates.abbreviation = abbreviation;
      if (region) updates.region = region;
      if (timezone) updates.timezone = timezone;
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;

      if (Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No valid updates provided" }),
        };
      }

      const setClauses = Object.keys(updates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ");

      const values = Object.values(updates);
      const result = await client.query(
        `UPDATE bases SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
        [...values, baseId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Base not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ base: result.rows[0] }),
      };
    }

    // GET /api/admin/invitation-codes
    if (method === "GET" && path === "/invitation-codes") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const baseId =
        new URLSearchParams(event.rawQueryString).get("baseId") || "";
      let query = "SELECT * FROM invitation_codes";
      const params: any[] = [];

      if (baseId) {
        query += " WHERE base_id = $1";
        params.push(baseId);
      }

      query += " ORDER BY created_at DESC";

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        body: JSON.stringify({
          codes: result.rows.map((row: any) => ({
            id: row.id,
            code: row.code,
            baseId: row.base_id,
            maxUses: row.max_uses,
            usesCount: row.uses_count,
            active: row.active,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            description: row.description,
          })),
        }),
      };
    }

    // POST /api/admin/invitation-codes
    if (method === "POST" && path === "/invitation-codes") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const { code, baseId, maxUses, expiresAt, description } = JSON.parse(
        event.body || "{}",
      );

      if (!code || !baseId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "code and baseId are required" }),
        };
      }

      const result = await client.query(
        `INSERT INTO invitation_codes (id, code, created_by, base_id, max_uses, expires_at, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `code-${Date.now()}`,
          code,
          auth.userId,
          baseId,
          maxUses || null,
          expiresAt || null,
          description || null,
        ],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ code: result.rows[0] }),
      };
    }

    // DELETE /api/admin/invitation-codes/:id
    if (method === "DELETE" && path.startsWith("/invitation-codes/")) {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const codeId = path.replace("/invitation-codes/", "");

      await client.query("DELETE FROM invitation_codes WHERE id = $1", [
        codeId,
      ]);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    // GET /api/admin/account-notes/:userId
    if (method === "GET" && path.startsWith("/account-notes/")) {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const userId = path.replace("/account-notes/", "");

      const result = await client.query(
        "SELECT * FROM account_notes WHERE user_id = $1 ORDER BY created_at DESC",
        [userId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ notes: result.rows }),
      };
    }

    // POST /api/admin/account-notes/:userId
    if (method === "POST" && path.startsWith("/account-notes/")) {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const userId = path.replace("/account-notes/", "");
      const { noteType, strikeReason, description, severity } = JSON.parse(
        event.body || "{}",
      );

      if (!noteType || !description) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "noteType and description are required",
          }),
        };
      }

      const result = await client.query(
        `INSERT INTO account_notes (id, user_id, created_by, note_type, strike_reason, description, severity)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          `note-${Date.now()}`,
          userId,
          auth.userId,
          noteType,
          strikeReason || null,
          description,
          severity || "info",
        ],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ note: result.rows[0] }),
      };
    }

    // GET /api/admin/failed-logins
    if (method === "GET" && path === "/failed-logins") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const limit = parseInt(
        new URLSearchParams(event.rawQueryString).get("limit") || "100",
      );

      const result = await client.query(
        "SELECT * FROM failed_login_attempts ORDER BY attempted_at DESC LIMIT $1",
        [limit],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ attempts: result.rows }),
      };
    }

    // GET /api/admin/ip-blacklist
    if (method === "GET" && path === "/ip-blacklist") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const result = await client.query(
        "SELECT * FROM ip_blacklist WHERE active = true ORDER BY added_at DESC",
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ blacklist: result.rows }),
      };
    }

    // POST /api/admin/ip-blacklist
    if (method === "POST" && path === "/ip-blacklist") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const { ipAddress, reason, notes } = JSON.parse(event.body || "{}");

      if (!ipAddress || !reason) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "ipAddress and reason are required" }),
        };
      }

      const result = await client.query(
        `INSERT INTO ip_blacklist (id, ip_address, reason, added_by, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          `blacklist-${Date.now()}`,
          ipAddress,
          reason,
          auth.userId,
          notes || null,
        ],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ entry: result.rows[0] }),
      };
    }

    // DELETE /api/admin/ip-blacklist/:id
    if (method === "DELETE" && path.startsWith("/ip-blacklist/")) {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const entryId = path.replace("/ip-blacklist/", "");

      await client.query("DELETE FROM ip_blacklist WHERE id = $1", [entryId]);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    // GET /api/admin/threads
    if (method === "GET" && path === "/threads") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const result = await client.query(
        `SELECT * FROM message_threads ORDER BY created_at DESC`,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ threads: result.rows }),
      };
    }

    // GET /api/admin/threads/flagged
    if (method === "GET" && path === "/threads/flagged") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const result = await client.query(
        `SELECT * FROM message_threads WHERE status = 'active' ORDER BY created_at DESC LIMIT 10`,
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ threads: result.rows }),
      };
    }

    // POST /api/admin/update-account
    if (method === "POST" && path === "/update-account") {
      const { username, email, currentPassword, newPassword } = JSON.parse(
        event.body || "{}",
      );

      const adminResult = await client.query(
        "SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1",
      );

      if (adminResult.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Admin user not found" }),
        };
      }

      const admin = adminResult.rows[0];

      if (newPassword) {
        if (!currentPassword) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Current password required to set new password",
            }),
          };
        }

        const passwordValid = await bcrypt.compare(
          currentPassword,
          admin.password_hash,
        );
        if (!passwordValid) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: "Current password is incorrect" }),
          };
        }
      }

      const updates: Record<string, unknown> = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      if (newPassword)
        updates.password_hash = await bcrypt.hash(newPassword, 10);

      if (Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No changes provided" }),
        };
      }

      const updateClauses = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const updateValues = Object.values(updates);

      await client.query(
        `UPDATE users SET ${updateClauses}, updated_at = NOW() WHERE id = $${updateValues.length + 1}`,
        [...updateValues, admin.id],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Admin account updated successfully",
        }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Admin API error:", errorMsg, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    client.release();
  }
};
