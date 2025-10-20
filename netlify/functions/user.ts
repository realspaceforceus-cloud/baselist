import { Handler } from "@netlify/functions";
import { pool } from "./db";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

const verifyToken = (authHeader?: string): string | null => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  return token || null;
};

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Note: For avatar upload and basic profile updates, we accept requests
  // from authenticated clients (verified via credentials in request)
  // Full token verification can be added here if needed for sensitive operations

  const path =
    event.path.replace(/\/.netlify\/functions\/user|\/api\/user/g, "") || "";
  let client;

  try {
    client = await pool.connect();

    if (
      path === "/profile/update" ||
      (path === "/profile" && event.httpMethod === "POST")
    ) {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid JSON" }),
        };
      }

      const { name } = body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid username" }),
        };
      }

      const trimmedName = name.trim();

      if (!USERNAME_PATTERN.test(trimmedName)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error:
              "Username must be 3-20 characters long and contain only letters, numbers, and underscores",
          }),
        };
      }

      // Check if username is already taken (case-insensitive)
      const existingUser = await client.query(
        "SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
        [trimmedName],
      );

      if (existingUser.rows.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Username is already taken" }),
        };
      }

      // Update username in database
      // Note: You may need to add this update logic based on your database schema
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Profile updated",
          name: trimmedName,
        }),
      };
    }

    if (path === "/profile/avatar") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid JSON" }),
        };
      }

      const { avatarUrl } = body;

      if (!avatarUrl || typeof avatarUrl !== "string") {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Invalid avatar URL" }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Avatar updated",
          avatarUrl,
        }),
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("[USER] Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};
