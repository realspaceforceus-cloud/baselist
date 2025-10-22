import { Handler } from "@netlify/functions";
import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { createNotification, getActorName } from "./notification-helpers";
import { getUserIdFromAuth } from "./auth";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/messages", "");

  // GET /api/messages/threads/:threadId - get messages in a thread
  if (method === "GET" && path.includes("/threads/")) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1];
      const userId = await getUserIdFromAuth(event);

      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      // Verify user is participant in thread
      const threadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1 AND $2 = ANY(participants)",
        [threadId, userId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      // Parse pagination params
      const url = new URL(event.rawUrl || `http://localhost${event.path}`);
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50"),
        100,
      );
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // Get total count
      const countResult = await client.query(
        "SELECT COUNT(*) as count FROM messages WHERE thread_id = $1",
        [threadId],
      );
      const total = parseInt(countResult.rows[0]?.count || "0");

      // Get messages with pagination
      const result = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC LIMIT $2 OFFSET $3",
        [threadId, limit, offset],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: result.rows,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/messages - send message (creates thread if needed)
  if (method === "POST" && path === "") {
    const client = await pool.connect();
    try {
      const { listingId, recipientId, body } = JSON.parse(event.body || "{}");

      // Get userId from auth
      const authorId = await getUserIdFromAuth(event);

      if (!authorId || !recipientId || !body) {
        return {
          statusCode: !authorId ? 401 : 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: !authorId ? "Unauthorized" : "Missing required fields",
          }),
        };
      }

      // If listing specified, check if it's sold or removed
      if (listingId) {
        const listingStatusResult = await client.query(
          "SELECT status FROM listings WHERE id = $1",
          [listingId],
        );

        if (listingStatusResult.rows.length === 0) {
          // Listing doesn't exist
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error:
                "This listing no longer exists. You cannot send new messages about it.",
            }),
          };
        }

        const listingStatus = listingStatusResult.rows[0].status;
        if (listingStatus === "sold") {
          return {
            statusCode: 400,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              error:
                "This listing has been sold. You cannot send new messages about it.",
            }),
          };
        }
      }

      // Check if thread already exists (listingId is optional for direct messages)
      let threadCheckResult;
      if (listingId) {
        threadCheckResult = await client.query(
          `SELECT id FROM message_threads
           WHERE listing_id = $1 AND $2 = ANY(participants) AND $3 = ANY(participants)
           ORDER BY status DESC
           LIMIT 1`,
          [listingId, authorId, recipientId],
        );
      } else {
        // Direct message - find thread without specific listing
        threadCheckResult = await client.query(
          `SELECT id FROM message_threads
           WHERE listing_id IS NULL AND $1 = ANY(participants) AND $2 = ANY(participants)
           ORDER BY status DESC
           LIMIT 1`,
          [authorId, recipientId],
        );
      }

      let threadId: string;

      if (threadCheckResult.rows.length > 0) {
        // Use existing thread (can reopen archived threads)
        threadId = threadCheckResult.rows[0].id;
        // If thread was archived by this user, unarchive it
        await client.query(
          "UPDATE message_threads SET archived_by = array_remove(archived_by, $1), status = 'active' WHERE id = $2",
          [authorId, threadId],
        );
      } else {
        // Create new thread
        threadId = randomUUID();
        await client.query(
          `INSERT INTO message_threads (id, listing_id, participants, status, archived_by, deleted_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            threadId,
            listingId || null,
            [authorId, recipientId],
            "active",
            [],
            [],
          ],
        );
      }

      // Insert message
      const messageId = randomUUID();
      const messageResult = await client.query(
        `INSERT INTO messages (id, thread_id, author_id, body, sent_at, type)
         VALUES ($1, $2, $3, $4, NOW(), $5)
         RETURNING *`,
        [messageId, threadId, authorId, body, "text"],
      );

      // Update thread's updated_at timestamp
      await client.query(
        "UPDATE message_threads SET updated_at = NOW() WHERE id = $1",
        [threadId],
      );

      // Get listing title for notification (if listing exists)
      let listingTitle = "an item";
      if (listingId) {
        const listingResult = await client.query(
          "SELECT title FROM listings WHERE id = $1",
          [listingId],
        );
        listingTitle = listingResult.rows[0]?.title || "an item";
      }

      // Get sender name for notification
      const senderResult = await client.query(
        "SELECT username FROM users WHERE id = $1",
        [authorId],
      );
      const senderName = senderResult.rows[0]?.username || "Someone";

      // Create notification for recipient
      try {
        await createNotification({
          userId: recipientId,
          type: "message",
          title: `New message from ${senderName}`,
          description: `${senderName} sent you a message about "${listingTitle}"`,
          actorId: authorId,
          targetId: threadId,
          targetType: "thread",
          data: {
            listingId,
            messagePreview: body.substring(0, 100),
          },
        });
      } catch (notificationErr) {
        console.error("Error creating notification:", notificationErr);
        // Don't fail the entire request if notification creation fails
      }

      // Fetch the full thread
      const threadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadData = threadResult.rows[0];
      const transformedThread = {
        id: threadData.id,
        listingId: threadData.listing_id,
        participants: threadData.participants,
        status: threadData.status,
        archivedBy: threadData.archived_by,
        deletedBy: threadData.deleted_by,
        transaction: threadData.transaction,
        createdAt: threadData.created_at,
        updatedAt: threadData.updated_at,
      };

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            id: messageResult.rows[0].id,
            threadId: messageResult.rows[0].thread_id,
            authorId: messageResult.rows[0].author_id,
            body: messageResult.rows[0].body,
            sentAt: messageResult.rows[0].sent_at,
            type: messageResult.rows[0].type || "text",
          },
          thread: transformedThread,
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // GET /api/messages/threads - get user's message threads
  if (method === "GET" && path === "") {
    const client = await pool.connect();
    try {
      const userId = await getUserIdFromAuth(event);
      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      // Parse pagination params
      const url = new URL(event.rawUrl || `http://localhost${event.path}`);
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "50"),
        100,
      );
      const offset = parseInt(url.searchParams.get("offset") || "0");

      // Get total count
      const countResult = await client.query(
        "SELECT COUNT(*) as count FROM message_threads WHERE $1 = ANY(participants)",
        [userId],
      );
      const total = parseInt(countResult.rows[0]?.count || "0");

      // Get threads with pagination
      const result = await client.query(
        "SELECT * FROM message_threads WHERE $1 = ANY(participants) ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
        [userId, limit, offset],
      );

      // Fetch messages, listing, and partner info for each thread
      const threads = await Promise.all(
        result.rows.map(async (thread) => {
          try {
            const messagesResult = await client.query(
              "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC LIMIT 100",
              [thread.id],
            );

            // Fetch listing info if listing_id exists
            let listing = null;
            if (thread.listing_id) {
              const listingResult = await client.query(
                "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
                [thread.listing_id],
              );
              listing = listingResult.rows[0];
            }

            // Fetch partner info (the other participant)
            const partnerId = thread.participants.find(
              (p: string) => p !== userId,
            );
            let partner = null;
            if (partnerId) {
              const partnerResult = await client.query(
                "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
                [partnerId],
              );
              partner = partnerResult.rows[0];
            }

            return {
              id: thread.id,
              listingId: thread.listing_id,
              participants: thread.participants,
              status: thread.status,
              archivedBy: thread.archived_by,
              deletedBy: thread.deleted_by,
              transaction: thread.transaction,
              createdAt: thread.created_at,
              updatedAt: thread.updated_at,
              listing,
              partner,
              messages: messagesResult.rows.map((msg: any) => ({
                id: msg.id,
                threadId: msg.thread_id,
                authorId: msg.author_id,
                body: msg.body,
                sentAt: msg.sent_at,
                type: msg.type || "text",
              })),
            };
          } catch (e) {
            console.error(
              `Failed to fetch messages for thread ${thread.id}:`,
              e,
            );
            return {
              id: thread.id,
              listingId: thread.listing_id,
              participants: thread.participants,
              status: thread.status,
              archivedBy: thread.archived_by,
              deletedBy: thread.deleted_by,
              transaction: thread.transaction,
              createdAt: thread.created_at,
              updatedAt: thread.updated_at,
              listing: null,
              partner: null,
              messages: [],
            };
          }
        }),
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threads,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/messages/thread - create message thread
  if (method === "POST" && path === "/thread") {
    const client = await pool.connect();
    try {
      const { listingId, participants } = JSON.parse(event.body || "{}");

      if (!listingId || !participants || !Array.isArray(participants)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const threadId = randomUUID();

      const result = await client.query(
        `INSERT INTO message_threads (id, listing_id, participants, status, archived_by, deleted_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [threadId, listingId, participants, "active", "[]", "[]"],
      );

      const threadData = result.rows[0];
      const transformedThread = {
        id: threadData.id,
        listingId: threadData.listing_id,
        participants: threadData.participants,
        status: threadData.status,
        archivedBy: threadData.archived_by,
        deletedBy: threadData.deleted_by,
        transaction: threadData.transaction,
        createdAt: threadData.created_at,
        updatedAt: threadData.updated_at,
      };

      return {
        statusCode: 201,
        body: JSON.stringify(transformedThread),
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
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
