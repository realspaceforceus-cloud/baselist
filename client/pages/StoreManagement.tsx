import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { StoreSettingsSection } from "@/components/admin/sections/StoreSettingsSection";
import { Store } from "@/types";

export default function StoreManagement() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="text-muted-foreground">
            Please sign in to manage your store.
          </p>
          <Button asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Store Management</h1>
              <p className="text-muted-foreground mt-2">
                Manage your store settings, customize colors, add items, and
                more.
              </p>
            </div>
            {(user as any)?.store_enabled && (user as any)?.store_slug && (
              <Button asChild>
                <Link
                  to={`/store/${(user as any).store_slug}`}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Store
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Store Settings Component */}
        <StoreSettingsSection
          user={user}
          onStoreUpdated={(store: Store) => {
            // Re-fetch user data if needed
            console.log("Store updated:", store);
          }}
        />
      </div>
    </div>
  );
}
