// Production auth client - uses cookies + Netlify Functions
export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  baseId: string;
  avatarUrl: string;
  role: "member" | "admin";
  verified: boolean;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: AuthUser;
}

export async function login(
  identifier: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include", // Send/receive cookies
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: identifier, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Login failed");
  }

  // Server sets cookies; return user payload for UI
  const data = await res.json();
  return {
    userId: data.userId,
    username: data.username,
    email: data.email,
    baseId: data.baseId,
    avatarUrl: data.avatarUrl,
    role: data.role,
    verified: data.verified,
  };
}

export async function fetchMe(): Promise<AuthResponse> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // Include cookies
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      return { authenticated: false };
    }

    return res.json();
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { authenticated: false };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/.netlify/functions/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
}
