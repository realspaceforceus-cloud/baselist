import { Eye, MapPin, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { generateSlug } from "@/lib/slugUtils";
import type { Listing, Seller } from "@/types";

interface MarketplaceSidebarProps {
  listings: Listing[];
  sellers: Record<string, Seller>;
}

const formatPrice = (price: number, isFree: boolean): string => {
  if (isFree || price === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: price % 1 === 0 ? 0 : 2,
  }).format(price);
};

export function MarketplaceSidebar({
  listings,
  sellers,
}: MarketplaceSidebarProps): JSX.Element {
  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const seller = sellers[listing.sellerId];
        const slug = generateSlug(listing.title, listing.id);
        const firstImage = listing.imageUrls[0];

        return (
          <Link
            key={listing.id}
            to={`/listing/${slug}`}
            className="group flex gap-3 rounded-lg border border-border bg-card p-3 transition hover:shadow-md hover:border-primary/50"
          >
            {/* Thumbnail */}
            {firstImage && (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                  src={firstImage}
                  alt={listing.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Price */}
              <div className="mb-1">
                <span className="text-lg font-bold text-primary">
                  {formatPrice(listing.price, listing.isFree)}
                </span>
              </div>

              {/* Title */}
              <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
                {listing.title}
              </h3>

              {/* Description */}
              {listing.description && (
                <p className="line-clamp-1 text-xs text-muted-foreground mt-1">
                  {listing.description}
                </p>
              )}

              {/* Seller info */}
              <div className="mt-2 flex items-center gap-2 text-xs">
                {seller && (
                  <>
                    <img
                      src={seller.avatarUrl}
                      alt={seller.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">{seller.name}</span>
                      {seller.verified && (
                        <BadgeCheck className="h-3 w-3 text-blue-500" />
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* View Button */}
            <div className="flex flex-shrink-0 items-center justify-center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/listing/${slug}`;
                }}
                className="rounded border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-accent transition"
              >
                View
              </button>
            </div>
          </Link>
        );
      })}

      {listings.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          <p>No listings found</p>
        </div>
      )}
    </div>
  );
}
