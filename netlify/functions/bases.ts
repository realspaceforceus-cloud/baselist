import { Handler } from "@netlify/functions";
import { supabase } from "./db";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/bases", "");

  // GET /api/bases - get all bases
  if (method === "GET" && path === "") {
    try {
      const { data: bases, error } = await supabase.from("bases").select("*");

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(bases),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // GET /api/bases/:id - get specific base
  if (method === "GET" && path.startsWith("/")) {
    try {
      const id = path.slice(1);
      const { data: base, error } = await supabase
        .from("bases")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !base) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Base not found" }),
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(base),
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
