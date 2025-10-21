import { Handler } from "@netlify/functions";
import { pool } from "../db";

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

    // GET /api/admin/users (with pagination and search)
    if (method === "GET") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const search =
        new URLSearchParams(event.rawQueryString).get("search") || "";
      const page = parseInt(
        new URLSearchParams(event.rawQueryString).get("page") || "1",
      );
      const limit = 25;
      const offset = (page - 1) * limit;

      let query = `SELECT id, username, email, role, status, base_id as "baseId", created_at as "createdAt",
                updated_at as "updatedAt", dow_verified_at as "dowVerifiedAt", last_login_at as "lastLoginAt",
                remember_device_until as "rememberDeviceUntil", avatar_url as "avatarUrl", join_method as "joinMethod"
         FROM users`;

      const params: any[] = [];

      if (search) {
        query += ` WHERE (username ILIKE $1 OR email ILIKE $1 OR base_id ILIKE $1)`;
        params.push(`%${search}%`);
      }

      const countQuery = query.replace(
        /SELECT.*FROM/,
        "SELECT COUNT(*) as count FROM",
      );
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      return {
        statusCode: 200,
        body: JSON.stringify({
          users: result.rows,
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
    if (method === "PATCH") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      // Extract userId from the path
      const pathParts = event.path.split("/");
      const userId = pathParts[pathParts.length - 1];

      const { status, role, verify, reason, strikeType, strikeDescription } =
        JSON.parse(event.body || "{}");

      const userResult = await client.query(
        "SELECT * FROM users WHERE id = $1",
        [userId],
      );
      if (userResult.rows.length === 0) {
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

    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Admin users API error:", errorMsg, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    client.release();
  }
};
