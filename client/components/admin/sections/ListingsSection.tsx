import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Flag,
  RefreshCcw,
  ShieldOff,
  Edit2,
  Save,
  X,
  Eye,
} from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adminApi } from "@/lib/adminApi";

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
  rawPrice?: number;
  sellerUsername?: string;
  baseName?: string;
}

const statusClassName: Record<AdminListingStatus, string> = {
  Active:
    "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success",
  Sold: "rounded-full bg-muted/70 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  Flagged:
    "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning",
  Removed:
    "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive",
};

export const ListingsSection = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AdminListingStatus | "All">(
    "Active",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingPrice, setEditingPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const result = await (
        await import("@/lib/adminApi")
      ).adminApi.getListings();
      const listingRows: AdminListingRow[] = (result?.listings || []).map(
        (listing: any) => ({
          id: listing.id,
          item: listing.title || "Untitled",
          base: listing.baseName || listing.baseId || "Unknown",
          price: listing.price ? `$${listing.price}` : "N/A",
          seller: listing.sellerUsername || listing.sellerId || "Unknown",
          date: listing.createdAt
            ? new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
              }).format(new Date(listing.createdAt))
            : "—",
          status: (listing.status === "active"
            ? "Active"
            : listing.status === "sold"
              ? "Sold"
              : listing.status === "hidden"
                ? "Removed"
                : "Active") as AdminListingStatus,
          reports: listing.reportCount || 0,
          rawPrice: listing.price,
          sellerUsername: listing.sellerUsername,
          baseName: listing.baseName,
        }),
      );
      setListings(listingRows);
    } catch (error) {
      console.error("Failed to load listings:", error);
      toast.error("Failed to load listings");
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleEditListing = (listing: AdminListingRow) => {
    setEditingId(listing.id);
    setEditingTitle(listing.item);
    setEditingPrice(listing.rawPrice?.toString() || "");
  };

  const handleSaveListing = async () => {
    if (!editingId) return;

    if (!editingTitle || !editingPrice) {
      toast.error("Title and price are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.updateListing(editingId, {
        title: editingTitle,
        price: parseFloat(editingPrice),
      });
      setListings((prev) =>
        prev.map((l) =>
          l.id === editingId
            ? {
                ...l,
                item: editingTitle,
                price: `$${parseFloat(editingPrice)}`,
                rawPrice: parseFloat(editingPrice),
              }
            : l,
        ),
      );
      toast.success("Listing updated");
      setEditingId(null);
    } catch (error) {
      console.error("Failed to update listing:", error);
      toast.error("Failed to update listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHideListing = async (listingId: string) => {
    try {
      await adminApi.hideListing(listingId, { reason: "Admin removed" });
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId
            ? { ...l, status: "Removed" as AdminListingStatus }
            : l,
        ),
      );
      toast.success("Listing hidden");
    } catch (error) {
      console.error("Failed to hide listing:", error);
      toast.error("Failed to hide listing");
    }
  };

  const handleRestoreListing = async (listingId: string) => {
    try {
      await adminApi.restoreListing(listingId);
      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId
            ? { ...l, status: "Active" as AdminListingStatus }
            : l,
        ),
      );
      toast.success("Listing restored");
    } catch (error) {
      console.error("Failed to restore listing:", error);
      toast.error("Failed to restore listing");
    }
  };

  const filteredListings = useMemo(() => {
    if (activeFilter === "All") return listings;
    return listings.filter((l) => l.status === activeFilter);
  }, [activeFilter, listings]);

  const filters: Array<AdminListingStatus | "All"> = [
    "Active",
    "Sold",
    "Flagged",
    "Removed",
    "All",
  ];

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
            {filter === "Flagged" ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : null}
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
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {editingId === listing.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="h-8 rounded-lg"
                        disabled={isSubmitting}
                      />
                    ) : (
                      listing.item
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {listing.base}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {editingId === listing.id ? (
                      <Input
                        type="number"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        className="h-8 rounded-lg w-24"
                        disabled={isSubmitting}
                        step="0.01"
                      />
                    ) : (
                      listing.price
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {listing.seller}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {listing.date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusClassName[listing.status]}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {listing.reports}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === listing.id ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-success"
                          onClick={handleSaveListing}
                          disabled={isSubmitting}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg"
                          onClick={() => setEditingId(null)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => handleEditListing(listing)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-destructive text-destructive"
                          disabled={listing.status === "Removed"}
                          onClick={() => handleHideListing(listing.id)}
                        >
                          <ShieldOff className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={listing.status !== "Removed"}
                          onClick={() => handleRestoreListing(listing.id)}
                        >
                          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </Button>
                      </div>
                    )}
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
