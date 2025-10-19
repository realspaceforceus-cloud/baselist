import { Handler } from "@netlify/functions";
import { supabase } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

// Check if setup is complete
export const checkSetup: Handler = async () => {
  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key_name", "setup_complete")
      .single();

    return {
      statusCode: 200,
      body: JSON.stringify({ setupComplete: !!settings }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error checking setup status" }),
    };
  }
};

// Initialize setup
export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/setup", "");

  // GET /api/setup/status
  if (method === "GET" && path === "/status") {
    return checkSetup();
  }

  // POST /api/setup/initialize
  if (method === "POST" && path === "/initialize") {
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
      const { data: existing } = await supabase
        .from("settings")
        .select("value")
        .eq("key_name", "setup_complete")
        .single()
        .catch(() => ({ data: null }));

      if (existing) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Setup already complete" }),
        };
      }

      // Create admin user
      const adminId = randomUUID();
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const { error: userError } = await supabase.from("users").insert({
        id: adminId,
        email: adminEmail,
        username: adminUsername,
        password_hash: passwordHash,
        role: "admin",
        status: "active",
        base_id: baseId,
        avatar_url: "",
      });

      if (userError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: userError.message }),
        };
      }

      // Mark setup complete
      const { error: settingError } = await supabase.from("settings").insert({
        key_name: "setup_complete",
        value: "true",
      });

      if (settingError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: settingError.message }),
        };
      }

      // Optionally add sample data
      if (includeSampleData) {
        await addSampleData(baseId, adminId);
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
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};

async function addSampleData(baseId: string, adminId: string) {
  try {
    // Create sample listing
    await supabase.from("listings").insert({
      id: randomUUID(),
      title: "Sample Listing",
      price: 50,
      is_free: false,
      category: "furniture",
      status: "active",
      seller_id: adminId,
      base_id: baseId,
      description: "This is a sample listing created during setup",
      image_urls: [],
    });
  } catch (err) {
    console.error("Error adding sample data:", err);
  }
}
