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

    // Insert rating into database
    const { error: insertError } = await client
      .from("ratings")
      .insert({
        id: ratingId,
        transaction_id: transactionId,
        user_id: userId,
        target_user_id: targetUserId,
        score: rating,
        comment: review || null,
        rating_type: ratingType || "transaction",
        created_at: now,
      });

    if (insertError) {
      console.error("[ratings] Insert error:", insertError);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Failed to save rating",
          details: insertError.message,
        }),
      };
    }

    // Create notification for rated user
    const { data: currentUser } = await client
      .from("users")
      .select("username")
      .eq("id", userId)
      .single();

    const currentUserName = currentUser?.username || "A user";

    const { error: notifError } = await client
      .from("notifications")
      .insert({
        id: randomUUID(),
        user_id: targetUserId,
        type: "rating_received",
        title: "New Rating",
        description: `${currentUserName} left you a ${rating}-star rating`,
        actor_id: userId,
        target_id: transactionId,
        target_type: "transaction",
        data: {
          rating,
          ratingType,
          reviewText: review,
        },
        created_at: now,
      });

    if (notifError) {
      console.error("[ratings] Notification error:", notifError);
      // Don't fail if notification fails - rating was saved
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
