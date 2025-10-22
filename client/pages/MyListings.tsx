import {
  Edit3,
  Eye,
  EyeOff,
  MessageSquare,
  Trash2,
  Check,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBaseList } from "@/context/BaseListContext";
import { useAuth } from "@/context/AuthContext";
import { getUserListings, deleteListing } from "@/lib/listingsApi";
import { generateSlug } from "@/lib/slugUtils";
import { cn } from "@/lib/utils";
import type { Listing, MessageThread } from "@/types";

interface ListingWithOffers extends Listing {
  offers: MessageThread[];
  pendingOfferId?: string;
}

export const MyListings = (): JSX.Element => {
  const {
    listings,
    messageThreads,
    user,
    removeListing,
    initiateTransaction,
    confirmTransactionCompletion,
  } = useBaseList();

  const [expandedListingId, setExpandedListingId] = useState<string | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [acceptOfferDialog, setAcceptOfferDialog] = useState<{
    listingId: string;
    threadId: string;
  } | null>(null);

  const myListings = useMemo<ListingWithOffers[]>(() => {
    if (!user?.id) {
      return [];
    }

    try {
      return listings
        .filter((listing) => listing.sellerId === user.id)
        .map((listing) => {
          const offers = messageThreads.filter(
            (thread) =>
              thread.listingId === listing.id &&
              thread.participants.includes(user.id),
          );

          // Find if there's a pending transaction
          const pendingThread = offers.find(
            (thread) =>
              thread.transaction?.status === "pending_complete" ||
              thread.transaction?.status === "pending_confirmation" ||
              thread.status === "completed",
          );

          return {
            ...listing,
            offers,
            pendingOfferId: pendingThread?.id,
          };
        });
    } catch (error) {
      console.error("Error processing listings:", error);
      return [];
    }
  }, [listings, messageThreads, user?.id]);

  const handleAcceptOffer = (listingId: string, threadId: string) => {
    try {
      initiateTransaction(threadId, user.id);
      toast.success("Offer accepted! Waiting for buyer confirmation.");
    } catch (error) {
      toast.error("Unable to accept offer");
    }
  };

  const handleRejectOffer = (threadId: string) => {
    toast.info("Offer rejected", {
      description: "The buyer has been notified.",
    });
  };

  const handleDeleteListing = async (listingId: string) => {
    try {
      await removeListing(listingId);
      setDeleteConfirm(null);
      toast.success("Listing deleted successfully");
    } catch (error) {
      console.error("Delete listing error:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Unable to delete listing";
      toast.error(errorMsg);
      setDeleteConfirm(null);
    }
  };

  const getListingStatus = (listing: ListingWithOffers) => {
    if (listing.status === "sold") {
      return { label: "Sold", color: "text-emerald-600" };
    }
    if (listing.pendingOfferId) {
      return { label: "Pending Sale", color: "text-amber-600" };
    }
    return { label: "Active", color: "text-green-600" };
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">My Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your items and offers
        </p>
      </div>

      {myListings.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              No listings yet
            </h2>
          </div>
          <Button asChild className="rounded-full px-6">
            <Link to="/post">Create your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {myListings.map((listing) => {
            const isExpanded = expandedListingId === listing.id;
            const status = getListingStatus(listing);

            return (
              <div
                key={listing.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted">
                    {listing.imageUrls?.[0] ? (
                      <img
                        src={listing.imageUrls[0]}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MessageSquare className="h-full w-full p-3 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate font-semibold text-foreground">
                          {listing.title}
                        </h3>
                        <p className="text-sm font-semibold text-primary">
                          {listing.isFree
                            ? "Free"
                            : `$${listing.price.toLocaleString()}`}
                        </p>
                      </div>
                      <span
                        className={cn("text-xs font-semibold", status.color)}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 text-xs"
                        asChild
                      >
                        <Link
                          to={`/listing/${generateSlug(listing.title, listing.id)}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 text-xs"
                        asChild
                        disabled={listing.status === "sold"}
                      >
                        <Link to={`/post?edit=${listing.id}`}>
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(listing.id)}
                        disabled={listing.status === "sold"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                      {listing.offers.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg h-8 text-xs"
                          onClick={() =>
                            setExpandedListingId(isExpanded ? null : listing.id)
                          }
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Offers ({listing.offers.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && listing.offers.length > 0 && (
                  <div className="mt-4 border-t border-border pt-4 space-y-2">
                    {listing.offers.map((thread) => {
                      const buyer = thread.participants.find(
                        (p) => p !== user.id,
                      );
                      const lastMessage =
                        thread.messages[thread.messages.length - 1];
                      const isPending =
                        thread.transaction?.status === "pending_complete" ||
                        thread.transaction?.status === "pending_confirmation";

                      return (
                        <div
                          key={thread.id}
                          className={cn(
                            "rounded-lg border border-border bg-muted/30 p-3 text-xs",
                            isPending && "border-amber-200 bg-amber-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                Offer from {buyer}
                              </p>
                              {lastMessage && (
                                <p className="text-muted-foreground line-clamp-1 mt-0.5">
                                  {lastMessage.body}
                                </p>
                              )}
                              {isPending && (
                                <p className="mt-1 flex items-center gap-1 text-amber-700 font-medium">
                                  <Clock className="h-3 w-3" />
                                  Waiting for buyer confirmation
                                </p>
                              )}
                            </div>

                            {!isPending && (
                              <div className="flex gap-1 flex-shrink-0">
                                <Button
                                  size="sm"
                                  className="h-7 w-7 rounded-lg p-0 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() =>
                                    setAcceptOfferDialog({
                                      listingId: listing.id,
                                      threadId: thread.id,
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden />
                                  <span className="sr-only">Accept</span>
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 w-7 rounded-lg p-0 bg-destructive hover:bg-destructive/90"
                                  onClick={() => handleRejectOffer(thread.id)}
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden />
                                  <span className="sr-only">Reject</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The listing will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirm && handleDeleteListing(deleteConfirm)
              }
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={acceptOfferDialog !== null}
        onOpenChange={(open) => !open && setAcceptOfferDialog(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Accept this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              Once accepted, the listing will be marked as pending sale. The
              buyer will need to confirm to complete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (acceptOfferDialog) {
                  handleAcceptOffer(
                    acceptOfferDialog.listingId,
                    acceptOfferDialog.threadId,
                  );
                  setAcceptOfferDialog(null);
                }
              }}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              Accept offer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default MyListings;
