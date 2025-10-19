import { Handler } from "@netlify/functions";
import { supabase } from "./db";
import bcrypt from "bcryptjs";

// Helper to get user from Authorization header
async function getUserFromToken(event: any) {
  const authHeader = event.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) return null;

  // In production, verify JWT. For now, extract user ID from token
  // This is simplified - in production, use proper JWT verification
  try {
    const decoded = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
    return decoded.sub;
  } catch {
    return null;
  }
}

export const handler: Handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path.replace("/.netlify/functions/users", "");
  const userId = await getUserFromToken(event);

  // GET /api/users/:id
  if (method === "GET" && path.startsWith("/")) {
    try {
      const id = path.slice(1);
      const { data: user, error } = await supabase
        .from("users")
        .select("id, username, email, role, base_id, avatar_url, created_at")
        .eq("id", id)
        .single();

      if (error || !user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
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

  // POST /api/users/profile/update
  if (method === "POST" && path === "/profile/update") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    try {
      const { name } = JSON.parse(event.body || "{}");

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid username" }),
        };
      }

      const { data: updated, error } = await supabase
        .from("users")
        .update({ username: name.trim() })
        .eq("id", userId)
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
        body: JSON.stringify({
          success: true,
          message: "Profile updated",
          name: updated?.username,
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/users/email/request-change
  if (method === "POST" && path === "/email/request-change") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    try {
      const { newEmail } = JSON.parse(event.body || "{}");

      if (!newEmail || typeof newEmail !== "string") {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid email address" }),
        };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid email format" }),
        };
      }

      const { data: user } = await supabase
        .from("users")
        .select("email")
        .eq("id", userId)
        .single();

      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      if (newEmail === user.email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "New email must be different from current email" }),
        };
      }

      // Check if email already exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .or(`email.eq.${newEmail},pending_email.eq.${newEmail}`)
        .single()
        .catch(() => ({ data: null }));

      if (existing) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Email already in use" }),
        };
      }

      // Store pending email (in real app, send verification email)
      const verificationToken = Buffer.from(`${userId}:${newEmail}:${Date.now()}`).toString(
        "base64",
      );
      console.log(`[DEV] Email verification link: /verify-email?token=${verificationToken}`);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Verification link sent to ${newEmail}`,
        }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/users/password/change
  if (method === "POST" && path === "/password/change") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    try {
      const { currentPassword, newPassword } = JSON.parse(event.body || "{}");

      if (!currentPassword || !newPassword) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      if (newPassword.length < 8) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Password must be at least 8 characters" }),
        };
      }

      const { data: user } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userId)
        .single();

      if (!user) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "User not found" }),
        };
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: "Current password is incorrect" }),
        };
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await supabase.from("users").update({ password_hash: newHash }).eq("id", userId);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Password changed successfully" }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  }

  // POST /api/users/account/delete
  if (method === "POST" && path === "/account/delete") {
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    try {
      // Delete user's listings
      await supabase.from("listings").delete().eq("seller_id", userId);

      // Remove user from message threads
      const { data: threads } = await supabase
        .from("message_threads")
        .select("id, participants")
        .contains("participants", [userId]);

      if (threads) {
        for (const thread of threads) {
          const updatedParticipants = thread.participants.filter((p) => p !== userId);
          if (updatedParticipants.length === 0) {
            await supabase.from("message_threads").delete().eq("id", thread.id);
          } else {
            await supabase
              .from("message_threads")
              .update({ participants: updatedParticipants })
              .eq("id", thread.id);
          }
        }
      }

      // Delete user account
      await supabase.from("users").delete().eq("id", userId);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Account deleted successfully" }),
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
