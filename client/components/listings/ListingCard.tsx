import { BadgeCheck } from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

import { RatingBadge } from "@/components/shared/RatingBadge";
import { cn } from "@/lib/utils";
import type { Listing, Seller } from "@/types";

interface ListingCardProps {
  listing: Listing;
  seller?: Seller;
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

export const ListingCard = ({ listing, seller }: ListingCardProps): JSX.Element => {
  const timeAgo = formatDistanceToNow(new Date(listing.postedAt), {
    addSuffix: true,
  });

  const priceLabel = formatPrice(listing.price, listing.isFree);
  const promotedLabel = listing.promoted === "feature" ? "Featured" : null;

  const firstImage = listing.imageUrls[0];

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={firstImage}
          alt={`${listing.title} photo`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {promotedLabel ? (
          <span className="absolute left-0 top-0 rounded-br-2xl bg-primary/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-primary-foreground/95 shadow-sm">
            {promotedLabel}
          </span>
        ) : null}
        {listing.status === "sold" ? (
          <span className="absolute right-4 top-4 rounded-full bg-muted/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sold
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">
              {listing.title}
            </h3>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                listing.isFree || listing.price === 0
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary",
              )}
            >
              {priceLabel}
            </span>
          </div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {listing.category} • {timeAgo}
          </div>
        </div>
        <div className="mt-auto flex items-center gap-3">
          {seller?.avatarUrl ? (
            <img
              src={seller.avatarUrl}
              alt={seller.name}
              className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
              {seller?.name?.[0] ?? "B"}
            </span>
          )}
          <div className="flex flex-col">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex items-center gap-1">
                {seller?.name ?? "Verified member"}
                {seller?.verified ? (
                  <BadgeCheck className="h-4 w-4 text-verified" aria-hidden />
                ) : null}
              </span>
              {seller ? (
                <RatingBadge
                  userId={seller.id}
                  size="sm"
                  initialAverage={seller.rating ?? null}
                  initialCount={seller.ratingCount ?? seller.completedSales ?? 0}
                  label={`${seller.name} rating`}
                />
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              Member since {seller ? new Date(seller.memberSince).getFullYear() : "2020"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
