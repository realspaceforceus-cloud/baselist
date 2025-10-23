import { useState } from "react";
import { Check, AlertCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MessageThread, ThreadTransaction } from "@/types";

// Robust fetch helper that always returns structured data
async function jsonFetch(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON error body
  }

  // Debug logging to see why requests fail
  if (!res.ok) {
    console.error("[jsonFetch] Error response:", {
      url: input,
      status: res.status,
      data,
      text: text.substring(0, 500),
    });
  }

  return { ok: res.ok, status: res.status, data, text };
}

interface CompletionCardProps {
  thread: MessageThread;
  currentUserId: string;
  onUpdated: (tx: ThreadTransaction, updatedThread?: MessageThread) => void;
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
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

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

  // Use new contract fields
  const status = tx.status || "open";
  const youMarked = tx.markedCompleteBy === currentUserId;
  const waitingOnYou = status === "pending_confirmation" && !youMarked;

  const handleMarkComplete = async () => {
    setIsLoading(true);
    try {
      const mcUrl = `/.netlify/functions/messages/threads/${thread.id}/transaction/mark-complete`;
      const { ok, status, data, text } = await jsonFetch(mcUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (data?.thread) {
        onUpdated(data.thread.transaction, data.thread);
      }

      if (!ok) {
        // TEMP HOTFIX: Show current thread state even if API returned 400
        // This lets user see if state actually changed despite error
        onUpdated(thread.transaction, thread);

        const msg = data?.error || data?.message || text || `HTTP ${status}`;
        showError(`Failed to mark complete — ${msg}`);
        return;
      }

      showSuccess("Marked complete. Waiting for the other party to confirm.");
    } finally {
      setIsLoading(false);
    }
  };

  // Removed handleAgree and handleDisagree - auto-complete when both mark complete

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      showError("Please select a rating.");
      return;
    }

    setIsLoading(true);
    try {
      const targetUserId = thread.participants?.find(
        (p: string) => p !== currentUserId,
      );

      console.log("[Rating] Preparing to submit:", {
        targetUserId,
        rating,
        review: ratingText,
        transactionId: thread.id,
        currentUserId,
        participants: thread.participants,
      });

      if (!targetUserId) {
        throw new Error(
          "Unable to determine recipient - invalid thread participants",
        );
      }

      const response = await fetch("/.netlify/functions/ratings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          rating,
          review: ratingText,
          transactionId: thread.id,
          ratingType: "transaction",
        }),
      });

      console.log("[Rating] Server response status:", response.status);

      const ratingData = await response.json();
      console.log("[Rating] Response body:", ratingData);

      if (!response.ok) {
        const errorMessage =
          ratingData?.details ||
          ratingData?.originalMessage ||
          ratingData?.error ||
          "Failed to submit rating";
        console.log("[Rating] Using error message:", errorMessage);
        throw new Error(errorMessage);
      }

      setRatingSubmitted(true);
      showSuccess("Thank you for your feedback!");
      // Optionally refresh thread data if endpoint returns it
      if (ratingData.thread && onUpdated) {
        onUpdated(ratingData.thread.transaction, ratingData.thread);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to submit rating";
      console.error("❌ Error submitting rating:", error);
      console.error(
        "Full error stack:",
        error instanceof Error ? error.stack : "no stack",
      );
      console.log(
        "📍 To debug: Check Network tab → ratings request → Response tab",
      );
      // Show more detailed error message to user
      showError(
        `Rating error: ${errorMsg || "Unknown error (check console)"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction completed → show final badge with rating option
  if (status === "completed") {
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
                {isLoading ? "Submitting..." : "Submit Rating"}
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
  if (status === "disputed") {
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
      {status === "open" && (
        <div className="mb-3 text-sm text-blue-700 dark:text-blue-300">
          When you've completed the exchange, click "Mark Complete" to proceed.
        </div>
      )}

      {status === "pending_confirmation" && youMarked && (
        <div className="mb-3 text-sm text-blue-700 dark:text-blue-300">
          You've marked the sale complete. Waiting for the other party to
          confirm...
        </div>
      )}

      {status === "pending_confirmation" && !youMarked && (
        <div className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-100">
          The other party marked the sale complete. Do you agree?
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "open" && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleMarkComplete}
            disabled={isLoading}
          >
            {isLoading ? "Marking..." : "Mark Complete"}
          </Button>
        )}

        {status === "pending_confirmation" && youMarked && (
          <div className="text-sm text-blue-600 dark:text-blue-300">
            Waiting for {partnerName} to mark complete...
          </div>
        )}

        {waitingOnYou && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleMarkComplete}
            disabled={isLoading}
          >
            {isLoading ? "Confirming..." : "Confirm Exchange"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CompletionCard;
