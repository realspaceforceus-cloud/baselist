import { pool } from "./db";
import { randomUUID } from "crypto";

export interface CreateNotificationOptions {
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
    | "transaction_complete"
    | "post_commented"
    | "comment_liked";
  title: string;
  description: string;
  actorId?: string;
  targetId?: string;
  targetType?: "listing" | "thread" | "user" | "post";
  data?: Record<string, any>;
}

export async function createNotification(
  options: CreateNotificationOptions,
): Promise<void> {
  const client = await pool.connect();
  try {
    const {
      userId,
      type,
      title,
      description,
      actorId,
      targetId,
      targetType,
      data = {},
    } = options;

    console.log("[NOTIFICATION_HELPER] Creating notification", {
      userId,
      type,
      title,
      actorId,
      targetId,
      targetType,
    });

    const notificationId = randomUUID();
    await client.query(
      `INSERT INTO notifications
       (id, user_id, type, title, description, actor_id, target_id, target_type, data, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        notificationId,
        userId,
        type,
        title,
        description,
        actorId || null,
        targetId || null,
        targetType || null,
        JSON.stringify(data),
      ],
    );

    console.log("[NOTIFICATION_HELPER] Notification created successfully", {
      notificationId,
    });
  } catch (err) {
    console.error("[NOTIFICATION_HELPER] Error creating notification:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getActorName(userId: string): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT username FROM users WHERE id = $1`,
      [userId],
    );
    return result.rows[0]?.username || "Someone";
  } catch (err) {
    console.error("Error getting actor name:", err);
    return "Someone";
  } finally {
    client.release();
  }
}

export async function getListingTitle(listingId: string): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT title FROM listings WHERE id = $1`,
      [listingId],
    );
    return result.rows[0]?.title || "Item";
  } catch (err) {
    console.error("Error getting listing title:", err);
    return "Item";
  } finally {
    client.release();
  }
}
