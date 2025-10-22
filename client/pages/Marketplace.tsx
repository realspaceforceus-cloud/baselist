import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import { EmptyState } from "@/components/listings/EmptyState";
import { FilterBar } from "@/components/listings/FilterBar";
import { VehicleFilterBar } from "@/components/listings/VehicleFilterBar";
import { MarketplaceSidebar } from "@/components/marketplace/MarketplaceSidebar";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
import { useListings } from "@/hooks/useListings";
import { extractVehicleOptions } from "@/lib/vehicleUtils";
import { LISTING_CATEGORIES } from "@/data/mock";
import type { ListingFilter } from "@/types";

interface VehicleFilters {
  year?: string;
  make?: string;
  model?: string;
  type?: string;
  color?: string;
  maxMiles?: string;
}

const filters: ListingFilter[] = ["All", ...LISTING_CATEGORIES];

export const Marketplace = (): JSX.Element => {
  const {
    currentBaseId,
    currentBase,
    searchQuery,
    isAuthenticated,
    isDowVerified,
    beginVerification,
  } = useBaseList();

  const [offset, setOffset] = useState(0);
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("All");
  const [vehicleFilters, setVehicleFilters] = useState<VehicleFilters>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch listings using React Query hook
  const category = activeFilter !== "All" ? activeFilter : undefined;
  const { data: listingsResponse, isLoading } = useListings({
    baseId: currentBaseId || undefined,
    category,
    search: searchQuery || undefined,
    limit: 20,
    offset,
  });

  const listings = useMemo(
    () => listingsResponse?.listings || [],
    [listingsResponse],
  );
  const hasMore = useMemo(
    () => listingsResponse?.hasMore || false,
    [listingsResponse],
  );

  const vehicleOptions = useMemo(() => {
    return extractVehicleOptions(listings);
  }, [listings]);

  // Apply client-side vehicle filters only (category & search already filtered by API)
  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
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
      return true;
    });
  }, [listings, activeFilter, vehicleFilters]);

  // Handle infinite scroll pagination
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setOffset((prev) => prev + 20);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  const resultSummary = useMemo(() => {
    const formatter = new Intl.NumberFormat("en-US");
    return formatter.format(filteredListings.length);
  }, [filteredListings]);

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
            {resultSummary} listings
            {currentBase ? ` at ${currentBase.name}` : ""}
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

        {activeFilter === "Vehicles" && (
          <VehicleFilterBar
            filters={vehicleFilters}
            onFiltersChange={setVehicleFilters}
            availableOptions={vehicleOptions}
          />
        )}
      </div>

      {filteredListings.length > 0 ? (
        <MarketplaceSidebar listings={filteredListings} />
      ) : (
        <EmptyState />
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
    </section>
  );
};

export default Marketplace;
