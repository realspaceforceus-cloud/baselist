import { Handler } from "@netlify/functions";
import { pool } from "./db";
import { randomUUID } from "crypto";

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
      let result = await client.query(
        "SELECT * FROM listings WHERE id = $1",
        [id],
      );

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
      } = JSON.parse(event.body || "{}");

      if (!title || !category || !baseId || !sellerId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const listingId = randomUUID();

      const result = await client.query(
        `INSERT INTO listings (id, title, price, is_free, category, status, seller_id, base_id, description, image_urls)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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

      const setClauses = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(", ");

      const values = [...Object.values(updates), id];

      const result = await client.query(
        `UPDATE listings SET ${setClauses}, updated_at = NOW() WHERE id = $${Object.keys(updates).length + 1} RETURNING *`,
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

      await client.query("DELETE FROM listings WHERE id = $1", [id]);

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
