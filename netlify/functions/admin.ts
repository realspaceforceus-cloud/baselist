import { Handler } from "@netlify/functions";
import { supabase } from "./db";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/admin", "");

  // GET /api/admin/users - get all users (admin only)
  if (method === "GET" && path === "/users") {
    try {
      const { data: users, error } = await supabase
        .from("users")
        .select("id, username, email, role, status, base_id, created_at");

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(users),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // GET /api/admin/reports - get all reports
  if (method === "GET" && path === "/reports") {
    try {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(reports),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // GET /api/admin/verifications - get pending verifications
  if (method === "GET" && path === "/verifications") {
    try {
      const { data: verifications, error } = await supabase
        .from("verifications")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(verifications),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // PUT /api/admin/users/:id - update user
  if (method === "PUT" && path.includes("/users/")) {
    try {
      const id = path.split("/users/")[1];
      const updates = JSON.parse(event.body || "{}");

      const { data: user, error } = await supabase
        .from("users")
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
        body: JSON.stringify(user),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // PUT /api/admin/reports/:id - update report
  if (method === "PUT" && path.includes("/reports/")) {
    try {
      const id = path.split("/reports/")[1];
      const { status, resolverId } = JSON.parse(event.body || "{}");

      const { data: report, error } = await supabase
        .from("reports")
        .update({
          status,
          resolver_id: resolverId,
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
        })
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
        body: JSON.stringify(report),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // DELETE /api/admin/listings/:id - remove listing
  if (method === "DELETE" && path.includes("/listings/")) {
    try {
      const id = path.split("/listings/")[1];

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
