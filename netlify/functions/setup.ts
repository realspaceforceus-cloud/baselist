import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const DEFAULT_ADMIN_USERNAME = "Jared";
const DEFAULT_ADMIN_EMAIL = "s3recap@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "password";
const DEFAULT_BASE_ID = "vance-afb";

async function ensureDefaultAdmin() {
  const client = await pool.connect();
  try {
    // Check if base exists
    const baseResult = await client.query(
      "SELECT id FROM bases WHERE id = $1",
      [DEFAULT_BASE_ID],
    );

    if (baseResult.rows.length === 0) {
      // Create default base
      await client.query(
        `INSERT INTO bases (id, name, abbreviation, region, timezone, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          DEFAULT_BASE_ID,
          "Vance Air Force Base",
          "VAFB",
          "Oklahoma",
          "America/Chicago",
          36.3944,
          -97.4614,
        ],
      );
    }

    // Check if admin exists
    const adminResult = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
    );

    if (adminResult.rows.length === 0) {
      // Create default admin user
      const adminId = randomUUID();
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

      await client.query(
        `INSERT INTO users (id, email, username, password_hash, role, status, base_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          adminId,
          DEFAULT_ADMIN_EMAIL,
          DEFAULT_ADMIN_USERNAME,
          passwordHash,
          "admin",
          "active",
          DEFAULT_BASE_ID,
          "",
        ],
      );
    }
  } finally {
    client.release();
  }
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path =
    event.path.replace("/.netlify/functions/setup", "") ||
    event.rawUrl?.split("?")[0]?.replace(/.*setup/, "") ||
    "";

  // GET /api/setup/status
  if (method === "GET" && path === "/status") {
    const client = await pool.connect();
    try {
      // Ensure default admin exists
      await ensureDefaultAdmin();

      // Check if any admin user exists
      const result = await client.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
      );

      const isSetupComplete = result.rows.length > 0;

      return {
        statusCode: 200,
        body: JSON.stringify({ isSetupComplete }),
      };
    } catch (err) {
      // If there's a connection error, return false
      return {
        statusCode: 200,
        body: JSON.stringify({ isSetupComplete: false }),
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
