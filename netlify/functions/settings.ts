import { Handler } from "@netlify/functions";
import { pool } from "./db";

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  let client;
  try {
    client = await pool.connect();

    if (event.httpMethod === "GET") {
      const result = await client.query(
        "SELECT key_name, value FROM settings ORDER BY key_name ASC",
      );
      const settingsObj: Record<string, string> = {};
      result.rows.forEach((row: any) => {
        settingsObj[row.key_name] = row.value;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          settings: settingsObj,
        }),
      };
    }

    if (event.httpMethod === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: "Invalid JSON",
          }),
        };
      }

      if (!body || typeof body !== "object") {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: "Invalid settings format",
          }),
        };
      }

      const updatedSettings: Record<string, string> = {};

      for (const [key, value] of Object.entries(body)) {
        if (!/^[a-zA-Z0-9_]+$/.test(key)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              error: `Invalid setting key: ${key}`,
            }),
          };
        }

        const stringValue = String(value);
        await client.query(
          "INSERT INTO settings (key_name, value) VALUES ($1, $2) ON CONFLICT (key_name) DO UPDATE SET value = $2, updated_at = NOW()",
          [key, stringValue],
        );
        updatedSettings[key] = stringValue;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Settings updated successfully",
          settings: updatedSettings,
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  } catch (error) {
    console.error("[SETTINGS] Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};
