import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/setup", "");

  // GET /api/setup/status
  if (method === "GET" && path === "/status") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT value FROM settings WHERE key_name = $1",
        ["setup_complete"],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ setupComplete: result.rows.length > 0 }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Error checking setup status" }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/setup/initialize
  if (method === "POST" && path === "/initialize") {
    const client = await pool.connect();
    try {
      const { adminEmail, adminPassword, adminUsername, baseId, includeSampleData } =
        JSON.parse(event.body || "{}");

      if (!adminEmail || !adminPassword || !adminUsername || !baseId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if already setup
      const existing = await client.query(
        "SELECT value FROM settings WHERE key_name = $1",
        ["setup_complete"],
      );

      if (existing.rows.length > 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Setup already complete" }),
        };
      }

      // Create admin user
      const adminId = randomUUID();
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await client.query(
        `INSERT INTO users (id, email, username, password_hash, role, status, base_id, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [adminId, adminEmail, adminUsername, passwordHash, "admin", "active", baseId, ""],
      );

      // Mark setup complete
      await client.query(
        "INSERT INTO settings (key_name, value) VALUES ($1, $2)",
        ["setup_complete", "true"],
      );

      // Optionally add sample data
      if (includeSampleData) {
        await client.query(
          `INSERT INTO listings (id, title, price, is_free, category, status, seller_id, base_id, description, image_urls)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            randomUUID(),
            "Sample Listing",
            50,
            false,
            "furniture",
            "active",
            adminId,
            baseId,
            "This is a sample listing created during setup",
            "[]",
          ],
        );
      }

      return {
        statusCode: 201,
        body: JSON.stringify({
          success: true,
          message: "Setup complete",
          adminId,
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
