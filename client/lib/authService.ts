// Production auth service - uses real backend endpoints
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  baseId: string;
  avatarUrl: string;
  role: "member" | "admin";
  verified: boolean;
}

interface AuthResponse {
  success: boolean;
  userId: string;
  username: string;
  email: string;
  baseId: string;
  avatarUrl: string;
  role: "member" | "admin";
  verified: boolean;
}

// Store auth token in localStorage
const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

export const authService = {
  // Sign up new user
  async signup(
    username: string,
    email: string,
    password: string,
    baseId: string,
  ): Promise<{ userId: string; message: string }> {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, baseId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    return response.json();
  },

  // Log in with email and password
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data: AuthResponse = await response.json();
    
    // Store user info
    const user: AuthUser = {
      id: data.userId,
      username: data.username,
      email: data.email,
      baseId: data.baseId,
      avatarUrl: data.avatarUrl,
      role: data.role,
      verified: data.verified,
    };

    // Store in localStorage for session persistence
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, data.userId); // Use userId as session token

    return user;
  },

  // Restore user from localStorage (called on app load)
  getStoredUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to restore user:", error);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Sign out
  logout(): void {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
};
