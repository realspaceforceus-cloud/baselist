import { Handler } from "@netlify/functions";
import { pool } from "./db";
import bcrypt from "bcryptjs";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/admin", "") || "";

  // POST /api/admin/update-account
  if (method === "POST" && path === "/update-account") {
    const client = await pool.connect();
    try {
      const { username, email, currentPassword, newPassword } = JSON.parse(
        event.body || "{}",
      );

      // Get the current admin user
      const adminResult = await client.query(
        "SELECT id, password_hash FROM users WHERE role = 'admin' LIMIT 1",
      );

      if (adminResult.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Admin user not found" }),
        };
      }

      const admin = adminResult.rows[0];

      // If changing password, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: "Current password required to set new password",
            }),
          };
        }

        const passwordValid = await bcrypt.compare(
          currentPassword,
          admin.password_hash,
        );

        if (!passwordValid) {
          return {
            statusCode: 401,
            body: JSON.stringify({ error: "Current password is incorrect" }),
          };
        }
      }

      // Update admin account
      const updates: Record<string, unknown> = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      if (newPassword) updates.password_hash = await bcrypt.hash(newPassword, 10);

      if (Object.keys(updates).length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No changes provided" }),
        };
      }

      const updateClauses = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const updateValues = Object.values(updates);

      await client.query(
        `UPDATE users SET ${updateClauses}, updated_at = NOW() WHERE id = $${updateValues.length + 1}`,
        [...updateValues, admin.id],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Admin account updated successfully",
        }),
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
