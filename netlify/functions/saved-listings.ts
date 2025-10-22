import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { createNotification } from "./notification-helpers";
import { getUserIdFromAuth } from "./auth";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/saved-listings", "");

  // Get userId from auth
  const userId = await getUserIdFromAuth(event);

  if (!userId) {
    // Return 401 for unauthenticated requests
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  let client;
  try {
    client = await pool.connect();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedListingIds: result.rows.map((row) => row.listing_id),
        }),
      };
    }

    // POST /api/saved-listings/:listingId - save a listing
    if (method === "POST" && path.startsWith("/")) {
      const listingId = path.slice(1);

      if (!listingId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing ID is required" }),
        };
      }

      // Check if already saved
      const existingResult = await client.query(
        `SELECT id FROM saved_listings
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );

      if (existingResult.rows.length > 0) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
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

      // Get listing and seller info for notification
      try {
        const listingInfo = await client.query(
          `SELECT title, seller_id FROM listings WHERE id = $1`,
          [listingId],
        );

        if (listingInfo.rows.length > 0) {
          const { title, seller_id } = listingInfo.rows[0];

          // Get user name for notification to seller
          const userInfo = await client.query(
            `SELECT username FROM users WHERE id = $1`,
            [userId],
          );
          const userName = userInfo.rows[0]?.username || "Someone";

          // Create notification for seller that someone favorited their item
          try {
            await createNotification({
              userId: seller_id,
              type: "item_favorited",
              title: `${userName} favorited "${title}"`,
              description: `Someone is interested in your listing. Reach out to them!`,
              actorId: userId,
              targetId: listingId,
              targetType: "listing",
              data: {
                listingTitle: title,
                buyerName: userName,
              },
            });
          } catch (notificationErr) {
            console.error(
              "Error creating favorite notification:",
              notificationErr,
            );
          }
        }
      } catch (err) {
        console.error("Error creating notification for favorite:", err);
      }

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true }),
      };
    }

    // DELETE /api/saved-listings/:listingId - unsave a listing
    if (method === "DELETE" && path.startsWith("/")) {
      const listingId = path.slice(1);

      if (!listingId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing ID is required" }),
        };
      }

      await client.query(
        `DELETE FROM saved_listings
         WHERE user_id = $1 AND listing_id = $2`,
        [userId, listingId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Saved listings error:", errorMsg);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};
