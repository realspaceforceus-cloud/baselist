import {
  ArrowLeft,
  Bookmark,
  Flag,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

  // Extract actual ID from slug (slug format: "title-slug-12345678")
  const actualListingId = useMemo(() => {
    if (!listingSlug) return null;

    // Check if it's a UUID (old format) or slug (new format)
    if (listingSlug.includes("-") && listingSlug.split("-").length > 1) {
      // It's a slug, extract the ID
      return extractIdFromSlug(listingSlug);
    }

    // It's already an ID
    return listingSlug;
  }, [listingSlug]);

  const listing = useMemo(() => {
    if (!actualListingId) return null;
    // Search by ID or ID prefix (for short slug support)
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

  const listingBase = useMemo(
    () => bases.find((base) => base.id === listing?.baseId),
    [bases, listing?.baseId],
  );

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

  const sellerFirstName = seller?.name?.split(" ")[0] ?? "there";
  const defaultMessage = `Hi ${sellerFirstName}, is this still available?`;

  // Update message body when default message changes
  useEffect(() => {
    setMessageBody(defaultMessage);
  }, [defaultMessage]);

  const sellerLastActive = seller?.lastActiveAt
    ? differenceInHours(new Date(), new Date(seller.lastActiveAt)) <= 24
      ? "Active today ✅"
      : `Active ${formatDistanceToNow(new Date(seller.lastActiveAt), {
          addSuffix: true,
        })} 🕓`
    : undefined;

  const handleOpenComposer = useCallback(() => {
    setMessageBody(defaultMessage);
    setComposerOpen(true);
  }, [defaultMessage]);

  const handleSendMessage = useCallback(() => {
    const trimmed = messageBody.trim();
    if (!trimmed) {
      return;
    }

    const thread = sendMessageToSeller(listing.id, listing.sellerId, trimmed);

    toast.success("Message sent", {
      description: `Chatting with ${seller?.name ?? "the seller"} is ready to go.`,
    });

    setComposerOpen(false);
    setMessageBody(defaultMessage);
    navigate(`/messages/${thread.id}`);
  }, [
    defaultMessage,
    listing.id,
    listing.sellerId,
    messageBody,
    navigate,
    sendMessageToSeller,
    seller?.name,
  ]);

  const handleViewSellerListings = useCallback(() => {
    if (!seller) {
      return;
    }
    setCurrentBaseId(listing.baseId);
    setSearchQuery(seller.name);
    navigate("/");
  }, [navigate, seller, setCurrentBaseId, setSearchQuery, listing.baseId]);

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
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            <img
              src={listing.imageUrls[0]}
              alt={`${listing.title} primary photo`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
            Swipeable gallery, additional photos, and status chips will render
            here once the detail page is fully built.
          </div>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                {listing.title}
              </h1>
              <div>
                <p className="text-xl font-semibold text-primary md:text-2xl">
                  {formattedPrice}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Listed {listedRelative} · {listingBase?.name ?? "On-base"}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {listing.description}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              {seller?.avatarUrl ? (
                <img
                  src={seller.avatarUrl}
                  alt={seller.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
                  {seller?.name?.[0] ?? "B"}
                </span>
              )}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleViewSellerListings}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary hover:underline"
                >
                  <span>{seller?.name ?? "Verified member"}</span>
                  {seller?.rating ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <span aria-hidden>⭐</span>
                      {seller.rating.toFixed(1)}
                    </span>
                  ) : null}
                  <ShieldCheck className="h-4 w-4 text-verified" aria-hidden />
                </button>
                <p className="text-xs text-muted-foreground">
                  Verified DoW Member
                </p>
                <p className="text-xs text-muted-foreground">
                  Member since{" "}
                  {seller ? new Date(seller.memberSince).getFullYear() : "2020"}
                </p>
                {sellerLastActive ? (
                  <p className="text-xs text-muted-foreground">
                    {sellerLastActive}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Button
                className="w-full rounded-full"
                onClick={handleOpenComposer}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Message seller
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full"
                disabled
              >
                <Bookmark className="h-4 w-4" aria-hidden />
                Save listing
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-full text-destructive hover:text-destructive"
                disabled
              >
                <Flag className="h-4 w-4" aria-hidden />
                Report
              </Button>
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
    </section>
  );
};

export default ListingDetail;
