import { useEffect, useMemo, useRef, useState } from "react";

import { ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/listings/EmptyState";
import { FilterBar } from "@/components/listings/FilterBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { SponsorTile } from "@/components/listings/SponsorTile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useBaseList } from "@/context/BaseListContext";
import {
  PROHIBITED_CONTENT,
  SELLERS,
  SPONSOR_PLACEMENTS,
  LISTING_CATEGORIES,
} from "@/data/mock";
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
  const { listings, currentBaseId, currentBase, searchQuery } = useBaseList();
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

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                {currentBase.name} classifieds, DoD-only.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Browse verified listings from teammates stationed at {currentBase.name}. Search fast, message securely, and keep every handoff on base.
              </p>
            </div>
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
          <div className="max-w-xs rounded-3xl border border-dashed border-nav-border bg-background/80 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Only verified users can post listings and send messages.
            </p>
            <p className="mt-3">
              Quiet rate limits keep the marketplace fair. Stay professional—moderators are on-call for quick help.
            </p>
          </div>
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
