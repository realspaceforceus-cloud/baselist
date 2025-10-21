import { BadgeCheck, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { RatingBadge } from "@/components/shared/RatingBadge";
import { generateSlug } from "@/lib/slugUtils";
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

export const ListingCard = ({
  listing,
  seller,
}: ListingCardProps): JSX.Element => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(listing.postedAt), {
    addSuffix: true,
  });

  const priceLabel = formatPrice(listing.price, listing.isFree);
  const promotedLabel = listing.promoted === "feature" ? "Featured" : null;

  const firstImage = listing.imageUrls[0];

  // Check if listing is saved
  useEffect(() => {
    const checkIfSaved = async () => {
      try {
        const response = await fetch("/.netlify/functions/saved-listings", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const savedIds = data.savedListingIds || [];
          setIsSaved(savedIds.includes(listing.id));
        }
      } catch (error) {
        console.error("Failed to check saved status:", error);
      }
    };

    checkIfSaved();
  }, [listing.id]);

  const handleSaveListing = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoadingSave) return;

    setIsLoadingSave(true);
    try {
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetch(
        `/.netlify/functions/saved-listings/${listing.id}`,
        {
          method,
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save listing");
      }

      setIsSaved(!isSaved);
      toast.success(isSaved ? "Removed from saves" : "Saved!", {
        description: isSaved
          ? "You can view saved listings in your profile."
          : "Check your saves anytime from your profile.",
      });
    } catch (error) {
      toast.error("Unable to save listing");
    } finally {
      setIsLoadingSave(false);
    }
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-xl">
      <Link
        to={`/listing/${generateSlug(listing.title, listing.id)}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground line-clamp-2">
              {listing.title}
            </h3>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">
                  {priceLabel}
                </span>
              </div>
              {listing.category === "Vehicles" && listing.vehicleMiles && (
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  {Number(listing.vehicleMiles).toLocaleString()} miles
                </p>
              )}
            </div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {listing.category} • {timeAgo}
            </div>
          </div>
          <div className="mt-auto border-t border-border pt-3">
            <div className="flex items-center gap-2.5">
              {seller?.avatarUrl ? (
                <img
                  src={seller.avatarUrl}
                  alt={seller.name}
                  className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                  {seller?.name?.[0]?.toUpperCase() ?? "M"}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {seller?.name ?? "Member"}
                  </span>
                  {seller?.verified ? (
                    <BadgeCheck
                      className="h-3.5 w-3.5 text-green-600 flex-shrink-0"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {seller?.memberSince
                    ? `Since ${new Date(seller.memberSince).getFullYear()}`
                    : "Member"}
                </span>
              </div>
              {seller ? (
                <RatingBadge
                  userId={seller.id}
                  size="sm"
                  initialAverage={seller.rating ?? null}
                  initialCount={seller.ratingCount ?? seller.completedSales ?? 0}
                  label={`${seller.name} rating`}
                />
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={handleSaveListing}
        disabled={isLoadingSave}
        className="absolute right-4 top-4 rounded-full bg-white/90 dark:bg-black/50 p-2 transition hover:scale-110 active:scale-95 disabled:opacity-50"
        aria-label={isSaved ? "Remove from saves" : "Save listing"}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition",
            isSaved
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground hover:text-red-500",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
};
