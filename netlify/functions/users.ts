import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/users", "");
  const userId = event.headers.authorization?.replace("Bearer ", "");

  // GET /api/users/:id (supports both ID and username)
  if (method === "GET" && path.startsWith("/")) {
    const client = await pool.connect();
    try {
      const param = path.slice(1);

      // Check if param looks like a UUID (contains dashes) or is a username
      const isUuid = param.includes("-") && param.split("-").length === 5;

      const result = await client.query(
        `SELECT
          u.id,
          u.username as name,
          u.email,
          u.role,
          u.base_id as "baseId",
          u.avatar_url as "avatarUrl",
          u.created_at as "memberSince",
          u.dow_verified_at as "verifiedAt",
          u.last_login_at as "lastActiveAt",
          COALESCE(
            (SELECT AVG(CAST(score AS FLOAT)) FROM ratings r
             INNER JOIN transactions t ON r.transaction_id = t.id
             WHERE t.seller_id = u.id AND r.user_id != u.id),
            NULL
          ) as rating,
          (SELECT COUNT(*) FROM ratings r
           INNER JOIN transactions t ON r.transaction_id = t.id
           WHERE t.seller_id = u.id AND r.user_id != u.id) as "ratingCount",
          (SELECT COUNT(*) FROM transactions WHERE seller_id = u.id AND status = 'completed') as "completedSales"
        FROM users u WHERE ${isUuid ? "u.id = $1" : "LOWER(u.username) = LOWER($1)"}`,
        [param],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      const user = result.rows[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          id: user.id,
          username: user.name || "Member",
          name: user.name || "Member",
          email: user.email,
          role: user.role,
          currentBaseId: user.baseId,
          baseId: user.baseId,
          avatarUrl: user.avatarUrl || "",
          memberSince: user.memberSince,
          verified: !!user.verifiedAt,
          verifiedAt: user.verifiedAt,
          lastActiveAt: user.lastActiveAt,
          rating: user.rating ? parseFloat(user.rating) : null,
          ratingCount: parseInt(user.ratingCount) || 0,
          completedSales: parseInt(user.completedSales) || 0,
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/users/profile/update
  if (method === "POST" && path === "/profile/update") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const client = await pool.connect();
    try {
      const { name } = JSON.parse(event.body || "{}");

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid username" }),
        };
      }

      const result = await client.query(
        "UPDATE users SET username = $1 WHERE id = $2 RETURNING username",
        [name.trim(), userId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Profile updated",
          name: result.rows[0]?.username,
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/users/password/change
  if (method === "POST" && path === "/password/change") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const client = await pool.connect();
    try {
      const { currentPassword, newPassword } = JSON.parse(event.body || "{}");

      if (!currentPassword || !newPassword) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Password must be at least 8 characters",
          }),
        };
      }

      const result = await client.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      const passwordMatch = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash,
      );
      if (!passwordMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Current password is incorrect" }),
        };
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
        newHash,
        userId,
      ]);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Password changed successfully",
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/users/account/delete
  if (method === "POST" && path === "/account/delete") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const client = await pool.connect();
    try {
      // Delete user's listings
      await client.query("DELETE FROM listings WHERE seller_id = $1", [userId]);

      // Remove user from message threads
      await client.query(
        "UPDATE message_threads SET participants = array_remove(participants, $1) WHERE $1 = ANY(participants)",
        [userId],
      );

      // Delete empty threads
      await client.query(
        "DELETE FROM message_threads WHERE array_length(participants, 1) = 0",
      );

      // Delete user account
      await client.query("DELETE FROM users WHERE id = $1", [userId]);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Account deleted successfully",
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Not found" }),
  };
};
