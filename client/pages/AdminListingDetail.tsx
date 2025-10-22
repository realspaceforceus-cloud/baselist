import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Save, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/adminApi";

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  category: string;
  status: string;
  sellerId: string;
  sellerUsername: string;
  baseId: string;
  baseName: string;
  imageUrls: string[];
  promoted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Report {
  id: string;
  type: string;
  status: string;
  description: string;
  reportedBy: string;
  createdAt: string;
}

export default function AdminListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [messageThreadCount, setMessageThreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editData, setEditData] = useState({
    title: "",
    description: "",
    price: "",
    isFree: false,
    category: "",
    baseId: "",
    promoted: false,
  });

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    if (!listingId) return;

    setIsLoading(true);
    try {
      const result = await adminApi.getListingDetail(listingId);

      // Transform snake_case from database to camelCase
      const transformedListing = {
        ...result.listing,
        createdAt: result.listing.createdAt || result.listing.created_at,
        updatedAt: result.listing.updatedAt || result.listing.updated_at,
        isFree: result.listing.isFree || result.listing.is_free || false,
        sellerId: result.listing.sellerId || result.listing.seller_id,
        sellerUsername: result.listing.sellerUsername || result.listing.seller_username,
        baseId: result.listing.baseId || result.listing.base_id,
        baseName: result.listing.baseName || result.listing.base_name,
        imageUrls: result.listing.imageUrls || result.listing.image_urls,
      };

      setListing(transformedListing);
      setReports(result.reports || []);
      setMessageThreadCount(result.messageThreadCount || 0);

      setEditData({
        title: transformedListing.title || "",
        description: transformedListing.description || "",
        price: transformedListing.price?.toString() || "",
        isFree: transformedListing.isFree || false,
        category: transformedListing.category || "",
        baseId: transformedListing.baseId || "",
        promoted: transformedListing.promoted || false,
      });
    } catch (error) {
      console.error("Failed to load listing:", error);
      toast.error("Failed to load listing details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!listingId || !listing) return;

    if (!editData.title || (!editData.isFree && !editData.price)) {
      toast.error("Title and price (or mark as free) are required");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        title: editData.title,
        description: editData.description,
        price: editData.isFree ? 0 : parseFloat(editData.price),
        isFree: editData.isFree,
        category: editData.category,
        baseId: editData.baseId,
        promoted: editData.promoted,
      };

      const result = await adminApi.updateListing(listingId, updates);
      setListing(result.listing);
      setIsEditing(false);
      toast.success("Listing updated successfully");
    } catch (error) {
      console.error("Failed to save listing:", error);
      toast.error("Failed to save listing");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (listing) {
      setEditData({
        title: listing.title || "",
        description: listing.description || "",
        price: listing.price?.toString() || "",
        isFree: listing.isFree || false,
        category: listing.category || "",
        baseId: listing.baseId || "",
        promoted: listing.promoted || false,
      });
    }
    setIsEditing(false);
  };

  const handleHideListing = async () => {
    if (!listingId) return;

    if (!confirm("Are you sure you want to hide this listing?")) return;

    try {
      await adminApi.hideListing(listingId, { reason: "Admin removed" });
      toast.success("Listing hidden");
      navigate("/admin?section=listings");
    } catch (error) {
      console.error("Failed to hide listing:", error);
      toast.error("Failed to hide listing");
    }
  };

  const handleRestoreListing = async () => {
    if (!listingId) return;

    try {
      await adminApi.restoreListing(listingId);
      toast.success("Listing restored");
      await loadListing();
    } catch (error) {
      console.error("Failed to restore listing:", error);
      toast.error("Failed to restore listing");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
            Loading listing details...
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin?section=listings")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
            Listing not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin?section=listings")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>

          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Listing
            </Button>
          )}
        </div>

        {/* Main Content */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? (
                <Input
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  className="text-2xl font-bold rounded-lg"
                  disabled={isSaving}
                />
              ) : (
                listing.title
              )}
            </h1>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                listing.status === "active"
                  ? "bg-success/10 text-success"
                  : listing.status === "sold"
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {listing.status}
            </span>
          </div>

          {/* Seller & Base Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Seller
              </Label>
              <p className="text-foreground font-medium">
                {listing.sellerUsername}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Base
              </Label>
              <p className="text-foreground font-medium">{listing.baseName}</p>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Price
            </Label>
            {isEditing ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={editData.price}
                    onChange={(e) =>
                      setEditData({ ...editData, price: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    disabled={editData.isFree || isSaving}
                    className="rounded-lg"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.isFree}
                    onChange={(e) =>
                      setEditData({ ...editData, isFree: e.target.checked })
                    }
                    disabled={isSaving}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Free</span>
                </label>
              </div>
            ) : (
              <p className="text-lg font-semibold text-foreground">
                {listing.isFree ? "Free" : `$${listing.price}`}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Category
            </Label>
            {isEditing ? (
              <Input
                value={editData.category}
                onChange={(e) =>
                  setEditData({ ...editData, category: e.target.value })
                }
                placeholder="e.g., Furniture, Electronics"
                className="rounded-lg"
                disabled={isSaving}
              />
            ) : (
              <p className="text-foreground">{listing.category || "—"}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Description
            </Label>
            {isEditing ? (
              <Textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                placeholder="Describe the item..."
                className="rounded-lg min-h-32"
                disabled={isSaving}
              />
            ) : (
              <p className="text-foreground whitespace-pre-wrap">
                {listing.description || "—"}
              </p>
            )}
          </div>

          {/* Images */}
          {listing.imageUrls && listing.imageUrls.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">
                Images ({listing.imageUrls.length})
              </Label>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {listing.imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={url}
                      alt={`Listing image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Promoted & Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {isEditing ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.promoted}
                    onChange={(e) =>
                      setEditData({ ...editData, promoted: e.target.checked })
                    }
                    disabled={isSaving}
                    className="rounded"
                  />
                  <span className="text-sm font-semibold">Promoted</span>
                </label>
              ) : (
                <>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">
                    Promoted
                  </Label>
                  <p className="text-foreground">
                    {listing.promoted ? "Yes" : "No"}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="pt-4 border-t border-border space-y-2 text-sm text-muted-foreground">
            <p>
              Created:{" "}
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(listing.createdAt))}
            </p>
            <p>
              Updated:{" "}
              {new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(listing.updatedAt))}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="rounded-lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}

        {/* Listing Actions */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Listing Actions
          </h3>
          <div className="flex gap-2 flex-wrap">
            {listing.status === "active" && (
              <Button
                variant="outline"
                onClick={handleHideListing}
                className="rounded-lg border-destructive text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hide Listing
              </Button>
            )}
            {listing.status === "hidden" && (
              <Button
                variant="outline"
                onClick={handleRestoreListing}
                className="rounded-lg"
              >
                Restore Listing
              </Button>
            )}
          </div>
        </div>

        {/* Reports Section */}
        {reports.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Reports ({reports.length})
            </h3>
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg bg-muted/50 border border-border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {report.type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reported by {report.reportedBy}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${
                        report.status === "open"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-sm text-foreground">
                      {report.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Threads */}
        {messageThreadCount > 0 && (
          <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Message Threads ({messageThreadCount})
            </h3>
            <p className="text-muted-foreground">
              {messageThreadCount} conversation
              {messageThreadCount !== 1 ? "s" : ""} about this listing
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
