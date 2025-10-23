import { Handler } from "@netlify/functions";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { getUserIdFromAuth } from "./auth";
import { createNotification } from "./notification-helpers";

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Get authenticated user
    const userId = await getUserIdFromAuth(event);
    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { targetUserId, rating, review, transactionId, ratingType } = body;

    // Validation
    if (!targetUserId || !rating || !transactionId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: targetUserId, rating, transactionId",
        }),
      };
    }

    if (rating < 1 || rating > 5) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Rating must be between 1 and 5" }),
      };
    }

    const ratingId = randomUUID();
    const now = new Date().toISOString();

    let client = null;
    try {
      client = await pool.connect();

      // Insert rating into database
      console.log("[ratings] Inserting rating:", { ratingId, transactionId, userId, targetUserId, rating });
      await client.query(
        `INSERT INTO ratings (id, transaction_id, user_id, target_user_id, score, comment, rating_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          ratingId,
          transactionId,
          userId,
          targetUserId,
          rating,
          review || null,
          ratingType || "transaction",
          now,
        ],
      );
      console.log("[ratings] Rating inserted successfully");

      // Get current user name for notification
      const userResult = await client.query(
        "SELECT username FROM users WHERE id = $1",
        [userId],
      );
      const currentUserName = userResult.rows[0]?.username || "A user";
      console.log("[ratings] Current user name:", currentUserName);

      // Create notification for rated user
      console.log("[ratings] Creating notification for:", targetUserId);
      await createNotification({
        userId: targetUserId,
        type: "rating_received",
        title: "New Rating",
        description: `${currentUserName} left you a ${rating}-star rating`,
        actorId: userId,
        targetId: transactionId,
        targetType: "transaction",
        data: {
          rating,
          ratingType,
          reviewText: review,
        },
      });
      console.log("[ratings] Notification created successfully");
    } catch (dbError) {
      console.error("[ratings] Database error:", dbError);
      throw dbError;
    } finally {
      if (client) {
        client.release();
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        ratingId,
        message: "Rating submitted successfully",
      }),
    };
  } catch (error) {
    console.error("[ratings] Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
