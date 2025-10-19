import { Handler } from "@netlify/functions";
import { supabase } from "./db";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/listings", "");

  // GET /api/listings - list all active listings
  if (method === "GET" && path === "") {
    try {
      const { data: listings, error } = await supabase
        .from("listings")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(listings),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // GET /api/listings/:id
  if (method === "GET" && path.startsWith("/")) {
    try {
      const id = path.slice(1);
      const { data: listing, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !listing) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Listing not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(listing),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/listings - create new listing
  if (method === "POST" && path === "") {
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

      const { data: listing, error } = await supabase
        .from("listings")
        .insert({
          id: listingId,
          title,
          price: price || 0,
          is_free: isFree || false,
          category,
          status: "active",
          seller_id: sellerId,
          base_id: baseId,
          description,
          image_urls: imageUrls || [],
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
        body: JSON.stringify(listing),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // PUT /api/listings/:id - update listing
  if (method === "PUT" && path.startsWith("/")) {
    try {
      const id = path.slice(1);
      const updates = JSON.parse(event.body || "{}");

      const { data: listing, error } = await supabase
        .from("listings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(listing),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // DELETE /api/listings/:id
  if (method === "DELETE" && path.startsWith("/")) {
    try {
      const id = path.slice(1);

      const { error } = await supabase.from("listings").delete().eq("id", id);

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
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
