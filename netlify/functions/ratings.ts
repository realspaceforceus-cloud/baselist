import { randomUUID } from "crypto";
import { pool } from "./db";
import { getUserIdFromAuth } from "./auth";
import { createNotification } from "./create-notification";

export const handler = async (event: any) => {
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
          error: "Missing required fields",
          required: ["targetUserId", "rating", "transactionId"],
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

      // 1. Insert rating into ratings table
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
        // Fallback for missing columns
        await client.query(
          `INSERT INTO ratings (id, transaction_id, user_id, score, comment, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [ratingId, transactionId, userId, rating, review || null, now],
        );
      }

      // 2. Update the thread's transaction to record the rating
      const threadResult = await client.query(
        `SELECT transaction FROM message_threads WHERE id = $1`,
        [transactionId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const transaction = threadResult.rows[0].transaction || {};
      const ratingByUser = transaction.ratingByUser || {};
      ratingByUser[userId] = rating;

      // 3. Add system message with rating
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

      // 4. Update transaction with ratingByUser
      const updatedTransaction = {
        ...transaction,
        ratingByUser,
      };

      await client.query(
        `UPDATE message_threads SET transaction = $1 WHERE id = $2`,
        [JSON.stringify(updatedTransaction), transactionId],
      );

      // 5. Fetch and return the complete updated thread
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

      // 6. Create notification
      try {
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
      } catch (notifError) {
        console.error("Notification error (non-fatal):", notifError);
      }

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
        client.release();
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Rating submission failed",
        details: errorMsg,
      }),
    };
  }
};
