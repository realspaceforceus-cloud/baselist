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

    // GET /api/admin/dashboard
    if (method === "GET") {
      if (!(await isAdmin(auth.userId))) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: "Forbidden" }),
        };
      }

      const usersResult = await client.query(
        "SELECT COUNT(*) as count FROM users",
      );
      const listingsResult = await client.query(
        "SELECT COUNT(*) as count FROM listings WHERE status = 'active'",
      );
      const transactionsResult = await client.query(
        "SELECT COUNT(*) as count FROM transactions",
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          users: parseInt(usersResult.rows[0].count),
          listings: parseInt(listingsResult.rows[0].count),
          transactions: parseInt(transactionsResult.rows[0].count),
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
    console.error("Admin dashboard API error:", errorMsg, err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    client.release();
  }
};
