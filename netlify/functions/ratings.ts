import { Handler } from "@netlify/functions";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { getUserIdFromAuth } from "./auth";
import { createNotification } from "./notification-helpers";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler: Handler = async (event, context) => {
  console.log("[RATINGS] ========== REQUEST START ==========");
  console.log("[RATINGS] Method:", event.httpMethod);
  console.log("[RATINGS] Path:", event.path);

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    console.log("[RATINGS] OPTIONS preflight request");
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    console.log("[RATINGS] ❌ Method not allowed:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Method not allowed",
        received: event.httpMethod,
        expected: "POST",
      }),
    };
  }

  try {
    console.log("[RATINGS] ✓ POST method confirmed");

    // Get authenticated user
    const userId = await getUserIdFromAuth(event);
    console.log("[RATINGS] User authenticated:", userId ? "✓" : "✗");

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const {
      targetUserId,
      rating,
      review,
      transactionId,
      ratingType,
      threadId,
    } = body;

    console.log("[RATINGS] Parsed data:", {
      targetUserId,
      rating,
      transactionId,
      threadId,
      hasReview: !!review,
    });

    // Accept either transactionId or threadId (they're the same in this system)
    const actualThreadId = threadId || transactionId;

    // Validation
    if (!targetUserId || !rating || !actualThreadId) {
      console.log("[RATINGS] ❌ Missing required fields");
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing required fields",
          required: ["targetUserId", "rating", "threadId or transactionId"],
        }),
      };
    }

    if (rating < 1 || rating > 5) {
      console.log("[RATINGS] ❌ Rating out of range:", rating);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Rating must be between 1 and 5" }),
      };
    }

    console.log("[RATINGS] ✓ Validation passed");

    const ratingId = randomUUID();
    const now = new Date().toISOString();

    let client = null;
    try {
      console.log("[RATINGS] Connecting to database...");
      client = await pool.connect();
      console.log("[RATINGS] ✓ Database connected");

      // 1. Verify thread exists
      console.log("[RATINGS] Verifying thread exists...");
      const threadCheck = await client.query(
        `SELECT id, transaction FROM message_threads WHERE id = $1`,
        [actualThreadId],
      );

      if (threadCheck.rows.length === 0) {
        console.log("[RATINGS] ❌ Thread not found");
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      console.log("[RATINGS] ✓ Thread found");

      // 2. Check if user already rated this transaction
      console.log("[RATINGS] Checking for existing rating...");
      const existingRating = await client.query(
        `SELECT id FROM ratings WHERE thread_id = $1 AND user_id = $2`,
        [actualThreadId, userId],
      );

      if (existingRating.rows.length > 0) {
        console.log("[RATINGS] User already rated this transaction");
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "You have already rated this transaction",
            alreadyRated: true,
          }),
        };
      }

      // 3. Get existing transaction from thread
      const transaction = threadCheck.rows[0].transaction || {};
      const ratingByUser = transaction.ratingByUser || {};
      ratingByUser[userId] = rating;

      console.log("[RATINGS] Updated ratingByUser:", ratingByUser);

      // 4. Insert rating into ratings table
      const ratingRecordId = randomUUID();
      console.log("[RATINGS] Inserting rating record...");
      await client.query(
        `INSERT INTO ratings (id, thread_id, user_id, target_user_id, score, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          ratingRecordId,
          actualThreadId,
          userId,
          targetUserId,
          rating,
          review || null,
        ],
      );
      console.log("[RATINGS] ✓ Rating record inserted");

      // 5. Update transaction with ratingByUser (no system message - skips type check constraint)
      console.log("[RATINGS] Updating transaction...");
      const updatedTransaction = {
        ...transaction,
        ratingByUser,
      };

      await client.query(
        `UPDATE message_threads SET transaction = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(updatedTransaction), actualThreadId],
      );
      console.log("[RATINGS] ✓ Transaction updated");

      // 6. Auto-archive thread for the current user only (not both users)
      console.log("[RATINGS] Auto-archiving thread for current user...");
      const archivedBy = threadCheck.rows[0].archived_by || [];

      // Add current user to archived_by if not already there
      if (!archivedBy.includes(userId)) {
        archivedBy.push(userId);
      }

      await client.query(
        `UPDATE message_threads SET archived_by = $1, updated_at = NOW() WHERE id = $2`,
        [archivedBy, actualThreadId],
      );
      console.log(
        "[RATINGS] ✓ Thread archived for current user (other user can still see theirs)",
      );

      // 7. Fetch and return the complete updated thread
      console.log("[RATINGS] Fetching complete updated thread...");
      const completeThreadResult = await client.query(
        `SELECT id, listing_id, participants, status, transaction, archived_by, deleted_by
         FROM message_threads WHERE id = $1`,
        [actualThreadId],
      );

      const messagesResult = await client.query(
        `SELECT id, author_id, body, sent_at, type FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC`,
        [actualThreadId],
      );

      if (completeThreadResult.rows.length === 0) {
        console.log("[RATINGS] ❌ Failed to fetch updated thread");
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: "Failed to fetch updated thread" }),
        };
      }

      const threadRow = completeThreadResult.rows[0];
      const updatedThread = {
        id: threadRow.id,
        listingId: threadRow.listing_id,
        participants: threadRow.participants,
        status: threadRow.status,
        transaction: threadRow.transaction,
        archivedBy: threadRow.archived_by,
        deletedBy: threadRow.deleted_by,
        messages: messagesResult.rows.map((msg: any) => ({
          id: msg.id,
          authorId: msg.author_id,
          body: msg.body,
          sentAt: msg.sent_at,
          type: msg.type,
        })),
      };

      console.log("[RATINGS] ✓ Updated thread prepared");

      // 8. Create notification
      try {
        console.log("[RATINGS] Creating notification...");
        const userResult = await client.query(
          "SELECT username FROM users WHERE id = $1",
          [userId],
        );
        const userName = userResult.rows[0]?.username || "A user";

        await createNotification({
          userId: targetUserId,
          type: "rating_received",
          title: "New Rating",
          description: `${userName} left you a ${rating}-star rating`,
          actorId: userId,
          targetId: actualThreadId,
          targetType: "thread",
          data: { rating, ratingType: ratingType || "transaction" },
        });
        console.log("[RATINGS] ✓ Notification created");
      } catch (notifError) {
        console.error(
          "[RATINGS] ⚠️  Notification error (non-fatal):",
          notifError,
        );
      }

      console.log("[RATINGS] ✓ SUCCESS - Returning response");
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          ratingId,
          thread: updatedThread,
          message: "Rating submitted successfully",
        }),
      };
    } finally {
      if (client) {
        console.log("[RATINGS] Releasing database connection");
        client.release();
      }
    }
  } catch (error) {
    console.error("[RATINGS] ❌ FATAL ERROR:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Rating submission failed",
        details: errorMsg,
      }),
    };
  } finally {
    console.log("[RATINGS] ========== REQUEST END ==========\n");
  }
};
