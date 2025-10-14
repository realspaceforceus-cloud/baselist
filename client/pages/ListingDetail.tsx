import { ArrowLeft, Bookmark, Flag, MessageCircle, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Flag, MessageCircle, ShieldCheck } from "lucide-react";
import { differenceInHours, formatDistanceToNow } from "date-fns";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { SELLERS } from "@/data/mock";
import { useBaseList } from "@/context/BaseListContext";

const ListingDetail = (): JSX.Element => {
  const navigate = useNavigate();
  const { listingId } = useParams<{ listingId: string }>();
  const {
    listings,
    bases,
    sendMessageToSeller,
    setSearchQuery,
    setCurrentBaseId,
  } = useBaseList();

  const listing = useMemo(
    () => listings.find((item) => item.id === listingId),
    [listings, listingId],
  );

  const seller = useMemo(
    () => SELLERS.find((item) => item.id === listing?.sellerId),
    [listing?.sellerId],
  );

  const listingBase = useMemo(
    () => bases.find((base) => base.id === listing?.baseId),
    [bases, listing?.baseId],
  );

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

  const formattedPrice = listing.isFree || listing.price === 0
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

  const [isComposerOpen, setComposerOpen] = useState(false);
  const [messageBody, setMessageBody] = useState(defaultMessage);

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

    sendMessageToSeller(listing.id, listing.sellerId, trimmed);

    toast.success("Message sent", {
      description: `We created a thread with ${seller?.name ?? "the seller"}.`,
      action: {
        label: "Open messages",
        onClick: () => navigate("/messages"),
      },
    });

    setComposerOpen(false);
  }, [
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
            Swipeable gallery, additional photos, and status chips will render here once the detail page is fully built.
          </div>
        </div>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h1 className="text-2xl font-semibold text-foreground">{listing.title}</h1>
            <p className="mt-2 text-lg font-semibold text-primary">{formattedPrice}</p>
            <p className="mt-4 text-sm text-muted-foreground">{listing.description}</p>
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
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {seller?.name ?? "Verified member"}
                  <ShieldCheck className="h-4 w-4 text-verified" aria-hidden />
                </p>
                <p className="text-xs text-muted-foreground">
                  Member since {seller ? new Date(seller.memberSince).getFullYear() : "2020"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Button asChild className="w-full rounded-full">
                <Link to="/messages">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Message seller
                </Link>
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
    </section>
  );
};

export default ListingDetail;
