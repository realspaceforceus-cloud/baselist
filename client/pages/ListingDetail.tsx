import {
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  Flag,
  Check,
  Heart,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ImageGallery } from "@/components/listings/ImageGallery";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useBaseList } from "@/context/BaseListContext";
import { extractIdFromSlug, generateSlug } from "@/lib/slugUtils";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types";

const ListingDetail = (): JSX.Element => {
  const navigate = useNavigate();
  const { listingSlug } = useParams<{ listingSlug: string }>();
  const {
    listings,
    bases,
    sendMessageToSeller,
    setSearchQuery,
    setCurrentBaseId,
  } = useBaseList();

  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [fetchedListing, setFetchedListing] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Extract actual ID from slug
  const actualListingId = useMemo(() => {
    if (!listingSlug) return null;

    if (listingSlug.includes("-") && listingSlug.split("-").length > 1) {
      return extractIdFromSlug(listingSlug);
    }

    return listingSlug;
  }, [listingSlug]);

  const listing = useMemo(() => {
    if (!actualListingId) return null;
    return (
      listings.find(
        (item) =>
          item.id === actualListingId || item.id.includes(actualListingId),
      ) || fetchedListing
    );
  }, [listings, actualListingId, fetchedListing]);

  // Redirect to slug URL if listing is found
  useEffect(() => {
    if (listing && listingSlug && !listingSlug.includes("-")) {
      const slug = generateSlug(listing.title, listing.id);
      if (slug !== listingSlug) {
        navigate(`/listing/${slug}`, { replace: true });
      }
    }
  }, [listing, listingSlug, navigate]);

  // Fetch listing from backend if not in local context
  useEffect(() => {
    if (!actualListingId) {
      setIsLoading(false);
      return;
    }

    if (
      listings.find(
        (item) =>
          item.id === actualListingId || item.id.includes(actualListingId),
      )
    ) {
      setIsLoading(false);
      return;
    }

    const fetchListing = async () => {
      try {
        const response = await fetch(
          `/.netlify/functions/listings/${actualListingId}`,
          {
            credentials: "include",
          },
        );
        if (response.ok) {
          const data = await response.json();
          setFetchedListing(data);
        }
      } catch (error) {
        console.error("Failed to fetch listing:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [actualListingId, listings]);

  // Fetch seller info from backend
  useEffect(() => {
    if (!listing?.sellerId) {
      setSeller(null);
      return;
    }

    const fetchSeller = async () => {
      try {
        const response = await fetch(
          `/.netlify/functions/users/${listing.sellerId}`,
          {
            credentials: "include",
          },
        );
        if (response.ok) {
          const sellerData = await response.json();
          setSeller(sellerData);
        }
      } catch (error) {
        console.error("Failed to fetch seller:", error);
      }
    };

    fetchSeller();
  }, [listing?.sellerId]);

  // Check if listing is saved
  useEffect(() => {
    if (!listing?.id) {
      return;
    }

    const checkIfSaved = async () => {
      try {
        const response = await fetch("/.netlify/functions/saved-listings", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const savedIds = data.savedListingIds || [];
          setIsSaved(savedIds.includes(listing.id));
        }
      } catch (error) {
        console.error("Failed to check saved status:", error);
      }
    };

    checkIfSaved();
  }, [listing?.id]);

  const listingBase = useMemo(
    () => bases.find((base) => base.id === listing?.baseId),
    [bases, listing?.baseId],
  );

  const sellerFirstName = useMemo(
    () => seller?.name?.split(" ")[0] ?? "there",
    [seller?.name],
  );

  const defaultMessage = useMemo(
    () => `Hi ${sellerFirstName}, is this still available?`,
    [sellerFirstName],
  );

  const handleOpenComposer = useCallback(() => {
    setMessageBody(defaultMessage);
    setComposerOpen(true);
  }, [defaultMessage]);

  const handleSendMessage = useCallback(() => {
    if (!listing) {
      toast.error("Listing not found");
      return;
    }

    const trimmed = messageBody.trim();
    if (!trimmed) {
      return;
    }

    const thread = sendMessageToSeller(listing.id, listing.sellerId, trimmed);

    toast.success("Message sent", {
      description: `Chatting with ${seller?.name ?? "the seller"} is ready to go.`,
    });

    setComposerOpen(false);
    setMessageBody("");
    navigate(`/messages/${thread.id}`);
  }, [listing, messageBody, navigate, sendMessageToSeller, seller?.name]);

  const handleViewSellerListings = useCallback(() => {
    if (!seller || !listing) {
      return;
    }
    setCurrentBaseId(listing.baseId);
    setSearchQuery(seller.name);
    navigate("/");
  }, [navigate, seller, listing, setCurrentBaseId, setSearchQuery]);

  const handleSaveListing = useCallback(async () => {
    if (!listing) {
      toast.error("Listing not found");
      return;
    }

    try {
      setIsLoadingSave(true);
      const method = isSaved ? "DELETE" : "POST";
      const response = await fetch(
        `/.netlify/functions/saved-listings/${listing.id}`,
        {
          method,
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save listing");
      }

      setIsSaved(!isSaved);
      toast.success(isSaved ? "Listing removed from saves" : "Listing saved!", {
        description: isSaved
          ? "You can find it in your saves later."
          : "Check your saves anytime from your profile.",
      });
    } catch (error) {
      toast.error("Unable to save listing");
    } finally {
      setIsLoadingSave(false);
    }
  }, [listing, isSaved]);

  const handleReportListing = useCallback(async () => {
    if (!reportReason.trim()) {
      toast.error("Please provide a reason for the report");
      return;
    }

    try {
      const response = await fetch("/.netlify/functions/reports", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "listing",
          targetId: listing.id,
          type: "Inappropriate Content",
          notes: reportReason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      setReportDialogOpen(false);
      setReportReason("");
      toast.success("Report submitted", {
        description: "Thank you for helping keep the community safe.",
      });
    } catch (error) {
      toast.error("Unable to submit report");
    }
  }, [listing.id, reportReason]);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <Button
          variant="ghost"
          className="-ml-2 w-fit gap-2 rounded-full px-3"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
          Loading listing...
        </div>
      </section>
    );
  }

  if (!listing) {
    return (
      <section className="space-y-4">
        <Button
          variant="ghost"
          className="-ml-2 w-fit gap-2 rounded-full px-3"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
          Listing not found. Browse the home feed for current posts.
        </div>
      </section>
    );
  }

  const formattedPrice =
    listing.isFree || listing.price === 0
      ? "Free"
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(listing.price);

  const listedRelative = formatDistanceToNow(new Date(listing.postedAt), {
    addSuffix: true,
  });

  const sellerLastActive = useMemo(
    () =>
      seller?.lastActiveAt
        ? differenceInHours(new Date(), new Date(seller.lastActiveAt)) <= 24
          ? "Active today ✅"
          : `Active ${formatDistanceToNow(new Date(seller.lastActiveAt), {
              addSuffix: true,
            })} 🕓`
        : undefined,
    [seller],
  );

  const sellerYear = useMemo(
    () =>
      seller?.memberSince ? new Date(seller.memberSince).getFullYear() : null,
    [seller],
  );

  return (
    <section className="space-y-6">
      <Button
        variant="ghost"
        className="-ml-2 w-fit gap-2 rounded-full px-3"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </Button>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <ImageGallery images={listing.imageUrls} title={listing.title} />
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="space-y-4">
              {seller && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {seller.avatarUrl ? (
                      <img
                        src={seller.avatarUrl}
                        alt={seller.name}
                        className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary flex-shrink-0">
                        {seller.name?.[0]?.toUpperCase() ?? "M"}
                      </span>
                    )}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">
                          {seller.name}
                        </h3>
                        {seller.verified && (
                          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-950/30 rounded-full px-2 py-1">
                            <Check
                              className="h-3 w-3 text-green-600"
                              aria-hidden
                              title="Verified DoW Member"
                            />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                              Verified
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {sellerYear && (
                          <p>
                            Member since{" "}
                            <span className="font-medium text-foreground">
                              {sellerYear}
                            </span>
                          </p>
                        )}
                        {seller.rating ? (
                          <p>
                            <span aria-hidden>⭐</span>{" "}
                            <span className="font-medium text-foreground">
                              {seller.rating.toFixed(1)}
                            </span>{" "}
                            from {seller.ratingCount}{" "}
                            {seller.ratingCount === 1 ? "sale" : "sales"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No ratings yet
                          </p>
                        )}
                        {sellerLastActive && (
                          <p className="text-xs text-muted-foreground">
                            {sellerLastActive}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportDialogOpen(true)}
                    className="rounded-lg p-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition flex-shrink-0"
                    aria-label="Report listing"
                    title="Report this listing"
                  >
                    <Flag
                      className="h-5 w-5 text-red-600 dark:text-red-400"
                      aria-hidden
                    />
                  </button>
                </div>
              )}

              <div className="border-t border-border" />

              <div>
                <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                  {listing.title}
                </h1>
              </div>

              <div className="space-y-2">
                <p className="text-2xl font-bold text-primary">
                  {formattedPrice}
                </p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>
                    Listed{" "}
                    <span className="font-medium text-foreground">
                      {listedRelative}
                    </span>
                  </p>
                  <p>
                    Location:{" "}
                    <span className="font-medium text-foreground">
                      {listingBase?.name ?? "On-base"}
                    </span>
                  </p>
                </div>
              </div>

              {listing.description && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm leading-relaxed dark:text-white whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-4">
                <Button
                  className="w-full rounded-full"
                  onClick={handleOpenComposer}
                  disabled={!seller}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Message seller
                </Button>
                <Button
                  variant={isSaved ? "default" : "outline"}
                  className="w-full rounded-full"
                  onClick={handleSaveListing}
                  disabled={isLoadingSave}
                >
                  <Heart
                    className={cn("h-4 w-4", isSaved ? "fill-current" : "")}
                    aria-hidden
                  />
                  {isSaved ? "Saved" : "Save listing"}
                </Button>
              </div>
            </div>
          </article>
        </aside>
      </div>

      <Sheet open={isComposerOpen} onOpenChange={setComposerOpen}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[80vh] rounded-t-3xl border border-border bg-card px-6 pb-6 pt-8"
        >
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="text-lg font-semibold text-foreground">
              Message {seller?.name ?? "seller"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Send a quick note to confirm availability and handoff details.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{listing.title}</p>
              <p>{formattedPrice}</p>
            </div>
            <Textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              rows={4}
              className="rounded-2xl border-border text-sm"
              aria-label="Message to seller"
              placeholder="Hi, is this still available?"
            />
          </div>
          <SheetFooter className="mt-6">
            <Button
              className="w-full rounded-full"
              size="lg"
              onClick={handleSendMessage}
              disabled={!messageBody.trim()}
            >
              Send message
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[80vh] rounded-t-3xl border border-border bg-card px-6 pb-6 pt-8"
        >
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" aria-hidden />
              Report this listing
            </SheetTitle>
            <p className="text-sm text-muted-foreground">
              Help us keep the community safe by reporting inappropriate content
              or suspicious activity.
            </p>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{listing.title}</p>
              <p>{formattedPrice}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Reason for report
              </label>
              <Textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                rows={4}
                className="rounded-2xl border-border text-sm"
                aria-label="Report reason"
                placeholder="Please explain why you're reporting this listing..."
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              className="w-full rounded-full"
              size="lg"
              onClick={() => setReportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full rounded-full bg-red-600 hover:bg-red-700"
              size="lg"
              onClick={handleReportListing}
              disabled={!reportReason.trim()}
            >
              Submit report
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
};

export default ListingDetail;
