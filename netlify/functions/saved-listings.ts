import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/saved-listings", "");

  // Get userId from cookies
  const cookies = event.headers.cookie || "";
  const userIdMatch = cookies.match(/userId=([^;]+)/);
  const userId = userIdMatch ? userIdMatch[1] : null;

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const client = await pool.connect();

  try {
    // GET /api/saved-listings - get user's saved listings
    if (method === "GET" && path === "") {
      const result = await client.query(
        `SELECT listing_id FROM saved_listings
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          savedListingIds: result.rows.map((row) => row.listing_id),
        }),
      };
    }

    // POST /api/saved-listings/:listingId - save a listing
    if (method === "POST" && path.startsWith("/")) {
      const listingId = path.slice(1);

      // Check if already saved
      const existingResult = await client.query(
        `SELECT id FROM saved_listings
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );

      if (existingResult.rows.length > 0) {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: "Listing already saved" }),
        };
      }

      // Create the saved listing record
      const result = await client.query(
        `INSERT INTO saved_listings (id, user_id, listing_id, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [randomUUID(), userId, listingId],
      );

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true }),
      };
    }

    // DELETE /api/saved-listings/:listingId - unsave a listing
    if (method === "DELETE" && path.startsWith("/")) {
      const listingId = path.slice(1);

      const result = await client.query(
        `DELETE FROM saved_listings
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    return {
      statusCode: 400,
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    client.release();
  }
};
