import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { SELLERS } from "@/data/mock";
import { useBaseList } from "@/context/BaseListContext";

const ListingDetail = (): JSX.Element => {
  const { listingId } = useParams<{ listingId: string }>();
  const { listings } = useBaseList();

  const listing = useMemo(
    () => listings.find((item) => item.id === listingId),
    [listings, listingId],
  );

  const seller = useMemo(
    () => SELLERS.find((item) => item.id === listing?.sellerId),
    [listing?.sellerId],
  );

  if (!listing) {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
          Listing not found. Browse the home feed for current posts.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">{listing.title}</h1>
        <p className="text-sm text-muted-foreground">
          Detailed photos, seller card, and messaging actions will appear here. Continue refining the spec to unlock the full experience.
        </p>
      </header>
      <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Status
            </dt>
            <dd className="text-sm font-semibold text-foreground">
              {listing.status === "sold" ? "Sold" : "Available"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Seller
            </dt>
            <dd className="text-sm font-semibold text-foreground">
              {seller?.name ?? "Verified member"}
            </dd>
          </div>
        </dl>
      </article>
    </section>
  );
};

export default ListingDetail;
