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
      console.log("[ratings] Inserting rating:", {
        ratingId,
        transactionId,
        userId,
        targetUserId,
        rating,
      });

      // Try to insert with all columns first
      try {
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
      } catch (columnError: any) {
        // If target_user_id or rating_type columns don't exist, try without them
        console.log(
          "[ratings] Column error, trying without target_user_id/rating_type:",
          columnError.message,
        );
        await client.query(
          `INSERT INTO ratings (id, transaction_id, user_id, score, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [ratingId, transactionId, userId, rating, review || null, now],
        );
      }
      console.log("[ratings] Rating inserted successfully");

      // Get current user name for notification
      const userResult = await client.query(
        "SELECT username FROM users WHERE id = $1",
        [userId],
      );
      const currentUserName = userResult.rows[0]?.username || "A user";
      console.log("[ratings] Current user name:", currentUserName);

      // Try to create notification, but don't fail if it errors
      try {
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
      } catch (notifError) {
        // Log notification error but don't fail the rating submission
        console.error("[ratings] Notification error (non-fatal):", notifError);
      }
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
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[ratings] Catch block error:", { errorMsg, errorStack, error });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Rating submission failed",
        details: errorMsg,
        type: error instanceof Error ? error.constructor.name : "Unknown",
      }),
    };
  }
};

export { handler };
