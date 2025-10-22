import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { createNotification } from "./notification-helpers";
import { recordMetric } from "./lib/metrics";

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
  const startTime = Date.now();

  // GET /api/listings?baseId=&category=&search=&limit=&offset=
  if (method === "GET" && path === "") {
    const client = await pool.connect();
    try {
      const query = event.queryStringParameters || {};
      const baseId = query.baseId || null;
      const category = query.category || null;
      const search = query.search || null;
      const limit = Math.min(parseInt(query.limit || "20"), 100);
      const offset = parseInt(query.offset || "0");

      let sql = `
        SELECT
          l.*,
          u.username as seller_name,
          u.avatar_url as seller_avatar,
          u.dow_verified_at as seller_verified_at,
          u.last_login_at as seller_last_active
        FROM listings l
        LEFT JOIN users u ON l.seller_id = u.id
        WHERE l.status = $1
      `;
      const params: any[] = ["active"];

      if (baseId) {
        sql += ` AND l.base_id = $${params.length + 1}`;
        params.push(baseId);
      }

      if (category) {
        sql += ` AND l.category = $${params.length + 1}`;
        params.push(category);
      }

      if (search) {
        sql += ` AND (l.title ILIKE $${params.length + 1} OR l.description ILIKE $${params.length + 1})`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }

      sql += ` ORDER BY l.promoted DESC, l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await client.query(sql, params);

      const listings = result.rows.map((row) => ({
        ...transformListing(row),
        seller: {
          id: row.seller_id,
          name: row.seller_name || "Member",
          username: row.seller_name,
          avatarUrl: row.seller_avatar,
          verified: !!row.seller_verified_at,
          lastActiveAt: row.seller_last_active,
        },
      }));

      // Get total count for pagination
      let countSql = "SELECT COUNT(*) as count FROM listings WHERE status = $1";
      const countParams: any[] = ["active"];

      if (baseId) {
        countSql += ` AND base_id = $${countParams.length + 1}`;
        countParams.push(baseId);
      }

      if (category) {
        countSql += ` AND category = $${countParams.length + 1}`;
        countParams.push(category);
      }

      if (search) {
        countSql += ` AND (title ILIKE $${countParams.length + 1} OR description ILIKE $${countParams.length + 1})`;
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm);
      }

      const countResult = await client.query(countSql, countParams);
      const total = parseInt(countResult.rows[0].count);

      const response = {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        }),
      };

      // Record metric asynchronously (don't wait)
      recordMetric(pool, {
        endpoint: "/listings",
        method: "GET",
        statusCode: 200,
        responseTimeMs: Date.now() - startTime,
      }).catch(() => {
        // Ignore errors
      });

      return response;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      const errorResponse = {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: errorMsg }),
      };

      // Record metric for error
      recordMetric(pool, {
        endpoint: "/listings",
        method: "GET",
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        errorMessage: errorMsg,
      }).catch(() => {
        // Ignore errors
      });

      return errorResponse;
    } finally {
      client.release();
    }
  }

  // GET /api/listings/user/:userId?status=&limit=&offset=
  if (method === "GET" && path.includes("/user/")) {
    const client = await pool.connect();
    try {
      const userId = path.split("/user/")[1];
      const query = event.queryStringParameters || {};
      const status = query.status || null;
      const limit = Math.min(parseInt(query.limit || "50"), 100);
      const offset = parseInt(query.offset || "0");

      let sql = `
        SELECT * FROM listings
        WHERE seller_id = $1
      `;
      const params: any[] = [userId];

      if (status) {
        sql += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await client.query(sql, params);
      const listings = result.rows.map(transformListing);

      // Get total count
      let countSql =
        "SELECT COUNT(*) as count FROM listings WHERE seller_id = $1";
      const countParams: any[] = [userId];

      if (status) {
        countSql += ` AND status = $${countParams.length + 1}`;
        countParams.push(status);
      }

      const countResult = await client.query(countSql, countParams);
      const total = parseInt(countResult.rows[0].count);

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings,
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

  // GET /api/listings/:id
  if (method === "GET" && path.startsWith("/") && !path.includes("/user/")) {
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformListing(result.rows[0])),
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Internal server error";
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
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
        recordMetric(pool, {
          endpoint: "/listings",
          method: "POST",
          statusCode: 400,
          responseTimeMs: Date.now() - startTime,
          errorMessage: "Missing required fields",
        }).catch(() => {});

        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
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

      recordMetric(pool, {
        endpoint: "/listings",
        method: "POST",
        statusCode: 201,
        responseTimeMs: Date.now() - startTime,
      }).catch(() => {});

      return {
        statusCode: 201,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformListing(result.rows[0])),
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformListing(result.rows[0])),
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
          headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: true }),
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
