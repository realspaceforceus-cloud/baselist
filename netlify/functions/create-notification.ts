import { Handler } from "@netlify/functions";
import { createNotification } from "./notification-helpers";

interface CreateNotificationPayload {
  userId: string;
  type:
    | "message"
    | "item_sold"
    | "item_favorited"
    | "listing_removed"
    | "verification_needed"
    | "offer_received"
    | "offer_accepted"
    | "offer_declined"
    | "transaction_complete";
  title: string;
  description: string;
  actorId?: string;
  targetId?: string;
  targetType?: "listing" | "thread" | "user";
  data?: Record<string, any>;
}

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload: CreateNotificationPayload = JSON.parse(event.body || "{}");

    if (
      !payload.userId ||
      !payload.type ||
      !payload.title ||
      !payload.description
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: userId, type, title, description",
        }),
      };
    }

    await createNotification({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      description: payload.description,
      actorId: payload.actorId,
      targetId: payload.targetId,
      targetType: payload.targetType,
      data: payload.data,
    });

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Error creating notification:", errorMsg);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
