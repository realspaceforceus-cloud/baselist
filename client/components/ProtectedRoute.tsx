import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
}: ProtectedRouteProps): JSX.Element => {
  const { loading, user } = useAuth();

  // Show splash screen while authenticating
  if (loading) {
    return <SplashScreen />;
  }

  // If not authenticated, redirect to home
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If admin is required but user is not admin, redirect to home
  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
