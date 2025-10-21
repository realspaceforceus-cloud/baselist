import { useState, useMemo, useEffect } from "react";
import { AlertTriangle, Flag, RefreshCcw, ShieldOff } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";

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

const statusClassName: Record<AdminListingStatus, string> = {
  Active: "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success",
  Sold: "rounded-full bg-muted/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  Flagged: "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning",
  Removed: "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive",
};

export const ListingsSection = () => {
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AdminListingStatus | "All">("Active");

  useEffect(() => {
    setIsLoading(true);
    // TODO: Fetch from API when endpoint is ready
    setListings([]);
    setIsLoading(false);
  }, []);

  const filteredListings = useMemo(() => {
    if (activeFilter === "All") return listings;
    return listings.filter((l) => l.status === activeFilter);
  }, [activeFilter, listings]);

  const filters: Array<AdminListingStatus | "All"> = ["Active", "Sold", "Flagged", "Removed", "All"];

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Listings" subtitle="Manage" accent="Monitor" />

      {/* Filters */}
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
            {filter === "Flagged" ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No listings in this state
        </div>
      ) : (
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
                      <Button variant="outline" size="sm" className="rounded-full">
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Flag className="h-3.5 w-3.5 mr-1" />
                        {listing.status === "Flagged" ? "Clear" : "Flag"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-destructive text-destructive"
                        disabled={listing.status === "Removed"}
                      >
                        <ShieldOff className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={listing.status !== "Removed"}
                      >
                        <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
