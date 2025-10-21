import { Handler } from "@netlify/functions";
import { createNotification } from "./notification-helpers";

interface TriggerNotificationPayload {
  type:
    | "offer_received"
    | "offer_accepted"
    | "offer_declined"
    | "transaction_complete";
  recipientId: string;
  actorId?: string;
  actorName?: string;
  itemTitle?: string;
  threadId?: string;
  data?: Record<string, any>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload: TriggerNotificationPayload = JSON.parse(
      event.body || "{}",
    );

    const {
      type,
      recipientId,
      actorId,
      actorName = "Someone",
      itemTitle = "an item",
      threadId,
      data = {},
    } = payload;

    if (!type || !recipientId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: type, recipientId",
        }),
      };
    }

    let title = "";
    let description = "";

    switch (type) {
      case "offer_received":
        title = `${actorName} made an offer`;
        description = `${actorName} made an offer on "${itemTitle}"`;
        break;
      case "offer_accepted":
        title = "Your offer was accepted!";
        description = `Your offer on "${itemTitle}" has been accepted`;
        break;
      case "offer_declined":
        title = "Your offer was declined";
        description = `Your offer on "${itemTitle}" has been declined`;
        break;
      case "transaction_complete":
        title = "Transaction completed!";
        description = `Your transaction for "${itemTitle}" has been completed. Please leave a rating.`;
        break;
    }

    await createNotification({
      userId: recipientId,
      type,
      title,
      description,
      actorId,
      targetId: threadId,
      targetType: "thread",
      data: {
        itemTitle,
        ...data,
      },
    });

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Error triggering notification:", errorMsg);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
