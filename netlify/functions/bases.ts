import { Handler } from "@netlify/functions";
import { pool } from "./db";

export const handler: Handler = async (event) => {
  console.log("[BASES] Request received:", {
    method: event.httpMethod,
    path: event.path,
    url: event.rawUrl,
  });

  const method = event.httpMethod;
  const path = event.path.replace(
    /\/.netlify\/functions\/bases|\/api\/bases/,
    "",
  );

  console.log("[BASES] Normalized path:", path);

  // GET /api/bases - get all active bases (excluding soft-deleted ones)
  if (method === "GET" && (!path || path === "" || path === "/")) {
    let client;
    try {
      console.log("[BASES] Attempting to connect to database...");
      client = await pool.connect();
      console.log("[BASES] Connected to database, querying bases...");

      const result = await client.query(
        "SELECT * FROM bases WHERE deleted_at IS NULL ORDER BY name ASC",
      );
      console.log(
        "[BASES] Query successful, returning",
        result.rows.length,
        "active bases",
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows),
      };
    } catch (err) {
      console.error("[BASES] Error fetching bases:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: errorMsg,
          timestamp: new Date().toISOString(),
        }),
      };
    } finally {
      if (client) {
        console.log("[BASES] Releasing database connection");
        client.release();
      }
    }
  }

  // GET /api/bases/:id - get specific base
  if (method === "GET" && path && path !== "/") {
    let client;
    try {
      console.log("[BASES] Fetching specific base:", path);
      client = await pool.connect();
      const id = path.startsWith("/") ? path.slice(1) : path;
      const result = await client.query("SELECT * FROM bases WHERE id = $1", [
        id,
      ]);

      if (result.rows.length === 0) {
        console.log("[BASES] Base not found:", id);
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Base not found" }),
        };
      }

      console.log("[BASES] Base found:", id);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.rows[0]),
      };
    } catch (err) {
      console.error("[BASES] Error fetching base:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      if (client) {
        console.log("[BASES] Releasing database connection");
        client.release();
      }
    }
  }

  console.log("[BASES] No matching route for:", method, path);
  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: "Not found" }),
  };
};
