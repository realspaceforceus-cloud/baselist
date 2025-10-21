import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { createNotification } from "./notification-helpers";

// Transform database row to Listing type
const transformListing = (row: any) => ({
  id: row.id,
  title: row.title,
  price: row.price,
  isFree: row.is_free,
  category: row.category,
  status: row.status,
  sellerId: row.seller_id,
  baseId: row.base_id,
  imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
  description: row.description,
  promoted: row.promoted,
  postedAt: row.created_at,
  vehicleYear: row.vehicle_year,
  vehicleMake: row.vehicle_make,
  vehicleModel: row.vehicle_model,
  vehicleType: row.vehicle_type,
  vehicleColor: row.vehicle_color,
  vehicleMiles: row.vehicle_miles,
});

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/listings", "");

  // GET /api/listings
  if (method === "GET" && path === "") {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM listings WHERE status = $1 ORDER BY created_at DESC",
        ["active"],
      );

      const transformedListings = result.rows.map(transformListing);

      return {
        statusCode: 200,
        body: JSON.stringify(transformedListings),
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

  // GET /api/listings/:id
  if (method === "GET" && path.startsWith("/")) {
    const client = await pool.connect();
    try {
      const id = path.slice(1);

      // First try exact match
      let result = await client.query("SELECT * FROM listings WHERE id = $1", [
        id,
      ]);

      // If not found and id looks like a UUID prefix (8 chars), try prefix match
      if (result.rows.length === 0 && /^[a-f0-9-]{8}$/.test(id)) {
        result = await client.query(
          "SELECT * FROM listings WHERE id LIKE $1 LIMIT 1",
          [`${id}%`],
        );
      }

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(transformListing(result.rows[0])),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        body: JSON.stringify({ error: errorMsg }),
      };
    } finally {
      client.release();
    }
  }

  // POST /api/listings
  if (method === "POST" && path === "") {
    const client = await pool.connect();
    try {
      const {
        title,
        price,
        isFree,
        category,
        description,
        imageUrls,
        baseId,
        sellerId,
        vehicleYear,
        vehicleMake,
        vehicleModel,
        vehicleType,
        vehicleColor,
        vehicleMiles,
      } = JSON.parse(event.body || "{}");

      if (!title || !category || !baseId || !sellerId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const listingId = randomUUID();

      const result = await client.query(
        `INSERT INTO listings (id, title, price, is_free, category, status, seller_id, base_id, description, image_urls, vehicle_year, vehicle_make, vehicle_model, vehicle_type, vehicle_color, vehicle_miles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING *`,
        [
          listingId,
          title,
          price || 0,
          isFree || false,
          category,
          "active",
          sellerId,
          baseId,
          description,
          imageUrls || [],
          vehicleYear || null,
          vehicleMake || null,
          vehicleModel || null,
          vehicleType || null,
          vehicleColor || null,
          vehicleMiles || null,
        ],
      );

      return {
        statusCode: 201,
        body: JSON.stringify(transformListing(result.rows[0])),
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

  // PUT /api/listings/:id
  if (method === "PUT" && path.startsWith("/")) {
    const client = await pool.connect();
    try {
      const id = path.slice(1);
      const updates = JSON.parse(event.body || "{}");

      // Map camelCase field names to snake_case database columns
      const fieldMapping: Record<string, string> = {
        isFree: "is_free",
        imageUrls: "image_urls",
        sellerId: "seller_id",
        baseId: "base_id",
        vehicleYear: "vehicle_year",
        vehicleMake: "vehicle_make",
        vehicleModel: "vehicle_model",
        vehicleType: "vehicle_type",
        vehicleColor: "vehicle_color",
        vehicleMiles: "vehicle_miles",
        postedAt: "created_at",
      };

      // Transform field names
      const mappedUpdates: Record<string, any> = {};
      Object.entries(updates).forEach(([key, value]) => {
        const dbColumn = fieldMapping[key] || key;
        mappedUpdates[dbColumn] = value;
      });

      const setClauses = Object.keys(mappedUpdates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const values = [...Object.values(mappedUpdates), id];

      const result = await client.query(
        `UPDATE listings SET ${setClauses}, updated_at = NOW() WHERE id = $${Object.keys(mappedUpdates).length + 1} RETURNING *`,
        values,
      );

      return {
        statusCode: 200,
        body: JSON.stringify(transformListing(result.rows[0])),
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

  // DELETE /api/listings/:id
  if (method === "DELETE" && path.startsWith("/")) {
    const client = await pool.connect();
    try {
      const id = path.slice(1);

      // First fetch the listing to get seller info
      const listingResult = await client.query(
        "SELECT id, title, seller_id FROM listings WHERE id = $1",
        [id],
      );

      if (listingResult.rows.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      const { title, seller_id } = listingResult.rows[0];

      // Delete the listing
      await client.query("DELETE FROM listings WHERE id = $1", [id]);

      // Create notification for seller about listing removal
      try {
        const reasonFromBody = event.body
          ? JSON.parse(event.body).reason ||
            "Listing violates community guidelines"
          : "Listing violates community guidelines";

        await createNotification({
          userId: seller_id,
          type: "listing_removed",
          title: `Your listing was removed`,
          description: `Your listing "${title}" has been removed. Reason: ${reasonFromBody}`,
          targetId: id,
          targetType: "listing",
          data: {
            listingTitle: title,
            reason: reasonFromBody,
          },
        });
      } catch (notificationErr) {
        console.error(
          "Error creating listing removal notification:",
          notificationErr,
        );
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
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
