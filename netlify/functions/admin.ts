import { Handler } from "@netlify/functions";
import { pool } from "./db";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/admin", "");

  // GET /api/admin/users - get all users (admin only)
  if (method === "GET" && path === "/users") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, username, email, role, status, base_id, created_at FROM users",
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // GET /api/admin/reports - get all reports
  if (method === "GET" && path === "/reports") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM reports ORDER BY created_at DESC",
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // GET /api/admin/verifications - get pending verifications
  if (method === "GET" && path === "/verifications") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM verifications WHERE status = $1 ORDER BY submitted_at ASC",
        ["pending"],
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // PUT /api/admin/users/:id - update user
  if (method === "PUT" && path.includes("/users/")) {
    const client = await pool.connect();
    try {
      const id = path.split("/users/")[1];
      const updates = JSON.parse(event.body || "{}");

      const setClauses = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const values = [...Object.values(updates), id];

      const result = await client.query(
        `UPDATE users SET ${setClauses} WHERE id = $${Object.keys(updates).length + 1} RETURNING *`,
        values,
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // PUT /api/admin/reports/:id - update report
  if (method === "PUT" && path.includes("/reports/")) {
    const client = await pool.connect();
    try {
      const id = path.split("/reports/")[1];
      const { status, resolverId } = JSON.parse(event.body || "{}");

      const result = await client.query(
        `UPDATE reports SET status = $1, resolver_id = $2, resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END
         WHERE id = $3 RETURNING *`,
        [status, resolverId, id],
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // DELETE /api/admin/listings/:id - remove listing
  if (method === "DELETE" && path.includes("/listings/")) {
    const client = await pool.connect();
    try {
      const id = path.split("/listings/")[1];

      await client.query("DELETE FROM listings WHERE id = $1", [id]);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
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
