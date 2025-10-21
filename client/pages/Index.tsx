import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/listings/EmptyState";
import { FilterBar } from "@/components/listings/FilterBar";
import { VehicleFilterBar } from "@/components/listings/VehicleFilterBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { SponsorTile } from "@/components/listings/SponsorTile";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
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

const Index = (): JSX.Element => {
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
  const [visibleCount, setVisibleCount] = useState(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveFilter("All");
    setVehicleFilters({});
  }, [currentBaseId]);

  useEffect(() => {
    setVisibleCount(6);
  }, [activeFilter, currentBaseId, searchQuery, vehicleFilters]);

  const sponsorPlacement = useMemo(
    () =>
      sponsorPlacements.find((placement) => placement.baseId === currentBaseId),
    [currentBaseId, sponsorPlacements],
  );

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

      // Apply vehicle filters only if viewing Vehicles category
      if (activeFilter === "Vehicles" && listing.category === "Vehicles") {
        if (vehicleFilters.year && listing.vehicleYear !== vehicleFilters.year) {
          return false;
        }
        if (
          vehicleFilters.make &&
          (!listing.vehicleMake ||
            !listing.vehicleMake
              .toLowerCase()
              .includes(vehicleFilters.make.toLowerCase()))
        ) {
          return false;
        }
        if (
          vehicleFilters.model &&
          (!listing.vehicleModel ||
            !listing.vehicleModel
              .toLowerCase()
              .includes(vehicleFilters.model.toLowerCase()))
        ) {
          return false;
        }
        if (vehicleFilters.type && listing.vehicleType !== vehicleFilters.type) {
          return false;
        }
        if (
          vehicleFilters.color &&
          listing.vehicleColor !== vehicleFilters.color
        ) {
          return false;
        }
        if (vehicleFilters.maxMiles && listing.vehicleMiles) {
          const maxMiles = Number(vehicleFilters.maxMiles);
          const listingMiles = Number(listing.vehicleMiles);
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
            Math.min(previous + 4, filteredListings.length),
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
                  Matching “
                  <span className="font-medium text-foreground">
                    {searchQuery}
                  </span>
                  ”
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
          />
        )}
      </div>

      {visibleListings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      <div ref={sentinelRef} aria-hidden className="h-1 w-full" />
    </section>
  );
};

export default Index;
