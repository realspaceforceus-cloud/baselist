import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Dot,
  EllipsisVertical,
  MessageSquare,
  MessageSquarePlus,
  Star,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { RatingBadge } from "@/components/shared/RatingBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateSlug } from "@/lib/slugUtils";
import { cn } from "@/lib/utils";
import { getThreads } from "@/lib/messagesApi";
import type { Listing, Message, MessageThread, UserProfile } from "@/types";

const ratingOptions = [1, 2, 3, 4, 5];

const statusFilterOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

const typeFilterOptions = [
  { value: "all-types", label: "All Messages" },
  { value: "marketplace", label: "Marketplace" },
  { value: "dm", label: "Direct Messages" },
] as const;

type ThreadFilter = (typeof statusFilterOptions)[number]["value"];
type ThreadTypeFilter = (typeof typeFilterOptions)[number]["value"];
type ThreadSummaryStatus = "active" | "completed" | "archived";

interface ThreadSummary {
  thread: MessageThread;
  listing: Listing | undefined;
  seller: UserProfile | undefined;
  partnerId: string | undefined;
  partnerName: string;
  lastMessage: Message | undefined;
  lastUpdated: string;
  unread: boolean;
  defaultComposerMessage: string;
  userStatus: ThreadSummaryStatus;
  isArchived: boolean;
  isCompleted: boolean;
  transaction: MessageThread["transaction"];
  awaitingUserConfirmation: boolean;
  userMarkedComplete: boolean;
  ratingSubmitted: boolean;
  canSubmitRating: boolean;
  isMarketplace: boolean;
}

const Messages = (): JSX.Element => {
  const {
    listings,
    user,
    markThreadAsRead,
    sendMessageToSeller,
    initiateTransaction,
    markTransactionComplete,
    confirmTransactionCompletion,
    raiseDispute,
    autoCompleteTransaction,
    submitTransactionRating,
    archiveThread,
    unarchiveThread,
    deleteThread,
    getUserRatingSummary,
    getMemberName,
  } = useBaseList();

  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  const isMobile = useIsMobile();

  const conversationRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastThreadIdRef = useRef<string | null>(null);

  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [composerMessage, setComposerMessage] = useState<string>("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("active");
  const [typeFilter, setTypeFilter] = useState<ThreadTypeFilter>("all-types");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [dismissedThreadIds, setDismissedThreadIds] = useState<Set<string>>(
    new Set(),
  );

  // Fetch threads from API on mount
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoadingThreads(true);
        const response = await getThreads(50, 0);
        setMessageThreads(response.threads || []);
      } catch (error) {
        console.error("Failed to fetch message threads:", error);
      } finally {
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
  }, [user?.id]);

  const threadSummaries = useMemo<ThreadSummary[]>(() => {
    return messageThreads
      .map((thread: any) => {
        if (thread.deletedBy?.includes(user.id)) {
          return null;
        }

        // Use listing from thread (fetched from backend) or fallback to context
        const listing =
          thread.listing ||
          listings.find((item) => item.id === thread.listingId);
        const partnerId = thread.participants?.find(
          (participant: string) => participant !== user.id,
        );
        // Use partner data from backend
        const seller = thread.partner
          ? {
              id: thread.partner.id,
              name: thread.partner.username,
              username: thread.partner.username,
              avatarUrl: thread.partner.avatar_url || "",
              verified: !!thread.partner.dow_verified_at,
              memberSince: new Date().toISOString(),
              rating: undefined,
              ratingCount: 0,
              completedSales: 0,
            }
          : undefined;
        const partnerName =
          seller?.name || (partnerId ? getMemberName(partnerId) : "Member");

        const lastMessage =
          thread.messages?.[thread.messages.length - 1] ?? undefined;
        const lastUpdated = lastMessage
          ? formatDistanceToNow(new Date(lastMessage.sentAt), {
              addSuffix: true,
            })
          : "Just now";
        const lastReadTimestamp = thread.lastReadAt?.[user.id];
        const unread = lastMessage
          ? !lastReadTimestamp ||
            new Date(lastReadTimestamp).getTime() <
              new Date(lastMessage.sentAt).getTime()
          : false;
        const isSeller = listing ? user.id === listing.sellerId : false;
        const hasMessages = (thread.messages ?? []).length > 0;
        const defaultComposerMessage = !listing
          ? "Hi there!"
          : isSeller
            ? hasMessages
              ? ""
              : "What would you like to know about this?"
            : hasMessages
              ? ""
              : `Hi, is ${listing.title} still available?`;

        const isArchived = thread.archivedBy?.includes(user.id) ?? false;
        const isCompleted = thread.status === "completed";
        const userStatus: ThreadSummaryStatus = isArchived
          ? "archived"
          : isCompleted
            ? "completed"
            : "active";

        const transaction = thread.transaction;
        const awaitingUserConfirmation = Boolean(
          transaction?.status === "pending_complete" &&
            transaction.markedCompleteBy &&
            transaction.markedCompleteBy !== user.id,
        );
        const userMarkedComplete = Boolean(
          transaction?.status === "pending_complete" &&
            transaction.markedCompleteBy === user.id,
        );
        const ratingSubmitted = Boolean(
          transaction?.status === "completed" &&
            transaction.ratingByUser?.[user.id] !== undefined,
        );
        const canSubmitRating = Boolean(
          transaction?.status === "completed" ||
            transaction?.status === "pending_complete",
        );

        const isMarketplace = !!listing;

        return {
          thread,
          listing,
          seller,
          partnerId,
          partnerName,
          lastMessage,
          lastUpdated,
          unread,
          defaultComposerMessage,
          userStatus,
          isArchived,
          isCompleted,
          transaction,
          awaitingUserConfirmation,
          userMarkedComplete,
          ratingSubmitted,
          canSubmitRating,
          isMarketplace,
        };
      })
      .filter((summary): summary is ThreadSummary => summary !== null);
  }, [getMemberName, listings, messageThreads, user.id]);

  useEffect(() => {
    if (!threadSummaries.length) {
      if (threadId) {
        navigate("/messages", { replace: true });
      }
      return;
    }

    const exists = threadSummaries.some(
      (summary) => summary.thread.id === threadId,
    );
    if (!threadId) {
      if (!isMobile) {
        navigate(`/messages/${threadSummaries[0].thread.id}`, {
          replace: true,
        });
      }
      return;
    }

    if (!exists) {
      navigate(
        isMobile ? "/messages" : `/messages/${threadSummaries[0].thread.id}`,
        {
          replace: true,
        },
      );
    }
  }, [navigate, threadId, threadSummaries, isMobile]);

  const threadCounts = useMemo(
    () =>
      threadSummaries.reduce(
        (acc, summary) => {
          acc.all += 1;
          acc[summary.userStatus] += 1;
          return acc;
        },
        { all: 0, active: 0, completed: 0, archived: 0 },
      ),
    [threadSummaries],
  );

  const filteredSummaries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return threadSummaries.filter((summary) => {
      // Filter out dismissed threads
      if (dismissedThreadIds.has(summary.thread.id)) {
        return false;
      }

      // Filter by status
      const matchesStatusFilter =
        threadFilter === "all" || summary.userStatus === threadFilter;
      if (!matchesStatusFilter) {
        return false;
      }

      // Filter by type (marketplace vs DM)
      const matchesTypeFilter =
        typeFilter === "all-types" ||
        (typeFilter === "marketplace" && summary.isMarketplace) ||
        (typeFilter === "dm" && !summary.isMarketplace);
      if (!matchesTypeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const listingText = summary.listing?.title.toLowerCase() ?? "";
      const partnerText = summary.partnerName.toLowerCase();
      return listingText.includes(query) || partnerText.includes(query);
    });
  }, [
    searchTerm,
    threadFilter,
    typeFilter,
    threadSummaries,
    dismissedThreadIds,
  ]);

  const activeSummary = useMemo(
    () =>
      threadSummaries.find((summary) => summary.thread.id === threadId) ?? null,
    [threadSummaries, threadId],
  );

  const activeThreadId = activeSummary?.thread.id ?? null;
  const activeMessageCount = activeSummary?.thread.messages.length ?? 0;
  const activeDefaultComposerMessage =
    activeSummary?.defaultComposerMessage ?? "Hi, is this still available?";
  const activeTransaction = activeSummary?.transaction ?? null;
  const awaitingUserConfirmation =
    activeSummary?.awaitingUserConfirmation ?? false;
  const userMarkedComplete = activeSummary?.userMarkedComplete ?? false;
  const canSubmitRating = activeSummary?.canSubmitRating ?? false;
  const userRatingValue = activeTransaction?.ratingByUser?.[user.id];
  const completedAtLabel = activeTransaction?.completedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(activeTransaction.completedAt))
    : null;
  const canMarkComplete = Boolean(
    activeSummary &&
      (!activeTransaction ||
        (activeTransaction.status !== "completed" &&
          activeTransaction.status !== "pending_complete")) &&
      !userMarkedComplete,
  );
  const isDisputed = activeTransaction?.status === "disputed";

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    markThreadAsRead(activeThreadId);
  }, [activeThreadId, activeMessageCount, markThreadAsRead]);

  useEffect(() => {
    if (!activeSummary) {
      setComposerMessage("");
      lastThreadIdRef.current = null;
      return;
    }

    const currentId = activeSummary.thread.id;
    if (lastThreadIdRef.current !== currentId) {
      if ((activeSummary.thread.messages ?? []).length === 0) {
        setComposerMessage(activeDefaultComposerMessage);
      } else {
        setComposerMessage("");
      }
    }

    lastThreadIdRef.current = currentId;
  }, [activeSummary, activeDefaultComposerMessage]);

  useEffect(() => {
    setHoveredRating(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    // Scroll to bottom using the ref with smooth behavior
    if (messagesEndRef.current) {
      // Use a small timeout to ensure DOM has been painted
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeThreadId, activeMessageCount]);

  const handleSelectThread = (id: string) => {
    navigate(`/messages/${id}`);
  };

  const handleComposerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSummary || !activeSummary.partnerId || !user) {
      return;
    }

    const trimmed = composerMessage.trim();
    if (!trimmed) {
      return;
    }

    // Generate clientId for optimistic reconciliation
    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: clientId,
      threadId: activeSummary.thread.id,
      authorId: user.id,
      body: trimmed,
      sentAt: new Date().toISOString(),
      type: "text",
    };

    // Add optimistic message to thread
    setMessageThreads((prev) =>
      prev.map((t) =>
        t.id === activeSummary.thread.id
          ? {
              ...t,
              messages: [...t.messages, optimisticMessage],
              updatedAt: new Date().toISOString(),
            }
          : t,
      ),
    );

    setComposerMessage("");

    try {
      // POST with clientId
      const response = await fetch("/.netlify/functions/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: activeSummary.thread.listingId,
          recipientId: activeSummary.partnerId,
          body: trimmed,
          clientId,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to send message");
      }

      const result = await response.json();
      const updatedThread = result.thread as MessageThread;

      // Reconcile optimistic message with real one
      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex((t) => t.id === updatedThread.id);
        if (existingIndex !== -1) {
          // Update existing thread - use all messages from server
          const remaining = prev.filter((_, i) => i !== existingIndex);
          return [updatedThread, ...remaining];
        }
        // Add new thread to top
        return [updatedThread, ...prev];
      });

      markThreadAsRead(updatedThread.id);
      navigate(`/messages/${updatedThread.id}`, { replace: true });
      toast.success("Message sent");
    } catch (error) {
      // Remove optimistic message on error
      setMessageThreads((prev) =>
        prev.map((t) =>
          t.id === activeSummary.thread.id
            ? {
                ...t,
                messages: t.messages.filter((m) => m.id !== clientId),
              }
            : t,
        ),
      );

      toast.error("Unable to send message", {
        description:
          error instanceof Error
            ? error.message
            : "Verify your account to continue.",
      });
    }
  };

  const handleOpenOfferDialog = () => {
    if (!activeSummary?.listing) {
      return;
    }

    const price = Number(activeSummary.listing.price);
    setOfferAmount(isNaN(price) ? "" : String(price));
    setShowOfferDialog(true);
  };

  const handleSubmitOffer = async () => {
    if (!activeSummary || !offerAmount) {
      toast.error("Please enter an offer amount");
      return;
    }

    if (!user || !user.id) {
      toast.error("You must be logged in to make an offer");
      return;
    }

    const amount = Number(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid offer amount");
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${activeSummary.thread.id}/offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, madeBy: user.id }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Update thread in local state
      setMessageThreads((prev) =>
        prev.map((t) => (t.id === activeSummary.thread.id ? data.thread : t)),
      );

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      }).format(amount);

      setShowOfferDialog(false);
      setOfferAmount("");
      toast.success(`Offer of ${formatted} sent`);
    } catch (error) {
      toast.error("Failed to send offer", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    }
  };

  const handleMarkComplete = () => {
    if (!activeSummary) {
      return;
    }
    markTransactionComplete(activeSummary.thread.id, user.id);
  };

  const handleAcceptOffer = async () => {
    if (!activeSummary) {
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${activeSummary.thread.id}/accept-offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to accept offer");
      }

      const data = await response.json();

      // Update thread with full response including all messages
      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex(
          (t) => t.id === activeSummary.thread.id,
        );
        if (existingIndex !== -1) {
          const remaining = prev.filter((_, i) => i !== existingIndex);
          return [data.thread, ...remaining];
        }
        return prev;
      });

      toast.success("Offer accepted");
    } catch (error) {
      toast.error("Failed to accept offer", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    }
  };

  const handleDeclineOffer = async () => {
    if (!activeSummary) {
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${activeSummary.thread.id}/decline-offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to decline offer");
      }

      const data = await response.json();

      // Update thread with full response including all messages
      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex(
          (t) => t.id === activeSummary.thread.id,
        );
        if (existingIndex !== -1) {
          const remaining = prev.filter((_, i) => i !== existingIndex);
          return [data.thread, ...remaining];
        }
        return prev;
      });

      toast.success("Offer declined");
    } catch (error) {
      toast.error("Failed to decline offer", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    }
  };

  const handleRetractOffer = async () => {
    if (!activeSummary) {
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/messages/threads/${activeSummary.thread.id}/offer`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to retract offer");
      }

      const data = await response.json();

      // Update thread with full response including all messages
      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex(
          (t) => t.id === activeSummary.thread.id,
        );
        if (existingIndex !== -1) {
          const remaining = prev.filter((_, i) => i !== existingIndex);
          return [data.thread, ...remaining];
        }
        return prev;
      });

      toast.success("Offer retracted");
    } catch (error) {
      toast.error("Failed to retract offer", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    }
  };

  const handleConfirmCompletion = () => {
    if (!activeSummary) {
      return;
    }
    try {
      confirmTransactionCompletion(activeSummary.thread.id, user.id);
    } catch (error) {
      toast.error("Unable to confirm", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  const handleRaiseDispute = async () => {
    if (!activeSummary) {
      return;
    }
    try {
      await raiseDispute(activeSummary.thread.id, user.id, disputeReason);
      setShowDisputeDialog(false);
      setDisputeReason("");
    } catch (error) {
      toast.error("Unable to raise dispute", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  const handleRatingClick = (value: number) => {
    if (!activeSummary) {
      return;
    }
    try {
      submitTransactionRating(activeSummary.thread.id, value);
      setHoveredRating(null);
    } catch (error) {
      toast.error("Unable to record rating", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  const handleArchiveAction = (summary: ThreadSummary) => {
    const hasPendingOffer =
      summary.thread.transaction?.offer?.status === "pending";
    if (hasPendingOffer) {
      toast.error("Cannot archive thread", {
        description:
          "Cannot archive thread with active offer. Decline the offer first.",
      });
      return;
    }
    if (summary.isArchived) {
      unarchiveThread(summary.thread.id);
      return;
    }
    archiveThread(summary.thread.id);
  };

  const handleDeleteAction = (summary: ThreadSummary) => {
    const hasPendingOffer =
      summary.thread.transaction?.offer?.status === "pending";
    if (hasPendingOffer) {
      toast.error("Cannot delete thread", {
        description:
          "Cannot delete thread with active offer. Decline the offer first.",
      });
      return;
    }
    deleteThread(summary.thread.id);
  };

  const handleDismissListing = () => {
    if (!activeSummary) {
      return;
    }
    setDismissedThreadIds((prev) => {
      const next = new Set(prev);
      next.add(activeSummary.thread.id);
      return next;
    });
    // Navigate to next active thread
    const nextThread = filteredSummaries.find(
      (s) => s.thread.id !== activeSummary.thread.id,
    );
    if (nextThread) {
      navigate(`/messages/${nextThread.thread.id}`);
    } else {
      navigate("/messages");
    }
    toast.success("Conversation dismissed");
  };

  const handleStatusFilterSelect = (nextFilter: ThreadFilter) => {
    setThreadFilter(nextFilter);
  };

  const handleTypeFilterSelect = (nextFilter: ThreadTypeFilter) => {
    setTypeFilter(nextFilter);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const threadListPanel = (
    <aside className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {statusFilterOptions.map((option) => {
            const isActive = option.value === threadFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleStatusFilterSelect(option.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {option.label}
                <span className="text-[0.65rem] uppercase tracking-wide">
                  {threadCounts[option.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
          {typeFilterOptions.map((option) => {
            const isActive = option.value === typeFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTypeFilterSelect(option.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isActive
                    ? "bg-primary text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <Input
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Search by item or name"
          className="mt-3 h-9 rounded-full border-border bg-background/80 text-sm"
        />
      </div>

      {filteredSummaries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-center text-xs text-muted-foreground">
          No conversations match your filters yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-1 overflow-y-auto">
          {filteredSummaries.map((summary) => {
            const isActive = summary.thread.id === activeSummary?.thread.id;

            return (
              <li key={summary.thread.id}>
                <button
                  type="button"
                  onClick={() => handleSelectThread(summary.thread.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive ? "bg-muted/70" : "hover:bg-muted/40",
                    summary.unread && !isActive && "bg-muted/50",
                  )}
                  aria-current={isActive}
                >
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted">
                    {summary.listing?.imageUrls?.[0] ? (
                      <img
                        src={summary.listing.imageUrls[0]}
                        alt={summary.listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : summary.seller?.avatarUrl ? (
                      <img
                        src={summary.seller.avatarUrl}
                        alt={summary.partnerName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <MessageSquare
                        className="h-full w-full p-1.5 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                    {summary.unread && (
                      <span
                        className="absolute -right-1 -top-1 inline-flex h-3 w-3 rounded-full bg-primary shadow-sm"
                        aria-label="Unread message"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col gap-0">
                    <p
                      className={cn(
                        "truncate text-xs",
                        summary.unread
                          ? "font-bold text-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {summary.listing?.title ?? summary.partnerName}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {summary.lastMessage?.body ?? "No messages yet"}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground/60">
                      {summary.lastUpdated}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );

  const conversationPanel = (
    <section
      ref={conversationRef}
      className="flex min-h-[420px] max-h-[calc(100vh-300px)] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card"
    >
      {activeSummary ? (
        <>
          {isMobile ? (
            <div className="border-b border-border px-6 py-3">
              <button
                type="button"
                onClick={() => navigate("/messages")}
                className="flex items-center gap-2 text-sm font-semibold text-foreground"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Threads
              </button>
            </div>
          ) : null}
          <div
            className={cn(
              "flex items-start justify-between gap-3 px-6 py-5",
              !isMobile && "border-b border-border",
            )}
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-border bg-muted">
                {activeSummary.listing?.imageUrls?.[0] ? (
                  <img
                    src={activeSummary.listing.imageUrls[0]}
                    alt={activeSummary.listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : activeSummary.seller?.avatarUrl ? (
                  <img
                    src={activeSummary.seller.avatarUrl}
                    alt={activeSummary.partnerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <MessageSquare
                    className="h-full w-full p-2 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {activeSummary.listing?.title ?? "Direct message"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {activeSummary.partnerId ? (
                    <Link
                      to={`/profile/${activeSummary.partnerId}`}
                      className="font-semibold text-foreground transition hover:text-primary"
                    >
                      {activeSummary.partnerName}
                    </Link>
                  ) : (
                    <span>{activeSummary.partnerName}</span>
                  )}
                  {activeSummary.partnerId ? (
                    <RatingBadge
                      userId={activeSummary.partnerId}
                      initialAverage={activeSummary.seller?.rating ?? null}
                      initialCount={
                        activeSummary.seller?.ratingCount ??
                        activeSummary.seller?.completedSales ??
                        0
                      }
                      size="sm"
                    />
                  ) : null}
                  {activeSummary.listing?.status === "sold" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Sold
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSummary.listing ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3 py-1 text-xs"
                >
                  <Link
                    to={`/listing/${generateSlug(activeSummary.listing.title, activeSummary.listing.id)}`}
                  >
                    View item
                  </Link>
                </Button>
              ) : null}
              {!activeSummary.listing ||
              activeSummary.listing.status === "sold" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3 py-1 text-xs"
                  onClick={handleDismissListing}
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          </div>

          {activeTransaction ? (
            <div
              className={cn(
                "border-b px-6 py-3 text-xs",
                activeTransaction.status === "completed"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-blue-200 bg-blue-50 text-blue-700",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {activeTransaction.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <Clock3 className="h-4 w-4" aria-hidden />
                  )}
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide">
                    {activeTransaction.status === "completed"
                      ? "Transaction completed"
                      : "Awaiting confirmation"}
                  </span>
                </div>
                {activeTransaction.status === "pending_confirmation" ? (
                  awaitingUserConfirmation ? (
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full px-3 py-1 text-xs"
                      onClick={handleConfirmCompletion}
                    >
                      Confirm
                    </Button>
                  ) : partnerNeedsConfirmation ? (
                    <span className="text-[0.65rem] font-medium uppercase tracking-wide">
                      Waiting for {activeSummary.partnerName}
                    </span>
                  ) : null
                ) : completedAtLabel ? (
                  <span className="text-[0.65rem] font-medium uppercase tracking-wide">
                    Completed {completedAtLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-[0.7rem]">
                {activeTransaction.status === "pending_confirmation"
                  ? `This transaction has been marked complete by ${getMemberName(
                      activeTransaction.initiatedBy,
                    )}. Confirm to lock it in.`
                  : "Transaction details available."}
              </p>
            </div>
          ) : !activeSummary.listing ? (
            <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-700">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">
                  This listing has been removed.
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-2 py-1 text-xs"
                  onClick={handleDismissListing}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : activeSummary.listing.status === "sold" ? (
            <div className="border-b border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
              This item is marked sold. You can still view the conversation.
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {awaitingUserConfirmation ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold">
                    The other party marked this transaction as complete. Confirm
                    if you received or completed the deal.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-semibold"
                      onClick={handleConfirmCompletion}
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDisputeDialog(true)}
                    >
                      Dispute
                    </Button>
                  </div>
                </div>
              </div>
            ) : userMarkedComplete ? (
              <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 shadow-inner">
                <p className="font-semibold">
                  You marked this transaction as complete. Waiting for the other
                  party to confirm. Transaction will auto-complete in 72 hours
                  if undisputed.
                </p>
              </div>
            ) : null}

            {isDisputed ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 shadow-inner">
                <p className="font-semibold">
                  This transaction is under dispute. Moderators will review.
                  {activeTransaction?.dispute?.reason && (
                    <> Reason: {activeTransaction.dispute.reason}</>
                  )}
                </p>
              </div>
            ) : null}

            {canSubmitRating && !isDisputed ? (
              userRatingValue ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">
                      You rated {activeSummary.partnerName} {userRatingValue}{" "}
                      out of 5.
                    </p>
                    <span
                      className="inline-flex items-center gap-0.5"
                      aria-hidden
                    >
                      {ratingOptions.map((value) => (
                        <Star
                          key={value}
                          className={cn(
                            "h-4 w-4",
                            value <= userRatingValue
                              ? "fill-emerald-500 text-emerald-500"
                              : "text-emerald-200",
                          )}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">
                      How was your experience with {activeSummary.partnerName}?
                    </p>
                    <div className="flex items-center gap-1">
                      {ratingOptions.map((value) => {
                        const highlighted =
                          hoveredRating !== null
                            ? value <= hoveredRating
                            : false;
                        return (
                          <button
                            key={value}
                            type="button"
                            onMouseEnter={() => setHoveredRating(value)}
                            onMouseLeave={() => setHoveredRating(null)}
                            onClick={() => handleRatingClick(value)}
                            className="rounded-full p-1 outline-none transition hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-300"
                            aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                highlighted
                                  ? "fill-emerald-500 text-emerald-500"
                                  : "text-emerald-300",
                              )}
                              aria-hidden
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )
            ) : null}

            {activeSummary.thread.messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No messages yet. Send the first note.
              </div>
            ) : (
              <>
                {activeSummary.thread.messages.map((message) => {
                  const timestamp = formatDistanceToNow(
                    new Date(message.sentAt),
                    {
                      addSuffix: true,
                    },
                  );

                  if (message.type === "system") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="max-w-[80%] rounded-2xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary shadow-inner">
                          <p>{message.body}</p>
                          <span className="mt-2 block text-[0.65rem] text-primary/60">
                            {timestamp}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (message.type === "offer") {
                    const isOwn = message.authorId === user.id;
                    const offerAmount = Number(message.body) || 0;
                    const offerStatus =
                      activeSummary?.thread?.transaction?.offer?.status ||
                      "pending";
                    const canAccept = !isOwn && offerStatus === "pending";
                    const canDecline = !isOwn && offerStatus === "pending";
                    const canRetract = isOwn && offerStatus === "pending";
                    const partnerName = isOwn ? "You" : activeSummary.partnerName;
                    const itemImage = activeSummary.listing?.imageUrls?.[0];

                    return (
                      <div key={message.id} className="flex flex-col gap-3">
                        <div
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start",
                          )}
                        >
                          <div className="max-w-sm rounded-2xl border-2 border-blue-500/40 bg-blue-50 p-4 shadow-sm dark:bg-blue-950/30">
                            <div className="flex gap-3">
                              {itemImage && (
                                <img
                                  src={itemImage}
                                  alt={activeSummary.listing?.title}
                                  className="h-16 w-16 rounded object-cover flex-shrink-0"
                                />
                              )}
                              <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {partnerName} sent an offer
                                </p>
                                <p className="text-lg font-bold text-blue-600">
                                  ${offerAmount.toFixed(2)}
                                </p>
                                {activeSummary.listing?.title && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                    {activeSummary.listing.title}
                                  </p>
                                )}
                                <p className="text-[0.65rem] text-muted-foreground/70 mt-2">
                                  {timestamp}
                                </p>
                              </div>
                            </div>
                            {(canAccept || canDecline || canRetract) && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-900">
                                {canAccept && (
                                  <Button
                                    size="sm"
                                    onClick={handleAcceptOffer}
                                    className="flex-1 text-xs h-8"
                                  >
                                    Accept
                                  </Button>
                                )}
                                {canDecline && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDeclineOffer}
                                    className="flex-1 text-xs h-8"
                                  >
                                    Decline
                                  </Button>
                                )}
                                {canRetract && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRetractOffer}
                                    className="flex-1 text-xs h-8"
                                  >
                                    Retract
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isOwn = message.authorId === user.id;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOwn ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                          isOwn
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-foreground",
                        )}
                      >
                        <p>{message.body}</p>
                        <span className="mt-2 block text-[0.65rem] text-muted-foreground/80">
                          {timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <form
            onSubmit={handleComposerSubmit}
            className="border-t border-border px-6 py-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={composerMessage}
                onChange={(event) => setComposerMessage(event.target.value)}
                placeholder={activeDefaultComposerMessage}
                className="h-12 rounded-full border-border bg-background/80 text-sm"
              />
              <div className="flex flex-wrap gap-2 md:justify-end">
                {activeSummary.isMarketplace ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4 text-xs font-semibold"
                      onClick={handleOpenOfferDialog}
                      disabled={!activeSummary?.listing}
                    >
                      {activeSummary?.listing &&
                      !activeSummary.listing.isFree &&
                      activeSummary.listing.price
                        ? (() => {
                            const price = Number(activeSummary.listing.price);
                            return isNaN(price)
                              ? "Quick offer"
                              : `Offer ${new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: "USD",
                                  maximumFractionDigits:
                                    price % 1 === 0 ? 0 : 2,
                                }).format(price)}`;
                          })()
                        : "Quick offer"}
                    </Button>
                    {canMarkComplete ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 text-xs font-semibold"
                        onClick={handleMarkComplete}
                      >
                        Mark complete
                      </Button>
                    ) : null}
                    {!awaitingUserConfirmation && !isDisputed ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDisputeDialog(true)}
                      >
                        Dispute
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  className="rounded-full px-6 text-xs font-semibold"
                  disabled={!composerMessage.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </form>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Select a conversation to view messages.
        </div>
      )}
    </section>
  );

  const mobileShowingConversation = Boolean(
    isMobile && threadId && activeSummary,
  );

  return (
    <section className="space-y-6">
      {threadSummaries.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              No messages yet
            </h2>
            <p className="text-sm text-muted-foreground">
              Start a conversation by browsing items or reaching out to other
              community members.
            </p>
          </div>
        </div>
      ) : isMobile ? (
        mobileShowingConversation ? (
          conversationPanel
        ) : (
          threadListPanel
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] h-[calc(100vh-250px)]">
          {threadListPanel}
          {conversationPanel}
        </div>
      )}

      <AlertDialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Dispute Transaction</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You're about to dispute this transaction. Moderators will review
              your case.
            </p>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Reason (optional)
              </span>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Brief explanation of the issue..."
                className="rounded-lg"
              />
            </label>
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRaiseDispute}
              className="bg-destructive hover:bg-destructive/90"
            >
              Dispute
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offer Dialog */}
      <AlertDialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Make an Offer</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Offer an amount for {activeSummary?.listing?.title || "this item"}
            </p>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">
                Offer Amount
              </span>
              <Input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter amount in USD"
                className="rounded-lg"
                step="0.01"
                min="0"
              />
            </label>
            {activeSummary?.listing?.price && (
              <p className="text-xs text-muted-foreground">
                Asking price: ${Number(activeSummary.listing.price).toFixed(2)}
              </p>
            )}
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitOffer}>
              Send Offer
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default Messages;
