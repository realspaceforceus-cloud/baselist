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
      const { listingId, recipientId, body, clientId } = JSON.parse(
        event.body || "{}",
      );

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

      // Fetch listing info if listing_id exists
      let listing = null;
      if (threadData.listing_id) {
        const listingResult = await client.query(
          "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
          [threadData.listing_id],
        );
        listing = listingResult.rows[0];
      }

      // Fetch partner info (the other participant)
      const partnerId = threadData.participants.find(
        (p: string) => p !== authorId,
      );
      let partner = null;
      if (partnerId) {
        const partnerResult = await client.query(
          "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
          [partnerId],
        );
        partner = partnerResult.rows[0];
      }

      // Fetch ALL messages in the thread (not just the new one)
      const allMessagesResult = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

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
        listing,
        partner,
        messages: allMessagesResult.rows.map((msg: any) => ({
          id: msg.id,
          threadId: msg.thread_id,
          authorId: msg.author_id,
          body: msg.body,
          sentAt: msg.sent_at,
          type: msg.type || "text",
          clientId: undefined, // Will be set by client on optimistic sends
        })),
      };

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            id: messageResult.rows[0].id,
            clientId,
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

  // POST /api/messages/threads/:threadId/offer - make an offer
  if (
    method === "POST" &&
    path.includes("/threads/") &&
    path.endsWith("/offer")
  ) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/offer")[0];
      const { amount, madeBy } = JSON.parse(event.body || "{}");
      const userId = await getUserIdFromAuth(event);

      if (!userId || !threadId || amount === undefined) {
        console.error("Offer validation failed:", {
          userId: !!userId,
          threadId: !!threadId,
          amount: amount !== undefined,
          amountValue: amount,
        });
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Missing required fields",
            details: {
              missingUserId: !userId,
              missingThreadId: !threadId,
              missingAmount: amount === undefined,
            },
          }),
        };
      }

      if (userId !== madeBy) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            error: "Cannot make offer on behalf of another user",
          }),
        };
      }

      // Verify thread exists and user is a participant
      const threadResult = await client.query(
        "SELECT participants, transaction FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const thread = threadResult.rows[0];
      if (!thread.participants.includes(userId)) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Not a participant in this thread" }),
        };
      }

      // Update transaction with new offer
      const transaction = thread.transaction || {};
      const now = new Date().toISOString();

      // If there's an existing offer, move it to counterOffer
      if (transaction.offer?.status === "pending") {
        transaction.counterOffer = { ...transaction.offer };
      }

      transaction.offer = {
        amount: Number(amount),
        madeBy: userId,
        madeAt: now,
        status: "pending",
      };

      await client.query(
        "UPDATE message_threads SET transaction = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(transaction), threadId],
      );

      // Create offer message with embedded status
      const messageId = randomUUID();
      const offerData = JSON.stringify({
        amount: Number(amount),
        status: "pending",
      });
      await client.query(
        `INSERT INTO messages (id, thread_id, author_id, body, sent_at, type)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [messageId, threadId, userId, offerData, "offer"],
      );

      // Fetch updated thread with all data
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadData = updatedThreadResult.rows[0];
      const listingResult = threadData.listing_id
        ? await client.query(
            "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
            [threadData.listing_id],
          )
        : { rows: [null] };

      const listing = listingResult.rows[0];
      const partnerId = threadData.participants.find(
        (p: string) => p !== userId,
      );
      const partnerResult = partnerId
        ? await client.query(
            "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
            [partnerId],
          )
        : { rows: [null] };

      const partner = partnerResult.rows[0];

      // Fetch all messages in the thread
      const messagesResult = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: {
            id: threadData.id,
            listingId: threadData.listing_id,
            participants: threadData.participants,
            status: threadData.status,
            archivedBy: threadData.archived_by,
            deletedBy: threadData.deleted_by,
            transaction: transaction,
            createdAt: threadData.created_at,
            updatedAt: threadData.updated_at,
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
          },
        }),
      };

      // Create notification for other party
      try {
        const partnerId = threadData.participants.find(
          (p: string) => p !== userId,
        );
        if (partnerId) {
          const offerAmount = Number(amount);
          const formatted = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: offerAmount % 1 === 0 ? 0 : 2,
          }).format(offerAmount);

          await createNotification({
            userId: partnerId,
            type: "offer_received",
            title: "New Offer Received",
            description: `${partner?.username || "Someone"} offered ${formatted} for ${listing?.title || "an item"}`,
            actorId: userId,
            targetId: threadId,
            targetType: "thread",
            data: {
              amount: offerAmount,
              listingTitle: listing?.title,
              bidderName: partner?.username,
              threadId,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
      }
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

  // POST /api/messages/threads/:threadId/accept-offer - accept an offer
  if (
    method === "POST" &&
    path.includes("/threads/") &&
    path.endsWith("/accept-offer")
  ) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/accept-offer")[0];
      const userId = await getUserIdFromAuth(event);

      if (!userId || !threadId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const threadResult = await client.query(
        "SELECT transaction FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const transaction = threadResult.rows[0].transaction || {};
      if (!transaction.offer) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No pending offer" }),
        };
      }

      transaction.offer.status = "accepted";

      // Find the pending offer message and update its status to accepted
      const offerMessageResult = await client.query(
        `SELECT id, body FROM messages WHERE thread_id = $1 AND type = 'offer'
         ORDER BY sent_at DESC LIMIT 1`,
        [threadId],
      );

      if (offerMessageResult.rows.length > 0) {
        const offerMessage = offerMessageResult.rows[0];
        try {
          const offerData = JSON.parse(offerMessage.body);
          offerData.status = "accepted";
          await client.query(`UPDATE messages SET body = $1 WHERE id = $2`, [
            JSON.stringify(offerData),
            offerMessage.id,
          ]);
        } catch (parseErr) {
          console.error("Failed to parse offer message body:", parseErr);
        }
      }

      await client.query(
        "UPDATE message_threads SET transaction = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(transaction), threadId],
      );

      // Fetch current user name for notification
      const currentUserResult = await client.query(
        "SELECT username FROM users WHERE id = $1",
        [userId],
      );
      const currentUserName = currentUserResult.rows[0]?.username || "User";

      // Create notification for offer acceptance
      const notificationData = {
        amount: transaction.offer?.amount,
        listingTitle: listing?.title || "Item",
        acceptorName: currentUserName,
        threadId: threadId,
      };

      await createNotification({
        userId: partnerId,
        type: "offer_accepted",
        title: "Offer Accepted",
        description: `${currentUserName} accepted your offer of $${transaction.offer?.amount}`,
        actorId: userId,
        targetId: threadId,
        targetType: "thread",
        data: notificationData,
      });

      // Fetch updated thread with all data
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadData = updatedThreadResult.rows[0];
      const listingResult = threadData.listing_id
        ? await client.query(
            "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
            [threadData.listing_id],
          )
        : { rows: [null] };

      const listing = listingResult.rows[0];
      const partnerId = threadData.participants.find(
        (p: string) => p !== userId,
      );
      const partnerResult = partnerId
        ? await client.query(
            "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
            [partnerId],
          )
        : { rows: [null] };

      const partner = partnerResult.rows[0];

      // Fetch all messages in the thread
      const messagesResult = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: {
            id: threadData.id,
            listingId: threadData.listing_id,
            participants: threadData.participants,
            status: threadData.status,
            archivedBy: threadData.archived_by,
            deletedBy: threadData.deleted_by,
            transaction: transaction,
            createdAt: threadData.created_at,
            updatedAt: threadData.updated_at,
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
          },
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

  // POST /api/messages/threads/:threadId/decline-offer - decline an offer
  if (
    method === "POST" &&
    path.includes("/threads/") &&
    path.endsWith("/decline-offer")
  ) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/decline-offer")[0];
      const userId = await getUserIdFromAuth(event);

      if (!userId || !threadId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const threadResult = await client.query(
        "SELECT transaction FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const transaction = threadResult.rows[0].transaction || {};
      if (!transaction.offer) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No pending offer" }),
        };
      }

      transaction.offer.status = "declined";

      // Find the pending offer message and update its status to declined
      const offerMessageResult = await client.query(
        `SELECT id, body FROM messages WHERE thread_id = $1 AND type = 'offer'
         ORDER BY sent_at DESC LIMIT 1`,
        [threadId],
      );

      if (offerMessageResult.rows.length > 0) {
        const offerMessage = offerMessageResult.rows[0];
        try {
          const offerData = JSON.parse(offerMessage.body);
          offerData.status = "declined";
          await client.query(`UPDATE messages SET body = $1 WHERE id = $2`, [
            JSON.stringify(offerData),
            offerMessage.id,
          ]);
        } catch (parseErr) {
          console.error("Failed to parse offer message body:", parseErr);
        }
      }

      await client.query(
        "UPDATE message_threads SET transaction = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(transaction), threadId],
      );

      // Notify the offer maker that offer was declined
      try {
        const offerMakerId = transaction.offer?.madeBy;
        if (offerMakerId && offerMakerId !== userId) {
          await createNotification({
            userId: offerMakerId,
            type: "offer_declined",
            title: "Offer Declined",
            description: `Your offer has been declined. Feel free to make another offer.`,
            actorId: userId,
            targetId: threadId,
            targetType: "thread",
            data: {
              amount: transaction.offer?.amount,
              threadId,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
      }

      // Fetch updated thread with all data
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadData = updatedThreadResult.rows[0];
      const listingResult = threadData.listing_id
        ? await client.query(
            "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
            [threadData.listing_id],
          )
        : { rows: [null] };

      const listing = listingResult.rows[0];
      const partnerId = threadData.participants.find(
        (p: string) => p !== userId,
      );
      const partnerResult = partnerId
        ? await client.query(
            "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
            [partnerId],
          )
        : { rows: [null] };

      const partner = partnerResult.rows[0];

      // Fetch all messages in the thread
      const messagesResult = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: {
            id: threadData.id,
            listingId: threadData.listing_id,
            participants: threadData.participants,
            status: threadData.status,
            archivedBy: threadData.archived_by,
            deletedBy: threadData.deleted_by,
            transaction: transaction,
            createdAt: threadData.created_at,
            updatedAt: threadData.updated_at,
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
          },
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

  // DELETE /api/messages/threads/:threadId/offer - retract an offer
  if (
    method === "DELETE" &&
    path.includes("/threads/") &&
    path.endsWith("/offer")
  ) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/offer")[0];
      const userId = await getUserIdFromAuth(event);

      if (!userId || !threadId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const threadResult = await client.query(
        "SELECT transaction FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const transaction = threadResult.rows[0].transaction || {};
      if (!transaction.offer) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No pending offer" }),
        };
      }

      if (transaction.offer.madeBy !== userId) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Can only retract your own offer" }),
        };
      }

      if (transaction.offer.status !== "pending") {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Can only retract pending offers" }),
        };
      }

      transaction.offer.status = "retracted";

      // Find the offer message and update its status
      const offerMessageResult = await client.query(
        `SELECT id, body FROM messages WHERE thread_id = $1 AND type = 'offer'
         ORDER BY sent_at DESC LIMIT 1`,
        [threadId],
      );

      if (offerMessageResult.rows.length > 0) {
        const offerMessage = offerMessageResult.rows[0];
        try {
          const offerData = JSON.parse(offerMessage.body);
          offerData.status = "retracted";
          await client.query(`UPDATE messages SET body = $1 WHERE id = $2`, [
            JSON.stringify(offerData),
            offerMessage.id,
          ]);
        } catch (parseErr) {
          console.error("Failed to parse offer message body:", parseErr);
        }
      }

      const threadDetailResult = await client.query(
        "SELECT participants FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadDetail = threadDetailResult.rows[0];
      const recipientId = threadDetail?.participants?.find(
        (p: string) => p !== userId,
      );

      await client.query(
        "UPDATE message_threads SET transaction = $1, updated_at = NOW() WHERE id = $2",
        [JSON.stringify(transaction), threadId],
      );

      // Notify the offer recipient that offer was retracted
      try {
        if (recipientId) {
          await createNotification({
            userId: recipientId,
            type: "offer_retracted",
            title: "Offer Retracted",
            description: `An offer has been retracted. You can make a counter offer if interested.`,
            actorId: userId,
            targetId: threadId,
            targetType: "thread",
            data: {
              amount: transaction.offer?.amount,
              threadId,
            },
          });
        }
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
      }

      // Fetch updated thread with all data
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      const threadData = updatedThreadResult.rows[0];
      const listingResult = threadData.listing_id
        ? await client.query(
            "SELECT id, title, status, image_urls FROM listings WHERE id = $1",
            [threadData.listing_id],
          )
        : { rows: [null] };

      const listing = listingResult.rows[0];
      const partnerResult = recipientId
        ? await client.query(
            "SELECT id, username, avatar_url, dow_verified_at FROM users WHERE id = $1",
            [recipientId],
          )
        : { rows: [null] };

      const partner = partnerResult.rows[0];

      // Fetch all messages in the thread
      const messagesResult = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: {
            id: threadData.id,
            listingId: threadData.listing_id,
            participants: threadData.participants,
            status: threadData.status,
            archivedBy: threadData.archived_by,
            deletedBy: threadData.deleted_by,
            transaction: transaction,
            createdAt: threadData.created_at,
            updatedAt: threadData.updated_at,
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
          },
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

  // POST /api/messages/threads/:threadId/dispute - raise a dispute
  if (
    method === "POST" &&
    path.includes("/threads/") &&
    path.endsWith("/dispute")
  ) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/dispute")[0];
      const { reason, baseId } = JSON.parse(event.body || "{}");
      const userId = await getUserIdFromAuth(event);

      if (!userId || !threadId) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Verify thread exists and user is a participant
      const threadResult = await client.query(
        "SELECT participants FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const thread = threadResult.rows[0];
      if (!thread.participants.includes(userId)) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Not a participant in this thread" }),
        };
      }

      // Create a report for the dispute
      const reportId = randomUUID();
      await client.query(
        `INSERT INTO reports (id, type, reporter_id, target_type, target_id, base_id, notes, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          reportId,
          "dispute",
          userId,
          "thread",
          threadId,
          baseId || "default",
          reason || "User initiated dispute",
          "open",
        ],
      );

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
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

  // POST /api/messages/threads/:threadId/transaction/mark-complete
  if (method === "POST" && path.includes("/transaction/mark-complete")) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/")[0];
      const authUserId = await getUserIdFromAuth(event);
      const body = JSON.parse(event.body || "{}");
      const userId = body.actorId || body.userId || authUserId;

      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const threadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const thread = threadResult.rows[0];

      // Parse transaction and participants from JSON if needed
      let tx =
        typeof thread.transaction === "string"
          ? JSON.parse(thread.transaction)
          : thread.transaction;

      tx = tx || {
        id: randomUUID(),
      };

      // Parse participants if it's a string
      const participants =
        typeof thread.participants === "string"
          ? JSON.parse(thread.participants)
          : thread.participants;

      if (!participants || !Array.isArray(participants) || participants.length < 2) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid thread participants" }),
        };
      }

      const isA = userId === participants[0];
      const isB = userId === participants[1];

      if (!isA && !isB) {
        return {
          statusCode: 403,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Not a participant" }),
        };
      }

      const now = new Date().toISOString();

      // Use the old UI contract: pending_confirmation + markedCompleteBy
      let newStatus = tx.status || "open";

      if (!tx.markedCompleteBy) {
        // First mark: move to pending_confirmation
        newStatus = "pending_confirmation";
      } else if (tx.markedCompleteBy !== userId) {
        // Second mark by the other party: complete transaction
        newStatus = "completed";
      } else {
        // Same user trying to mark twice
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Already marked. Awaiting confirmation from the other party." }),
        };
      }

      const updatedTx = {
        ...tx,
        status: newStatus,
        markedCompleteBy: tx.markedCompleteBy || userId,
        markedCompleteAt: tx.markedCompleteAt || now,
        completedAt: newStatus === "completed" ? now : tx.completedAt,
      };

      // Parse timeline from JSON if needed
      let timeline =
        typeof thread.timeline === "string"
          ? JSON.parse(thread.timeline)
          : thread.timeline || [];

      timeline.push({
        at: now,
        actorId: userId,
        action: "mark_complete",
      });

      if (newStatus === "completed") {
        timeline.push({
          at: now,
          actorId: userId,
          action: "transaction_completed",
        });

        if (thread.listing_id) {
          await client.query("UPDATE listings SET status = $1 WHERE id = $2", [
            "sold",
            thread.listing_id,
          ]);
        }

        // Update thread-level status to keep it in sync
        await client.query(
          "UPDATE message_threads SET status = $1 WHERE id = $2",
          ["completed", threadId],
        );
      }

      // Add system message to chat
      const systemMessageId = randomUUID();
      const systemMessage = {
        id: systemMessageId,
        thread_id: threadId,
        author_id: null,
        body:
          newStatus === "completed"
            ? "Transaction completed."
            : `${
                participants.find((p: string) => p === userId)
                  ? "You"
                  : "They"
              } marked complete.`,
        sent_at: now,
        type: "system",
      };

      await client.query(
        "INSERT INTO messages (id, thread_id, author_id, body, sent_at, type) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          systemMessageId,
          threadId,
          systemMessage.author_id,
          systemMessage.body,
          now,
          "system",
        ],
      );

      await client.query(
        "UPDATE message_threads SET transaction = $1, timeline = $2 WHERE id = $3",
        [JSON.stringify(updatedTx), JSON.stringify(timeline), threadId],
      );

      // Return the full updated thread so UI can update completely
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );
      const updatedThread = updatedThreadResult.rows[0];
      updatedThread.transaction = updatedTx;

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread: updatedThread }),
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

  // POST /api/messages/threads/:threadId/transaction/agree
  if (method === "POST" && path.includes("/transaction/agree")) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/")[0];
      const authUserId = await getUserIdFromAuth(event);
      const body = JSON.parse(event.body || "{}");
      const userId = body.actorId || body.userId || authUserId;

      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const threadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const thread = threadResult.rows[0];

      // Parse transaction from JSON if needed
      let tx =
        typeof thread.transaction === "string"
          ? JSON.parse(thread.transaction)
          : thread.transaction;

      tx = tx || { id: randomUUID() };

      // Use the old UI contract
      if (tx.status !== "pending_confirmation") {
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No completion pending" }),
        };
      }

      const now = new Date().toISOString();
      const updatedTx = {
        ...tx,
        status: "completed",
        completedAt: now,
      };

      // Parse timeline from JSON if needed
      let timeline =
        typeof thread.timeline === "string"
          ? JSON.parse(thread.timeline)
          : thread.timeline || [];
      timeline.push({
        at: now,
        actorId: userId,
        action: "agree_complete",
      });
      timeline.push({
        at: now,
        actorId: userId,
        action: "transaction_completed",
      });

      if (thread.listing_id) {
        await client.query("UPDATE listings SET status = $1 WHERE id = $2", [
          "sold",
          thread.listing_id,
        ]);
      }

      // Update thread-level status to keep it in sync
      await client.query(
        "UPDATE message_threads SET status = $1 WHERE id = $2",
        ["completed", threadId],
      );

      // Add system message to chat
      const systemMessageId = randomUUID();
      await client.query(
        "INSERT INTO messages (id, thread_id, author_id, body, sent_at, type) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          systemMessageId,
          threadId,
          null,
          "Transaction completed.",
          now,
          "system",
        ],
      );

      await client.query(
        "UPDATE message_threads SET transaction = $1, timeline = $2 WHERE id = $3",
        [JSON.stringify(updatedTx), JSON.stringify(timeline), threadId],
      );

      // Return the full updated thread so UI can update completely
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );
      const updatedThread = updatedThreadResult.rows[0];
      updatedThread.transaction = updatedTx;

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread: updatedThread }),
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

  // POST /api/messages/threads/:threadId/transaction/disagree
  if (method === "POST" && path.includes("/transaction/disagree")) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/threads/")[1].split("/")[0];
      const authUserId = await getUserIdFromAuth(event);
      const body = JSON.parse(event.body || "{}");
      const userId = body.actorId || body.userId || authUserId;

      if (!userId) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const threadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );

      if (threadResult.rows.length === 0) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Thread not found" }),
        };
      }

      const thread = threadResult.rows[0];

      // Parse transaction from JSON if needed
      let tx =
        typeof thread.transaction === "string"
          ? JSON.parse(thread.transaction)
          : thread.transaction;

      tx = tx || { id: randomUUID() };

      // Use old UI contract - check for pending_confirmation
      if (tx.status !== "pending_confirmation") {
        return {
          statusCode: 409,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "No completion pending" }),
        };
      }

      const now = new Date().toISOString();
      const updatedTx = {
        ...tx,
        status: "disputed",
        dispute: {
          byUserId: userId,
          reason: body.reason || "No reason provided",
          openedAt: now,
          resolvedAt: null,
        },
      };

      // Parse timeline from JSON if needed
      let timeline =
        typeof thread.timeline === "string"
          ? JSON.parse(thread.timeline)
          : thread.timeline || [];
      timeline.push({
        at: now,
        actorId: userId,
        action: "disagree_complete",
        data: { reason: body.reason },
      });
      timeline.push({
        at: now,
        actorId: userId,
        action: "dispute_opened",
      });

      await client.query(
        "UPDATE message_threads SET transaction = $1, timeline = $2 WHERE id = $3",
        [JSON.stringify(updatedTx), JSON.stringify(timeline), threadId],
      );

      // Return the full updated thread so UI can update completely
      const updatedThreadResult = await client.query(
        "SELECT * FROM message_threads WHERE id = $1",
        [threadId],
      );
      const updatedThread = updatedThreadResult.rows[0];
      updatedThread.transaction = updatedTx;

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread: updatedThread }),
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

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
