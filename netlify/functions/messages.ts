import { Handler } from "@netlify/functions";
import { supabase } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/messages", "");

  // GET /api/messages/thread/:threadId
  if (method === "GET" && path.includes("/thread/")) {
    try {
      const threadId = path.split("/thread/")[1];

      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("sent_at", { ascending: true });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(messages),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/messages - send message
  if (method === "POST" && path === "") {
    try {
      const { threadId, authorId, body } = JSON.parse(event.body || "{}");

      if (!threadId || !authorId || !body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const messageId = randomUUID();

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          id: messageId,
          thread_id: threadId,
          author_id: authorId,
          body,
          sent_at: new Date().toISOString(),
          type: "text",
        })
        .select()
        .single();

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      // Update thread's updated_at timestamp
      await supabase
        .from("message_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);

      return {
        statusCode: 201,
        body: JSON.stringify(message),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // GET /api/messages/threads/:userId - get user's message threads
  if (method === "GET" && path.includes("/threads/")) {
    try {
      const userId = path.split("/threads/")[1];

      const { data: threads, error } = await supabase
        .from("message_threads")
        .select("*")
        .contains("participants", [userId])
        .order("updated_at", { ascending: false });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(threads),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/messages/thread - create message thread
  if (method === "POST" && path === "/thread") {
    try {
      const { listingId, participants } = JSON.parse(event.body || "{}");

      if (!listingId || !participants || !Array.isArray(participants)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const threadId = randomUUID();

      const { data: thread, error } = await supabase
        .from("message_threads")
        .insert({
          id: threadId,
          listing_id: listingId,
          participants,
          status: "active",
          archived_by: [],
          deleted_by: [],
        })
        .select()
        .single();

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 201,
        body: JSON.stringify(thread),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: "Not found" }),
  };
};
