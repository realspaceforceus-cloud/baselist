import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/auth", "");

  // POST /api/auth/register
  if (method === "POST" && path === "/register") {
    const client = await pool.connect();
    try {
      const { email, password, username, baseId } = JSON.parse(event.body || "{}");

      if (!email || !password || !username || !baseId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if user exists
      const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);

      if (existing.rows.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Email already registered" }),
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();

      await client.query(
        `INSERT INTO users (id, email, username, password_hash, role, status, base_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, email, username, passwordHash, "member", "active", baseId, ""],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, userId }),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/auth/login
  if (method === "POST" && path === "/login") {
    const client = await pool.connect();
    try {
      const { email, password } = JSON.parse(event.body || "{}");

      if (!email || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing email or password" }),
        };
      }

      const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = result.rows[0];

      if (!user) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid credentials" }),
        };
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid credentials" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            baseId: user.base_id,
          },
        }),
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal server error";
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
