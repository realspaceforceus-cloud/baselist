import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronLeft, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Store, StoreItem, UserWithStore } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function StorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [owner, setOwner] = useState<UserWithStore | null>(null);
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      if (!storeSlug) return;

      try {
        setIsLoading(true);
        setError(null);

        // Fetch store by slug
        const response = await fetch(
          `/.netlify/functions/store?slug=${encodeURIComponent(storeSlug)}`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Store not found");
        }

        const data = await response.json();
        setStore(data.store);
        setOwner(data.owner);
        setItems(data.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load store");
        setStore(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStore();
  }, [storeSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (error || !store || !owner) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/" className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Store Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              {error || "This store is not available."}
            </p>
            <Button asChild>
              <Link to="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: store.backgroundColor || "#FFFFFF",
        color: store.textColor || "#000000",
      }}
    >
      {/* Header with back button */}
      <div className="max-w-7xl mx-auto px-4 py-4 border-b border-border/20">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Store Header */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div className="md:col-span-2">
            <div className="flex items-start gap-6">
              {store.logoUrl && (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="h-32 w-32 rounded-lg object-cover border border-border/30"
                />
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{store.name}</h1>
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={owner.avatarUrl} alt={owner.name} />
                    <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      <Link
                        to={`/profile/${owner.username}`}
                        className="hover:underline"
                      >
                        {owner.name}
                      </Link>
                    </p>
                    <p className="text-sm opacity-75">
                      {owner.rating ? (
                        <>
                          ⭐ {owner.rating.toFixed(1)} ({owner.ratingCount}{" "}
                          ratings)
                        </>
                      ) : (
                        "No ratings yet"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="default">
                    <Link
                      to={`/messages?sellerId=${owner.id}`}
                      className="flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message Store
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link
                      to={`/profile/${owner.username}`}
                      className="flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      View Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border/30 p-4">
              <p className="text-sm opacity-75 mb-1">Items for Sale</p>
              <p className="text-3xl font-bold">{items.length}</p>
            </div>
            <div className="rounded-lg border border-border/30 p-4">
              <p className="text-sm opacity-75 mb-1">Member Since</p>
              <p className="text-sm font-medium">
                {new Date(owner.memberSince).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                })}
              </p>
            </div>
            {owner.completedSales ? (
              <div className="rounded-lg border border-border/30 p-4">
                <p className="text-sm opacity-75 mb-1">Completed Sales</p>
                <p className="text-3xl font-bold">{owner.completedSales}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Items for Sale</h2>
        {items.length === 0 ? (
          <div className="rounded-lg border border-border/30 p-12 text-center">
            <p className="text-lg opacity-75">No items available yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group rounded-lg border border-border/30 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Item Image */}
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <div className="relative h-40 overflow-hidden bg-muted">
                    <img
                      src={item.imageUrls[0]}
                      alt={item.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">
                      No image
                    </span>
                  </div>
                )}

                {/* Item Info */}
                <div className="p-4">
                  <h3 className="font-semibold truncate mb-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-sm opacity-75 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">
                      ${item.price.toFixed(2)}
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 px-3">
                      Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
