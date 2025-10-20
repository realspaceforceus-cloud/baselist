import { Handler } from "@netlify/functions";
import { store } from "../data/store";

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    if (event.httpMethod === "GET") {
      const settings = store.getSettings();
      const settingsObj: Record<string, string> = {};
      settings.forEach((setting: any) => {
        settingsObj[setting.keyName] = setting.value;
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

        store.updateSetting(key, String(value));
        updatedSettings[key] = String(value);
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
  }
};
