import { useEffect, useMemo, useRef, useState } from "react";

import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/listings/EmptyState";
import { FilterBar } from "@/components/listings/FilterBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { SponsorTile } from "@/components/listings/SponsorTile";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBaseList } from "@/context/BaseListContext";
import { PROHIBITED_CONTENT, SELLERS, LISTING_CATEGORIES } from "@/data/mock";
import type { ListingFilter, Seller } from "@/types";

const filters: ListingFilter[] = ["All", ...LISTING_CATEGORIES];

const buildSellerMap = (): Record<string, Seller> => {
  return SELLERS.reduce<Record<string, Seller>>((accumulator, seller) => {
    accumulator[seller.id] = seller;
    return accumulator;
  }, {});
};

const sellerMap = buildSellerMap();

const Index = (): JSX.Element => {
  const {
    listings,
    currentBaseId,
    currentBase,
    searchQuery,
    isAuthenticated,
    isDodVerified,
    beginVerification,
    sponsorPlacements,
  } = useBaseList();
  const [activeFilter, setActiveFilter] = useState<ListingFilter>("All");
  const [visibleCount, setVisibleCount] = useState(6);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveFilter("All");
  }, [currentBaseId]);

  useEffect(() => {
    setVisibleCount(6);
  }, [activeFilter, currentBaseId, searchQuery]);

  const sponsorPlacement = useMemo(
    () => SPONSOR_PLACEMENTS.find((placement) => placement.baseId === currentBaseId),
    [currentBaseId],
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

      if (!normalizedSearch) {
        return true;
      }

      const seller = sellerMap[listing.sellerId];
      const haystack = [
        listing.title,
        listing.description,
        listing.category,
        seller?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [activeFilter, currentBaseId, listings, searchQuery]);

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

  const showVerificationBanner = isAuthenticated && !isDodVerified;

  return (
    <section className="space-y-8">
      {showVerificationBanner ? (
        <div className="rounded-3xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Verify DoD access to post and message.
              </p>
              <p className="text-xs text-muted-foreground">
                Use your .mil email, an invite code, or a quick manual check to unlock posting and DMs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold"
                type="button"
                onClick={() => beginVerification("email")}
              >
                .mil email
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold"
                type="button"
                onClick={() => beginVerification("invite")}
              >
                Invite code
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-4 py-1 text-xs font-semibold"
                type="button"
                onClick={() => beginVerification("manual")}
              >
                Manual
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {currentBase.name} classifieds, DoD-only.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">
              Browse verified listings from teammates at {currentBase.name}.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1 font-semibold text-foreground">
                Prohibited content
              </span>
              {PROHIBITED_CONTENT.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-dashed border-border px-3 py-1 capitalize"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-primary transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <span className="sr-only">Verified user policy</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-sm">
              Verified users only. Moderators monitor activity.
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

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
                  <span className="font-medium text-foreground">{searchQuery}</span>
                  ”
                </span>
              </>
            ) : null}
          </div>
        </div>

        <SponsorTile placement={sponsorPlacement} />
      </div>

      {visibleListings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              seller={sellerMap[listing.sellerId]}
            />
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
