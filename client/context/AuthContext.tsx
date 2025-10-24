import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, login, logout, type AuthUser } from "@/lib/authClient";
import { toast } from "sonner";

interface AuthContextType {
  loading: boolean;
  user: AuthUser | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Silent re-auth on app startup - restore session from cookies
  useEffect(() => {
    const restoreSession = async () => {
      // On dev server, skip session restore (Netlify endpoints don't exist)
      if (import.meta.env.DEV) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetchMe();
        if (response.authenticated && response.user) {
          setUser(response.user);
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    try {
      setLoading(true);
      const authUser = await login(identifier, password);
      setUser(authUser);
      toast.success("Logged in successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await logout();
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetchMe();
      if (response.authenticated && response.user) {
        setUser(response.user);
        console.log("[AUTH] User refreshed:", {
          store_enabled: (response.user as any)?.store_enabled,
          store_slug: (response.user as any)?.store_slug,
        });
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ loading, user, signIn, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
