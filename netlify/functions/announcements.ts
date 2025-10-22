import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { getUserIdFromAuth } from "./auth";

async function isAdmin(client: any, userId: string): Promise<boolean> {
  const result = await client.query("SELECT role FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows.length > 0 && result.rows[0].role === "admin";
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  let path = event.path;

  if (path.startsWith("/api/announcements")) {
    path = path.replace("/api/announcements", "");
  } else if (path.startsWith("/.netlify/functions/announcements")) {
    path = path.replace("/.netlify/functions/announcements", "");
  }
  path = path || "/";

  const userId = await getUserIdFromAuth(event);
  const client = await pool.connect();

  try {
    // GET /api/announcements
    if (method === "GET" && path === "/") {
      try {
        let query = `SELECT
            id,
            title,
            content,
            color,
            background_color as "backgroundColor",
            text_color as "textColor",
            is_visible as "isVisible",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy"
           FROM announcements
           WHERE is_visible = true`;

        const params: any[] = [];

        // If user is authenticated, exclude announcements they've dismissed
        if (userId) {
          query += ` AND id NOT IN (
            SELECT announcement_id FROM dismissed_announcements WHERE user_id = $1
          )`;
          params.push(userId);
        }

        query += ` ORDER BY created_at DESC LIMIT 1`;

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ announcements: [] }),
          };
        }

        const announcement = result.rows[0];

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcements: [announcement],
          }),
        };
      } catch (err) {
        console.error("Error fetching announcements:", err);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcements: [] }),
        };
      }
    }

    // GET /api/announcements/admin (admin only - get all)
    if (method === "GET" && path === "/admin") {
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      if (!(await isAdmin(client, userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      try {
        const result = await client.query(
          `SELECT 
            id, 
            title, 
            content, 
            color, 
            background_color as "backgroundColor",
            text_color as "textColor",
            is_visible as "isVisible",
            created_at as "createdAt",
            updated_at as "updatedAt",
            created_by as "createdBy"
           FROM announcements 
           ORDER BY created_at DESC`,
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcements: result.rows }),
        };
      } catch (err) {
        console.error("Error fetching admin announcements:", err);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcements: [] }),
        };
      }
    }

    // POST /api/announcements (create)
    if (method === "POST" && path === "/") {
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      if (!(await isAdmin(client, userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      try {
        const { title, content, color, backgroundColor, textColor, isVisible } =
          JSON.parse(event.body || "{}");

        if (!title || !content) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Missing required fields" }),
          };
        }

        const id = randomUUID();
        const result = await client.query(
          `INSERT INTO announcements (id, title, content, color, background_color, text_color, is_visible, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, title, content, color, background_color as "backgroundColor",
                     text_color as "textColor", is_visible as "isVisible",
                     created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"`,
          [
            id,
            title,
            content,
            color || "#3b82f6",
            backgroundColor || "#dbeafe",
            textColor || "#1e40af",
            isVisible !== false,
            userId,
          ],
        );

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcement: result.rows[0] }),
        };
      } catch (err) {
        console.error("Error creating announcement:", err);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to create announcement" }),
        };
      }
    }

    // PATCH /api/announcements/:id (update)
    if (method === "PATCH" && path.startsWith("/") && path !== "/") {
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      if (!(await isAdmin(client, userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      try {
        const announcementId = path.slice(1);
        const { title, content, color, backgroundColor, textColor, isVisible } =
          JSON.parse(event.body || "{}");

        const updates: Record<string, any> = {};
        const values: any[] = [];
        let paramCount = 1;

        if (title !== undefined) {
          updates.title = `$${paramCount++}`;
          values.push(title);
        }
        if (content !== undefined) {
          updates.content = `$${paramCount++}`;
          values.push(content);
        }
        if (color !== undefined) {
          updates.color = `$${paramCount++}`;
          values.push(color);
        }
        if (backgroundColor !== undefined) {
          updates.background_color = `$${paramCount++}`;
          values.push(backgroundColor);
        }
        if (textColor !== undefined) {
          updates.text_color = `$${paramCount++}`;
          values.push(textColor);
        }
        if (isVisible !== undefined) {
          updates.is_visible = `$${paramCount++}`;
          values.push(isVisible);
        }

        if (Object.keys(updates).length === 0) {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "No fields to update" }),
          };
        }

        updates.updated_at = `NOW()`;
        values.push(announcementId);

        const setClauses = Object.entries(updates)
          .map(([key, val]) => `${key} = ${val}`)
          .join(", ");

        const result = await client.query(
          `UPDATE announcements 
           SET ${setClauses}
           WHERE id = $${paramCount}
           RETURNING id, title, content, color, background_color as "backgroundColor",
                     text_color as "textColor", is_visible as "isVisible",
                     created_at as "createdAt", updated_at as "updatedAt", created_by as "createdBy"`,
          values,
        );

        if (result.rows.length === 0) {
          return {
            statusCode: 404,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Announcement not found" }),
          };
        }

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ announcement: result.rows[0] }),
        };
      } catch (err) {
        console.error("Error updating announcement:", err);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to update announcement" }),
        };
      }
    }

    // DELETE /api/announcements/:id
    if (method === "DELETE" && path.startsWith("/") && path !== "/") {
      if (!auth) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      if (!(await isAdmin(client, userId))) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      try {
        const announcementId = path.slice(1);

        await client.query("DELETE FROM announcements WHERE id = $1", [
          announcementId,
        ]);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } catch (err) {
        console.error("Error deleting announcement:", err);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to delete announcement" }),
        };
      }
    }

    // POST /api/announcements/:id/dismiss
    if (method === "POST" && path.includes("/") && path.endsWith("/dismiss")) {
      if (!auth) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      try {
        const announcementId = path.replace("/dismiss", "").slice(1);

        // Insert dismiss record (ignore if already exists due to unique constraint)
        await client.query(
          `INSERT INTO dismissed_announcements (id, user_id, announcement_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, announcement_id) DO NOTHING`,
          [randomUUID(), userId, announcementId],
        );

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true }),
        };
      } catch (err) {
        console.error("Error dismissing announcement:", err);
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Failed to dismiss announcement" }),
        };
      }
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } finally {
    client.release();
  }
};
