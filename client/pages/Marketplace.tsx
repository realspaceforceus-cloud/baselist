import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/listings/EmptyState";
import { FilterBar } from "@/components/listings/FilterBar";
import { VehicleFilterBar } from "@/components/listings/VehicleFilterBar";
import { MarketplaceSidebar } from "@/components/marketplace/MarketplaceSidebar";
import { SponsorTile } from "@/components/listings/SponsorTile";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
import { extractVehicleOptions } from "@/lib/vehicleUtils";
import { LISTING_CATEGORIES } from "@/data/mock";
import type { Listing, ListingFilter, Seller } from "@/types";

interface VehicleFilters {
  year?: string;
  make?: string;
  model?: string;
  type?: string;
  color?: string;
  maxMiles?: string;
}

const filters: ListingFilter[] = ["All", ...LISTING_CATEGORIES];

const SellerCacheRenderer = ({
  listings,
  children,
}: {
  listings: Listing[];
  children: (sellers: Record<string, Seller>) => JSX.Element;
}): JSX.Element => {
  const [sellers, setSellers] = useState<Record<string, Seller>>({});

  useEffect(() => {
    const uniqueSellerIds = [...new Set(listings.map((l) => l.sellerId))];

    const fetchSellers = async () => {
      const fetchedSellers: Record<string, Seller> = {};
      for (const sellerId of uniqueSellerIds) {
        try {
          const response = await fetch(
            `/.netlify/functions/users/${sellerId}`,
            { credentials: "include" },
          );
          if (response.ok) {
            const data = await response.json();
            fetchedSellers[sellerId] = data;
          }
        } catch (error) {
          console.error(`Failed to fetch seller ${sellerId}:`, error);
        }
      }
      setSellers(fetchedSellers);
    };

    if (uniqueSellerIds.length > 0) {
      fetchSellers();
    }
  }, [listings]);

  return children(sellers);
};

export const Marketplace = (): JSX.Element => {
  const {
    listings,
    currentBaseId,
    currentBase,
    searchQuery,
    isAuthenticated,
    isDowVerified,
    beginVerification,
    sponsorPlacements,
  } = useBaseList();
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("All");
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilters>({});
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveFilter("All");
    setVehicleFilters({});
  }, [currentBaseId]);

  useEffect(() => {
    setVisibleCount(20);
  }, [activeFilter, currentBaseId, searchQuery, vehicleFilters]);

  const sponsorPlacement = useMemo(
    () =>
      sponsorPlacements.find((placement) => placement.baseId === currentBaseId),
    [currentBaseId, sponsorPlacements],
  );

  const vehicleOptions = useMemo(() => {
    return extractVehicleOptions(listings);
  }, [listings]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      if (listing.baseId !== currentBaseId) {
        return false;
      }

      if (activeFilter !== "All") {
        if (activeFilter === "Free") {
          const isFreeMatch = listing.isFree || listing.category === "Free";
          if (!isFreeMatch) {
            return false;
          }
        } else if (listing.category !== activeFilter) {
          return false;
        }
      }

      if (activeFilter === "Vehicles" && listing.category === "Vehicles") {
        if (
          vehicleFilters.year &&
          String(listing.vehicleYear || "") !== vehicleFilters.year
        ) {
          return false;
        }
        if (vehicleFilters.make) {
          const make = String(listing.vehicleMake || "").toLowerCase();
          if (!make.includes(vehicleFilters.make.toLowerCase())) {
            return false;
          }
        }
        if (vehicleFilters.model) {
          const model = String(listing.vehicleModel || "").toLowerCase();
          if (!model.includes(vehicleFilters.model.toLowerCase())) {
            return false;
          }
        }
        if (
          vehicleFilters.type &&
          String(listing.vehicleType || "") !== vehicleFilters.type
        ) {
          return false;
        }
        if (
          vehicleFilters.color &&
          String(listing.vehicleColor || "") !== vehicleFilters.color
        ) {
          return false;
        }
        if (vehicleFilters.maxMiles) {
          const listingMiles = Number(listing.vehicleMiles || 0);
          const maxMiles = Number(vehicleFilters.maxMiles);
          if (listingMiles > maxMiles) {
            return false;
          }
        }
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [listing.title, listing.description, listing.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [activeFilter, currentBaseId, listings, searchQuery, vehicleFilters]);

  const visibleListings = useMemo(
    () => filteredListings.slice(0, visibleCount),
    [filteredListings, visibleCount],
  );

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    if (visibleListings.length >= filteredListings.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((previous) =>
            Math.min(previous + 10, filteredListings.length),
          );
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [filteredListings.length, visibleListings.length]);

  const resultSummary = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US");
    return formatter.format(filteredListings.length);
  }, [filteredListings.length]);

  const showVerificationBanner = isAuthenticated && !isDowVerified;

  return (
    <section className="space-y-8">
      {showVerificationBanner ? (
        <div className="rounded-3xl border border-blue-300 bg-blue-50 p-4 text-sm dark:border-blue-700 dark:bg-blue-950 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Verify DoW access to post and message.
              </p>
              <p className="text-xs text-muted-foreground">
                Use your .mil email, an invite code, or a quick manual check to
                unlock posting and DMs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-white"
                type="button"
                onClick={() => beginVerification("email")}
              >
                .mil email
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-white"
                type="button"
                onClick={() => beginVerification("invite")}
              >
                Invite code
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold text-foreground hover:bg-primary hover:text-white"
                type="button"
                onClick={() => beginVerification("manual")}
              >
                Manual
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <FilterBar
            filters={filters}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          <div className="text-sm text-muted-foreground">
            {resultSummary} listings at {currentBase.name}
            {searchQuery ? (
              <>
                <span className="px-1">•</span>
                <span>
                  Matching "
                  <span className="font-medium text-foreground">
                    {searchQuery}
                  </span>
                  "
                </span>
              </>
            ) : null}
          </div>
        </div>

        <SponsorTile placement={sponsorPlacement} />

        {activeFilter === "Vehicles" && (
          <VehicleFilterBar
            filters={vehicleFilters}
            onFiltersChange={setVehicleFilters}
            availableOptions={vehicleOptions}
          />
        )}
      </div>

      {visibleListings.length > 0 ? (
        <SellerCacheRenderer listings={visibleListings}>
          {(sellers) => (
            <MarketplaceSidebar listings={visibleListings} sellers={sellers} />
          )}
        </SellerCacheRenderer>
      ) : (
        <EmptyState />
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
    </section>
  );
};

export default Marketplace;
