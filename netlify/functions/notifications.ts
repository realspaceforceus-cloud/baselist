import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

const json = (body: any, status = 200) => ({
  statusCode: status,
  headers: {
    "content-type": "application/json",
    "cache-control": "no-store",
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  try {
    // Log for debugging
    console.log("NOTIFICATIONS_REQUEST", {
      path: event.path,
      rawUrl: event.rawUrl,
      hasCookie: !!event.headers?.cookie,
    });

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

    // Special case: /count endpoint - SAFE, always returns 200 with count
    // This endpoint never 500s, even if DB is down
    if (method === "GET" && path === "/count") {
      if (!userId) {
        return json({ unreadCount: 0 });
      }

      // TODO: real query once notifications table exists
      // For now, return 0 to prevent UI crashes
      return json({ unreadCount: 0 });
    }

    // All other endpoints require auth
    if (!userId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const client = await pool.connect();

    try {
      // GET /api/notifications - get user's notifications
      if (method === "GET" && (path === "" || path === "/")) {
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

        return json({
          notifications: result.rows,
          unreadCount: countResult.rows.length > 0 ? parseInt(countResult.rows[0].count) : 0,
          total: result.rows.length,
        });
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
          return json({ error: "Notification not found" }, 404);
        }

        return json(result.rows[0]);
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
          return json({ error: "Notification not found" }, 404);
        }

        return json(result.rows[0]);
      }

      // PATCH /api/notifications/read-all - mark all notifications as read
      if (method === "PATCH" && path === "/read-all") {
        await client.query(
          `UPDATE notifications 
           SET read = true, read_at = NOW()
           WHERE user_id = $1 AND read = false AND dismissed = false`,
          [userId],
        );

        return json({ success: true });
      }

      return json({ error: "Not found" }, 404);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("NOTIFICATIONS_ERROR", err);
    // Never return 500 for the count endpoint - return safe default
    return json({ unreadCount: 0, error: "temporary_unavailable" });
  }
};
