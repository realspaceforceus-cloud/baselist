import { Handler } from "@netlify/functions";
import { Client } from "pg";

export const handler: Handler = async (event) => {
  // Create a NEW client for each request to avoid connection reuse issues
  const db = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL,
  });

  try {
    const timestamp = new Date().toISOString();
    console.log(`\n=== STORE API REQUEST ${timestamp} ===`);
    console.log("Method:", event.httpMethod);
    console.log("Path:", event.path);
    console.log("Query params:", event.queryStringParameters);
    console.log("Headers:", Object.keys(event.headers || {}));
    console.log("Body:", event.body ? event.body.substring(0, 200) : "none");

    console.log("[DB] Connecting to database...");
    await db.connect();
    console.log("[DB] Connected successfully");

    const method = event.httpMethod;
    const path = event.path.split("/").slice(-1)[0];
    console.log(`[ROUTE] Method=${method}, Path=${path}`);

    // GET /api/store?slug=xyz - Get store by slug (public)
    if (method === "GET" && event.queryStringParameters?.slug) {
      const slug = event.queryStringParameters.slug;

      const storeResult = await db.query(
        `SELECT * FROM users 
         WHERE store_slug = $1 AND store_enabled = true`,
        [slug],
      );

      if (storeResult.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Store not found" }),
        };
      }

      const user = storeResult.rows[0];

      // Fetch store items
      const itemsResult = await db.query(
        `SELECT id, user_id, name, description, price, image_urls, created_at, updated_at
         FROM store_items 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          store: {
            userId: user.id,
            name: user.store_name,
            slug: user.store_slug,
            enabled: user.store_enabled,
            backgroundColor: user.store_background_color,
            textColor: user.store_text_color,
            logoUrl: user.store_logo_url,
          },
          owner: {
            id: user.id,
            name: user.username,
            username: user.username,
            avatarUrl: user.avatar_url,
            rating: user.rating,
            ratingCount: user.rating_count,
            completedSales: user.completed_sales,
            memberSince: user.created_at,
          },
          items: itemsResult.rows.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            imageUrls: row.image_urls || [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        }),
      };
    }

    // GET /api/store/items - Get current user's store items
    if (method === "GET" && path === "items" && event.headers.cookie) {
      const userIdMatch = event.headers.cookie.match(/userId=([^;]+)/);
      if (!userIdMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const userId = userIdMatch[1];

      const itemsResult = await db.query(
        `SELECT id, user_id, name, description, price, quantity, image_urls, created_at, updated_at
         FROM store_items
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId],
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          items: itemsResult.rows.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description,
            price: parseFloat(row.price),
            quantity: parseInt(row.quantity) || 1,
            imageUrls: row.image_urls || [],
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })),
        }),
      };
    }

    // POST /api/store - Create or update store
    if (method === "POST") {
      console.log("[POST /store] Starting...");
      console.log(
        "[AUTH] Cookie header:",
        event.headers.cookie?.substring(0, 50),
      );

      const userIdMatch = event.headers.cookie?.match(/userId=([^;]+)/);
      console.log(
        "[AUTH] UserId match result:",
        userIdMatch ? "FOUND" : "NOT FOUND",
      );

      if (!userIdMatch) {
        console.log("[AUTH] FAIL: No userId in cookie");
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized - no userId in cookie" }),
        };
      }

      const userId = userIdMatch[1];
      console.log("[AUTH] UserId:", userId);

      let parsedBody;
      try {
        parsedBody = JSON.parse(event.body || "{}");
        console.log("[PARSE] Body parsed successfully:", {
          name: parsedBody.name,
          slug: parsedBody.slug,
        });
      } catch (parseError) {
        console.log("[PARSE] ERROR:", parseError);
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Invalid JSON body",
            parseError: String(parseError),
          }),
        };
      }

      const { name, slug, enabled, backgroundColor, textColor, logoUrl } =
        parsedBody;
      console.log("[DATA] Extracted fields:", { name, slug, enabled });

      // Generate slug from name if not provided
      const finalSlug =
        slug ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      console.log("[SLUG] Final slug:", finalSlug);

      console.log("[DB] Executing UPDATE query for userId:", userId);
      console.log("[SQL] UPDATE users SET store_name=$1, store_slug=$2, ...");

      try {
        const result = await db.query(
          `UPDATE users
           SET store_name = $1, store_slug = $2, store_enabled = $3,
               store_background_color = $4, store_text_color = $5, store_logo_url = $6,
               updated_at = NOW()
           WHERE id = $7
           RETURNING id, store_name, store_slug, store_enabled, store_background_color, store_text_color, store_logo_url`,
          [
            name,
            finalSlug,
            enabled,
            backgroundColor,
            textColor,
            logoUrl,
            userId,
          ],
        );

        console.log("[DB] Query executed. Rows returned:", result.rows.length);

        if (result.rows.length === 0) {
          console.log("[DB] ERROR: User not found for userId:", userId);
          return {
            statusCode: 404,
            body: JSON.stringify({ error: "User not found", userId }),
          };
        }

        const store = result.rows[0];
        console.log("[SUCCESS] Store updated:", {
          name: store.store_name,
          slug: store.store_slug,
        });

        return {
          statusCode: 200,
          body: JSON.stringify({
            store: {
              userId: store.id,
              name: store.store_name,
              slug: store.store_slug,
              enabled: store.store_enabled,
              backgroundColor: store.store_background_color,
              textColor: store.store_text_color,
              logoUrl: store.store_logo_url,
            },
          }),
        };
      } catch (dbError) {
        console.log("[DB] ERROR executing query:", dbError);
        throw dbError;
      }
    }

    // POST /api/store/items - Add item to store
    if (method === "POST" && path === "items") {
      console.log("[POST /items] Starting...");

      const userIdMatch = event.headers.cookie?.match(/userId=([^;]+)/);
      if (!userIdMatch) {
        console.log("[POST /items] Unauthorized - no userId");
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const userId = userIdMatch[1];
      console.log("[POST /items] UserId:", userId);

      let parsedBody;
      try {
        parsedBody = JSON.parse(event.body || "{}");
        console.log("[POST /items] Body parsed:", { name: parsedBody.name });
      } catch (parseError) {
        console.log("[POST /items] Parse error:", parseError);
        throw parseError;
      }

      const { name, description, price, quantity, imageUrls } = parsedBody;
      console.log("[POST /items] Fields:", {
        name,
        description,
        price,
        quantity,
        imageUrlCount: imageUrls?.length || 0,
      });

      try {
        const result = await db.query(
          `INSERT INTO store_items (user_id, name, description, price, quantity, image_urls)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, name, description, price, quantity, image_urls, created_at, updated_at`,
          [userId, name, description, price, quantity || 1, imageUrls || []],
        );

        console.log(
          "[POST /items] Insert successful, rows:",
          result.rows.length,
        );

        const item = result.rows[0];
        return {
          statusCode: 201,
          body: JSON.stringify({
            item: {
              id: item.id,
              userId: item.user_id,
              name: item.name,
              description: item.description,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              imageUrls: item.image_urls,
              createdAt: item.created_at,
              updatedAt: item.updated_at,
            },
          }),
        };
      } catch (dbError) {
        console.log("[POST /items] DB error:", dbError);
        throw dbError;
      }
    }

    // PATCH /api/store/items/:id - Update store item
    if (method === "PATCH" && path.startsWith("items")) {
      const userIdMatch = event.headers.cookie?.match(/userId=([^;]+)/);
      if (!userIdMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const userId = userIdMatch[1];
      const itemId = event.queryStringParameters?.itemId;
      const body = JSON.parse(event.body || "{}");
      const { name, description, price, quantity, imageUrls } = body;

      const result = await db.query(
        `UPDATE store_items
         SET name = $1, description = $2, price = $3, quantity = $4, image_urls = $5, updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING id, user_id, name, description, price, quantity, image_urls, created_at, updated_at`,
        [name, description, price, quantity || 1, imageUrls || [], itemId, userId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Item not found" }),
        };
      }

      const item = result.rows[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          item: {
            id: item.id,
            userId: item.user_id,
            name: item.name,
            description: item.description,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity),
            imageUrls: item.image_urls,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          },
        }),
      };
    }

    // DELETE /api/store/items/:id - Delete store item
    if (method === "DELETE" && path.startsWith("items")) {
      const userIdMatch = event.headers.cookie?.match(/userId=([^;]+)/);
      if (!userIdMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Unauthorized" }),
        };
      }

      const userId = userIdMatch[1];
      const itemId = event.queryStringParameters?.itemId;

      const result = await db.query(
        `DELETE FROM store_items WHERE id = $1 AND user_id = $2 RETURNING id`,
        [itemId, userId],
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Item not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (error) {
    console.error("Store API error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  } finally {
    try {
      await db.end();
    } catch (e) {
      console.error("Error closing database connection:", e);
    }
  }
};
