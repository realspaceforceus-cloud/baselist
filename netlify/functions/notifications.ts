import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;

  // Fix path parsing to handle both direct calls and redirected requests
  let path = event.path;
  if (path.startsWith("/api/notifications")) {
    path = path.replace("/api/notifications", "");
  } else if (path.startsWith("/.netlify/functions/notifications")) {
    path = path.replace("/.netlify/functions/notifications", "");
  }
  path = path || "/";

  // Get userId from cookies
  const cookies = event.headers.cookie || "";
  const userIdMatch = cookies.match(/userId=([^;]+)/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const client = await pool.connect();

  try {
    // GET /api/notifications - get user's notifications
    if (method === "GET" && path === "") {
      const query = event.queryStringParameters || {};
      const limit = parseInt(query.limit as string) || 50;
      const offset = parseInt(query.offset as string) || 0;
      const unreadOnly = query.unread === "true";

      let sql = `
        SELECT 
          id, user_id, type, title, description, actor_id, target_id, target_type,
          data, read, dismissed, created_at, read_at, dismissed_at
        FROM notifications
        WHERE user_id = $1 AND dismissed = false
      `;
      const params: any[] = [userId];

      if (unreadOnly) {
        sql += ` AND read = false`;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await client.query(sql, params);

      // Get unread count
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = $1 AND read = false AND dismissed = false`,
        [userId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: result.rows,
          unreadCount: parseInt(countResult.rows[0].count),
          total: result.rows.length,
        }),
      };
    }

    // GET /api/notifications/count - get unread notification count
    if (method === "GET" && path === "/count") {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM notifications 
         WHERE user_id = $1 AND read = false AND dismissed = false`,
        [userId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unreadCount: parseInt(result.rows[0].count),
        }),
      };
    }

    // PATCH /api/notifications/:id/read - mark notification as read
    if (method === "PATCH" && path.includes("/read")) {
      const notificationId = path.split("/")[1];

      const result = await client.query(
        `UPDATE notifications 
         SET read = true, read_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Notification not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows[0]),
      };
    }

    // PATCH /api/notifications/:id/dismiss - dismiss notification
    if (method === "PATCH" && path.includes("/dismiss")) {
      const notificationId = path.split("/")[1];

      const result = await client.query(
        `UPDATE notifications 
         SET dismissed = true, dismissed_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Notification not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows[0]),
      };
    }

    // PATCH /api/notifications/read-all - mark all notifications as read
    if (method === "PATCH" && path === "/read-all") {
      await client.query(
        `UPDATE notifications 
         SET read = true, read_at = NOW()
         WHERE user_id = $1 AND read = false AND dismissed = false`,
        [userId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Notifications error:", errorMsg);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    client.release();
  }
};
