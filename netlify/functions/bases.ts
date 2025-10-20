import { Handler } from "@netlify/functions";
import { pool } from "./db";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/bases", "");

  // GET /api/bases - get all bases
  if (method === "GET" && path === "") {
    let client;
    try {
      client = await pool.connect();
      const result = await client.query("SELECT * FROM bases ORDER BY name ASC");

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows),
      };
    } catch (err) {
      console.error("Error fetching bases:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      if (client) client.release();
    }
  }

  // GET /api/bases/:id - get specific base
  if (method === "GET" && path.startsWith("/")) {
    const client = await pool.connect();
    try {
      const id = path.slice(1);
      const result = await client.query("SELECT * FROM bases WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Base not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows[0]),
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
    body: JSON.stringify({ error: "Not found" }),
  };
};
