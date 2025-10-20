import { Handler } from "@netlify/functions";
import crypto from "crypto";

const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = `timestamp=${timestamp}`;

    // Create signature using Cloudinary API secret
    const signature = crypto
      .createHash("sha256")
      .update(params + CLOUDINARY_API_SECRET)
      .digest("hex");

    return {
      statusCode: 200,
      body: JSON.stringify({
        timestamp,
        signature,
      }),
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Internal server error";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
