import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { createNotification } from "./notification-helpers";

/**
 * DEVELOPMENT ONLY: Seed endpoint for testing notifications
 * Endpoint: POST /api/seed-notifications
 * Body: { userId: string }
 * Creates sample notifications for testing all notification types
 */
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
    const { userId } = JSON.parse(event.body || "{}");

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "userId is required" }),
      };
    }

    const client = await pool.connect();
    let createdCount = 0;

    try {
      // Get some sample data
      const usersResult = await client.query(
        "SELECT id, username FROM users WHERE id != $1 LIMIT 5",
        [userId],
      );
      const users = usersResult.rows;

      const listingsResult = await client.query(
        "SELECT id, title FROM listings LIMIT 5",
      );
      const listings = listingsResult.rows;

      // Create message notifications
      if (users.length > 0) {
        await createNotification({
          userId,
          type: "message",
          title: `New message from ${users[0].username}`,
          description: `${users[0].username} sent you a message about "${listings[0]?.title || "an item"}"`,
          actorId: users[0].id,
          targetId: randomUUID(),
          targetType: "thread",
          data: {
            listingId: listings[0]?.id,
            messagePreview: "Are you still selling this?",
          },
        });
        createdCount++;
      }

      // Create item_favorited notification
      if (users.length > 1 && listings.length > 0) {
        await createNotification({
          userId,
          type: "item_favorited",
          title: `${users[1].username} favorited "${listings[0].title}"`,
          description: `Someone is interested in your listing. Reach out to them!`,
          actorId: users[1].id,
          targetId: listings[0].id,
          targetType: "listing",
          data: {
            listingTitle: listings[0].title,
            buyerName: users[1].username,
          },
        });
        createdCount++;
      }

      // Create listing_removed notification
      if (listings.length > 1) {
        await createNotification({
          userId,
          type: "listing_removed",
          title: `Your listing was removed`,
          description: `Your listing "${listings[1].title}" has been removed. Reason: Violates community guidelines`,
          targetId: listings[1].id,
          targetType: "listing",
          data: {
            listingTitle: listings[1].title,
            reason: "Violates community guidelines",
          },
        });
        createdCount++;
      }

      // Create offer_received notification
      if (users.length > 2 && listings.length > 2) {
        await createNotification({
          userId,
          type: "offer_received",
          title: `${users[2].username} made an offer`,
          description: `${users[2].username} made an offer of $150 on "${listings[2].title}"`,
          actorId: users[2].id,
          targetId: randomUUID(),
          targetType: "thread",
          data: {
            listingId: listings[2].id,
            offerAmount: 150,
          },
        });
        createdCount++;
      }

      // Create offer_accepted notification
      if (users.length > 3) {
        await createNotification({
          userId,
          type: "offer_accepted",
          title: `Your offer was accepted!`,
          description: `${users[3].username} accepted your offer of $200 on an item`,
          actorId: users[3].id,
          targetId: randomUUID(),
          targetType: "thread",
          data: {
            offerAmount: 200,
          },
        });
        createdCount++;
      }

      // Create offer_declined notification
      if (users.length > 4) {
        await createNotification({
          userId,
          type: "offer_declined",
          title: `Your offer was declined`,
          description: `${users[4].username} declined your offer of $100`,
          actorId: users[4].id,
          targetId: randomUUID(),
          targetType: "thread",
          data: {
            offerAmount: 100,
          },
        });
        createdCount++;
      }

      // Create transaction_complete notification
      await createNotification({
        userId,
        type: "transaction_complete",
        title: `Transaction completed!`,
        description: `Your transaction for an item has been completed. Please leave a rating for ${users[0]?.username || "the seller"}.`,
        actorId: users[0]?.id,
        targetId: randomUUID(),
        targetType: "thread",
        data: {
          listingTitle: listings[0]?.title || "an item",
          canRate: true,
        },
      });
      createdCount++;

      // Create verification_needed notification
      await createNotification({
        userId,
        type: "verification_needed",
        title: `Account verification needed`,
        description: `Complete your DoD verification to continue selling items`,
        targetType: "user",
        data: {
          verificationType: ".mil email",
        },
      });
      createdCount++;

      // Create item_sold notification
      if (listings.length > 0) {
        await createNotification({
          userId,
          type: "item_sold",
          title: `Your item sold!`,
          description: `Your "${listings[0].title}" has been marked as sold. Great job!`,
          targetId: listings[0].id,
          targetType: "listing",
          data: {
            listingTitle: listings[0].title,
            soldFor: "$250",
          },
        });
        createdCount++;
      }
    } finally {
      client.release();
    }

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: `Created ${createdCount} test notifications`,
        count: createdCount,
      }),
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Error seeding notifications:", errorMsg);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMsg }),
    };
  }
};
