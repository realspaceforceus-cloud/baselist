import { Handler } from "@netlify/functions";
import { randomUUID } from "crypto";
import { pool } from "./db";
import { getUserIdFromAuth } from "./auth";
import { createNotification } from "./notification-helpers";

export const handler: Handler = async (event, context) => {
  console.log("[RATINGS] ========== REQUEST START ==========");
  console.log("[RATINGS] Method:", event.httpMethod);
  console.log("[RATINGS] Path:", event.path);
  console.log("[RATINGS] URL:", event.rawUrl);

  // Only allow POST
  if (event.httpMethod !== "POST") {
    console.log("[RATINGS] ❌ Method not allowed:", event.httpMethod);
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Method not allowed",
        received: event.httpMethod,
        expected: "POST"
      }),
    };
  }

  try {
    console.log("[RATINGS] ✓ POST method confirmed");
    
    // Get authenticated user
    console.log("[RATINGS] Extracting userId from auth...");
    const userId = await getUserIdFromAuth(event);
    console.log("[RATINGS] userId extracted:", userId ? "✓" : "✗ NULL");

    if (!userId) {
      console.log("[RATINGS] ❌ No userId found");
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    console.log("[RATINGS] ✓ User authenticated:", userId);

    // Parse request body
    console.log("[RATINGS] Parsing request body...");
    console.log("[RATINGS] Body content:", event.body?.substring(0, 200));
    
    const body = JSON.parse(event.body || "{}");
    const { targetUserId, rating, review, transactionId, ratingType } = body;

    console.log("[RATINGS] Parsed data:", {
      targetUserId,
      rating,
      transactionId,
      hasReview: !!review,
      ratingType,
    });

    // Validation
    if (!targetUserId || !rating || !transactionId) {
      console.log("[RATINGS] ❌ Missing required fields");
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields",
          received: { targetUserId, rating, transactionId },
        }),
      };
    }

    if (rating < 1 || rating > 5) {
      console.log("[RATINGS] ❌ Rating out of range:", rating);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
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

      // 1. Insert rating into ratings table
      console.log("[RATINGS] Inserting rating record...");
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
        console.log("[RATINGS] ✓ Rating inserted");
      } catch (columnError: any) {
        console.log("[RATINGS] ⚠️  Column error, trying without target_user_id/rating_type");
        await client.query(
          `INSERT INTO ratings (id, transaction_id, user_id, score, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [ratingId, transactionId, userId, rating, review || null, now],
        );
        console.log("[RATINGS] ✓ Rating inserted (fallback)");
      }

      // 2. Update the thread's transaction to record the rating
      console.log("[RATINGS] Fetching thread transaction...");
      const threadResult = await client.query(
        `SELECT transaction FROM message_threads WHERE id = $1`,
        [transactionId],
      );

      if (threadResult.rows.length === 0) {
        console.log("[RATINGS] ❌ Thread not found");
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      console.log("[RATINGS] ✓ Thread found");

      const transaction = threadResult.rows[0].transaction || {};
      const ratingByUser = transaction.ratingByUser || {};
      ratingByUser[userId] = rating;

      console.log("[RATINGS] Updated ratingByUser:", ratingByUser);

      // 3. Add system message with rating
      console.log("[RATINGS] Adding system message...");
      const messageId = randomUUID();
      await client.query(
        `INSERT INTO messages (id, thread_id, author_id, body, sent_at, type)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [
          messageId,
          transactionId,
          userId,
          JSON.stringify({ rating, review, ratingByUser: userId }),
          "system",
        ],
      );
      console.log("[RATINGS] ✓ System message added");

      // 4. Update transaction with ratingByUser
      console.log("[RATINGS] Updating transaction...");
      const updatedTransaction = {
        ...transaction,
        ratingByUser,
      };

      await client.query(
        `UPDATE message_threads SET transaction = $1 WHERE id = $2`,
        [JSON.stringify(updatedTransaction), transactionId],
      );
      console.log("[RATINGS] ✓ Transaction updated");

      // 5. Fetch and return the complete updated thread
      console.log("[RATINGS] Fetching complete updated thread...");
      const completeThreadResult = await client.query(
        `SELECT id, listing_id, participants, status, transaction, archived_by, deleted_by
         FROM message_threads WHERE id = $1`,
        [transactionId],
      );

      const messagesResult = await client.query(
        `SELECT id, author_id, body, sent_at, type FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC`,
        [transactionId],
      );

      if (completeThreadResult.rows.length === 0) {
        console.log("[RATINGS] ❌ Failed to fetch updated thread");
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
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

      // 6. Create notification
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
          targetId: transactionId,
          targetType: "thread",
          data: { rating, ratingType },
        });
        console.log("[RATINGS] ✓ Notification created");
      } catch (notifError) {
        console.error("[RATINGS] ⚠️  Notification error (non-fatal):", notifError);
      }

      console.log("[RATINGS] ✓ SUCCESS - Returning response");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
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
    const errorStack = error instanceof Error ? error.stack : "";

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Rating submission failed",
        details: errorMsg,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
      }),
    };
  } finally {
    console.log("[RATINGS] ========== REQUEST END ==========\n");
  }
};
