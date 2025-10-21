import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { getUserIdFromAuth } from "./auth";

export const handler: Handler = async (event) => {
  try {
    const userId = await getUserIdFromAuth(event);
    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const q = (event.queryStringParameters?.q || "").toLowerCase().trim();
    if (q.length < 1) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: [] }),
      };
    }

    const client = await pool.connect();
    try {
      // Smart filtering: prioritize recently interacted users
      const result = await client.query(
        `
        SELECT DISTINCT
          u.id,
          u.username,
          u.avatar_url as "avatarUrl",
          MAX(ui.created_at) as "lastInteracted"
        FROM users u
        LEFT JOIN user_interactions ui ON u.id = ui.interacted_with_id AND ui.user_id = $1
        WHERE 
          u.id != $1
          AND u.allow_tagging = true
          AND LOWER(u.username) LIKE $2
        GROUP BY u.id, u.username, u.avatar_url
        ORDER BY 
          MAX(ui.created_at) DESC NULLS LAST,
          u.username ASC
        LIMIT 10
        `,
        [userId, `${q}%`]
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: result.rows }),
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[MENTIONS] Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
