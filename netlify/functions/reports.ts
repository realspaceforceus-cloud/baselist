import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/reports", "");

  // POST /api/reports - user submits a report
  if (method === "POST" && path === "") {
    const client = await pool.connect();
    try {
      const { targetType, targetId, type, notes } = JSON.parse(
        event.body || "{}",
      );

      // Get userId from cookies
      const cookies = event.headers.cookie || "";
      const userIdMatch = cookies.match(/userId=([^;]+)/);
      const userId = userIdMatch ? userIdMatch[1] : null;

      if (!userId) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      if (!targetType || !targetId || !type || !notes) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const reportId = randomUUID();

      // Get base_id from listing or user
      let baseId = "unknown";
      if (targetType === "listing") {
        const listingResult = await client.query(
          "SELECT base_id FROM listings WHERE id = $1",
          [targetId],
        );
        if (listingResult.rows.length > 0) {
          baseId = listingResult.rows[0].base_id;
        }
      } else if (targetType === "user") {
        const userResult = await client.query(
          "SELECT base_id FROM users WHERE id = $1",
          [targetId],
        );
        if (userResult.rows.length > 0) {
          baseId = userResult.rows[0].base_id;
        }
      }

      const result = await client.query(
        `INSERT INTO reports (id, type, reporter_id, target_type, target_id, base_id, notes, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [reportId, type, userId, targetType, targetId, baseId, notes, "open"],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, reportId }),
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

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
