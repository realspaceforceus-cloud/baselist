import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Eye, Flag, RefreshCcw, ShieldOff } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export type AdminListingStatus = "Active" | "Sold" | "Flagged" | "Removed";

export interface AdminListingRow {
  id: string;
  item: string;
  base: string;
  price: string;
  seller: string;
  date: string;
  status: AdminListingStatus;
  reports: number;
}

interface ListingsSectionProps {
  listings: AdminListingRow[];
  onView: (listingId: string) => void;
  onRemove: (listingId: string) => void;
  onRestore: (listingId: string) => void;
  onInspectMessages: (listingId: string) => void;
  onToggleFlag: (listingId: string) => void;
}

const statusClassName: Record<AdminListingStatus, string> = {
  Active:
    "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success",
  Sold:
    "rounded-full bg-muted/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  Flagged:
    "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning",
  Removed:
    "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive",
};

const filters: Array<AdminListingStatus | "All"> = ["Active", "Sold", "Flagged", "Removed", "All"];

export const ListingsSection = ({
  listings,
  onView,
  onRemove,
  onRestore,
  onInspectMessages,
  onToggleFlag,
}: ListingsSectionProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<AdminListingStatus | "All">("Active");

  const filteredListings = useMemo(() => {
    if (activeFilter === "All") {
      return listings;
    }
    return listings.filter((listing) => listing.status === activeFilter);
  }, [activeFilter, listings]);

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Listings Oversight" subtitle="Listings" accent="Monitor" />
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={
              activeFilter === filter
                ? "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-card"
                : "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
            }
          >
            {filter}
            {filter === "Flagged" ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Base</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Reports</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card/80">
            {filteredListings.map((listing) => (
              <tr key={listing.id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-semibold text-foreground">{listing.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.base}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.price}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.seller}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.date}</td>
                <td className="px-4 py-3">
                  <span className={statusClassName[listing.status]}>{listing.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{listing.reports}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      className="rounded-full border border-border px-3 py-1"
                      onClick={() => onView(listing.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
                      onClick={() => onToggleFlag(listing.id)}
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden />
                      {listing.status === "Flagged" ? "Clear flag" : "Flag"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive disabled:opacity-60"
                      onClick={() => onRemove(listing.id)}
                      disabled={listing.status === "Removed"}
                    >
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 disabled:opacity-60"
                      onClick={() => onRestore(listing.id)}
                      disabled={listing.status !== "Removed"}
                    >
                      <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                      Restore
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
                      onClick={() => onInspectMessages(listing.id)}
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                      Messages
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredListings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No listings in this state.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5 text-primary" aria-hidden /> Listings with more than two verified reports auto-hide until review completes.
      </p>
    </section>
  );
};
