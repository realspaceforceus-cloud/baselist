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
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

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
      onUpdated(data.transaction);
      toast.success("Marked complete. Waiting for the other party to confirm.");
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Failed to mark complete. Please try again.");
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
      onUpdated(data.transaction);
      toast.success("Transaction completed! 🎉");
    } catch (error) {
      console.error("Error agreeing to completion:", error);
      toast.error("Failed to confirm. Please try again.");
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
      onUpdated(data.transaction);
      toast.success("Dispute opened. An admin will review your case shortly.");
    } catch (error) {
      console.error("Error opening dispute:", error);
      toast.error("Failed to open dispute. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Transaction completed → show final badge
  if (state === "completed") {
    return (
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
