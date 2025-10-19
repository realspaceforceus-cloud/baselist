import { Handler } from "@netlify/functions";
import { supabase } from "./db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/auth", "");

  // POST /api/auth/register
  if (method === "POST" && path === "/register") {
    try {
      const { email, password, username, baseId } = JSON.parse(
        event.body || "{}",
      );

      if (!email || !password || !username || !baseId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      // Check if user exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (existing) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: "Email already registered" }),
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = randomUUID();

      const { error } = await supabase.from("users").insert({
        id: userId,
        email,
        username,
        password_hash: passwordHash,
        role: "member",
        status: "active",
        base_id: baseId,
        avatar_url: "",
      });

      if (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, userId }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/auth/login
  if (method === "POST" && path === "/login") {
    try {
      const { email, password } = JSON.parse(event.body || "{}");

      if (!email || !password) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing email or password" }),
        };
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !user) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid credentials" }),
        };
      }

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Invalid credentials" }),
        };
      }

      // In production, generate JWT tokens here
      // For now, return user data
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            baseId: user.base_id,
          },
        }),
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
