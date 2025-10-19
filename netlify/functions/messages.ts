import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/messages", "");

  // GET /api/messages/thread/:threadId
  if (method === "GET" && path.includes("/thread/")) {
    const client = await pool.connect();
    try {
      const threadId = path.split("/thread/")[1];

      const result = await client.query(
        "SELECT * FROM messages WHERE thread_id = $1 ORDER BY sent_at ASC",
        [threadId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
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

  // POST /api/messages - send message
  if (method === "POST" && path === "") {
    const client = await pool.connect();
    try {
      const { threadId, authorId, body } = JSON.parse(event.body || "{}");

      if (!threadId || !authorId || !body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const messageId = randomUUID();

      const result = await client.query(
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

      return {
        statusCode: 201,
        body: JSON.stringify(result.rows[0]),
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

  // GET /api/messages/threads/:userId - get user's message threads
  if (method === "GET" && path.includes("/threads/")) {
    const client = await pool.connect();
    try {
      const userId = path.split("/threads/")[1];

      const result = await client.query(
        "SELECT * FROM message_threads WHERE $1 = ANY(participants) ORDER BY updated_at DESC",
        [userId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify(result.rows),
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

      return {
        statusCode: 201,
        body: JSON.stringify(result.rows[0]),
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
