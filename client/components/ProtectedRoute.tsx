import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useBaseList } from "@/context/BaseListContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
}: ProtectedRouteProps): JSX.Element => {
  const { isAuthenticated, isModerator } = useBaseList();

  // If not authenticated, redirect to home (landing page will be shown)
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If admin is required but user is not a moderator, redirect to home
  if (requireAdmin && !isModerator) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
