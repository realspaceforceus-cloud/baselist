import { useState } from "react";
import { Check, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MessageThread, ThreadTransaction } from "@/types";

interface CompletionCardProps {
  thread: MessageThread;
  currentUserId: string;
  onUpdated: (tx: ThreadTransaction) => void;
  partnerName?: string;
}

export const CompletionCard = ({
  thread,
  currentUserId,
  onUpdated,
  partnerName = "User",
}: CompletionCardProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Helper functions for toast notifications
  const showSuccess = (message: string) => {
    toast({
      title: "Success",
      description: message,
    });
  };

  const showError = (message: string) => {
    toast({
      title: "Error",
      description: message,
    });
  };
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const markListingAsSold = async (listingId: string) => {
    try {
      await fetch(`/.netlify/functions/listings/${listingId}/mark-sold`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error marking listing as sold:", error);
      // Don't fail transaction completion if this fails
    }
  };

  const tx = thread.transaction;
  if (!tx) return null;

  const state = tx.state || "open";
  const youAreA = tx.aUserId === currentUserId;
  const youAreB = tx.bUserId === currentUserId;

  const youMarked = (youAreA && !!tx.aMarkedAt) || (youAreB && !!tx.bMarkedAt);
  const otherMarked =
    (youAreA && !!tx.bMarkedAt) || (youAreB && !!tx.aMarkedAt);

  const canMark =
    state === "open" || state === "pending_a" || state === "pending_b";
  const waitingOnYou =
    (state === "pending_a" && youAreB && !tx.bMarkedAt) ||
    (state === "pending_b" && youAreA && !tx.aMarkedAt);

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${thread.id}/transaction/mark-complete`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: currentUserId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to mark complete");
      }

      const data = await response.json();
      // Pass both transaction and full thread for UI to update
      onUpdated(data.transaction || data.thread?.transaction, data.thread);
      showSuccess("Marked complete. Waiting for the other party to confirm.");
    } catch (error) {
      console.error("Error marking complete:", error);
      showError("Failed to mark complete. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${thread.id}/transaction/agree`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId: currentUserId }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to confirm completion");
      }

      const data = await response.json();
      // Pass both transaction and full thread for UI to update
      onUpdated(data.transaction || data.thread?.transaction, data.thread);

      // Mark listing as sold
      if (thread.listingId) {
        await markListingAsSold(thread.listingId);
      }

      showSuccess("Transaction completed! 🎉");
    } catch (error) {
      console.error("Error agreeing to completion:", error);
      showError("Failed to confirm. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisagree = async () => {
    const reason = prompt("Please describe the issue briefly:");
    if (reason === null) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${thread.id}/transaction/disagree`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorId: currentUserId,
            reason,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to open dispute");
      }

      const data = await response.json();
      // Pass both transaction and full thread for UI to update
      onUpdated(data.transaction || data.thread?.transaction, data.thread);
      showSuccess("Dispute opened. An admin will review your case shortly.");
    } catch (error) {
      console.error("Error opening dispute:", error);
      showError("Failed to open dispute. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      showError("Please select a rating.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/.netlify/functions/ratings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: thread.participants?.find(
            (p: string) => p !== currentUserId,
          ),
          rating,
          review: ratingText,
          transactionId: thread.id,
          ratingType: "transaction",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit rating");
      }

      setRatingSubmitted(true);
      showSuccess("Thank you for your feedback!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      showError("Failed to submit rating. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction completed → show final badge with rating option
  if (state === "completed") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                Transaction completed
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                {tx.completedAt
                  ? `Completed on ${new Date(tx.completedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {!ratingSubmitted && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                How was your experience with {partnerName}?
              </p>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const highlighted =
                    hoveredRating !== null
                      ? value <= hoveredRating
                      : rating > 0
                        ? value <= rating
                        : false;
                  return (
                    <button
                      key={value}
                      type="button"
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => setRating(value)}
                      className="rounded-full p-1 outline-none transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-300"
                      aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          highlighted
                            ? "fill-amber-400 text-amber-400"
                            : "text-amber-200",
                        )}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>

              <Textarea
                placeholder="Optional: Share your feedback about this transaction (optional)"
                value={ratingText}
                onChange={(e) => setRatingText(e.target.value)}
                className="min-h-[60px] resize-none border-amber-200 text-xs"
              />

              <Button
                type="button"
                onClick={handleRatingSubmit}
                disabled={isLoading || rating === 0}
                className="w-full"
              >
                Submit Rating
              </Button>
            </div>
          </div>
        )}

        {ratingSubmitted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Thank you for rating {partnerName}! 🙏
            </p>
          </div>
        )}
      </div>
    );
  }

  // Transaction disputed → show dispute info
  if (state === "disputed") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Dispute opened
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Reason: {tx.dispute?.reason || "No reason provided"}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              An admin will review this dispute and contact you with a
              resolution.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Open/pending states → interactive card
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
      {!youMarked && !otherMarked && (
        <div className="mb-3 text-sm text-blue-700 dark:text-blue-300">
          When you've completed the exchange, click "Mark Complete" to proceed.
        </div>
      )}

      {youMarked && !otherMarked && (
        <div className="mb-3 text-sm text-blue-700 dark:text-blue-300">
          You've marked the sale complete. Waiting for the other party to
          confirm...
        </div>
      )}

      {otherMarked && !youMarked && (
        <div className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-100">
          The other party marked the sale complete. Do you agree?
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canMark && !youMarked && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleMarkComplete}
            disabled={isLoading}
          >
            Mark Complete
          </Button>
        )}

        {waitingOnYou && (
          <>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAgree}
              disabled={isLoading}
            >
              Agree
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisagree}
              disabled={isLoading}
            >
              Disagree
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CompletionCard;
