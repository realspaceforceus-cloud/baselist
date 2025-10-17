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
import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";
import { SELLERS } from "@/data/mock";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { Listing, Message, MessageThread } from "@/types";

const ratingOptions = [1, 2, 3, 4, 5];

const filterOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

type ThreadFilter = (typeof filterOptions)[number]["value"];
type ThreadSummaryStatus = "active" | "completed" | "archived";

interface ThreadSummary {
  thread: MessageThread;
  listing: Listing | undefined;
  seller: (typeof SELLERS)[number] | undefined;
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
  ratingSubmitted: boolean;
}

const Messages = (): JSX.Element => {
  const {
    listings,
    messageThreads,
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

  const [composerMessage, setComposerMessage] = useState<string>("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilter>("active");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const threadSummaries = useMemo<ThreadSummary[]>(() => {
    return messageThreads
      .map((thread) => {
        if (thread.deletedBy?.includes(user.id)) {
          return null;
        }

        const listing = listings.find((item) => item.id === thread.listingId);
        const partnerId = thread.participants.find((participant) => participant !== user.id);
        const seller = listing
          ? SELLERS.find((candidate) => candidate.id === listing.sellerId)
          : partnerId
          ? SELLERS.find((candidate) => candidate.id === partnerId)
          : undefined;
        const partnerName = partnerId ? getMemberName(partnerId) : "Member";

        const lastMessage = thread.messages[thread.messages.length - 1] ?? undefined;
        const lastUpdated = lastMessage
          ? formatDistanceToNow(new Date(lastMessage.sentAt), { addSuffix: true })
          : "Just now";
        const lastReadTimestamp = thread.lastReadAt?.[user.id];
        const unread = lastMessage
          ? !lastReadTimestamp ||
            new Date(lastReadTimestamp).getTime() < new Date(lastMessage.sentAt).getTime()
          : false;
        const defaultComposerMessage = seller
          ? `Hi ${seller.name.split(" ")[0]}, is this still available?`
          : "Hi, is this still available?";

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
          ratingSubmitted,
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

    const exists = threadSummaries.some((summary) => summary.thread.id === threadId);
    if (!threadId) {
      if (!isMobile) {
        navigate(`/messages/${threadSummaries[0].thread.id}`, { replace: true });
      }
      return;
    }

    if (!exists) {
      navigate(isMobile ? "/messages" : `/messages/${threadSummaries[0].thread.id}`, {
        replace: true,
      });
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
      const matchesFilter = threadFilter === "all" || summary.userStatus === threadFilter;
      if (!matchesFilter) {
        return false;
      }
      if (!query) {
        return true;
      }

      const listingText = summary.listing?.title.toLowerCase() ?? "";
      const partnerText = summary.partnerName.toLowerCase();
      return listingText.includes(query) || partnerText.includes(query);
    });
  }, [searchTerm, threadFilter, threadSummaries]);

  const activeSummary = useMemo(
    () =>
      threadSummaries.find((summary) => summary.thread.id === threadId) ??
      null,
    [threadSummaries, threadId],
  );

  const activeThreadId = activeSummary?.thread.id ?? null;
  const activeMessageCount = activeSummary?.thread.messages.length ?? 0;
  const activeDefaultComposerMessage =
    activeSummary?.defaultComposerMessage ?? "Hi, is this still available?";
  const activeTransaction = activeSummary?.transaction ?? null;
  const userHasConfirmedTransaction = Boolean(
    activeTransaction?.confirmedBy?.includes(user.id),
  );
  const awaitingUserConfirmation = activeSummary?.awaitingUserConfirmation ?? false;
  const partnerNeedsConfirmation = Boolean(
    activeTransaction?.status === "pending_confirmation" &&
      !awaitingUserConfirmation &&
      userHasConfirmedTransaction,
  );
  const userRatingValue = activeTransaction?.ratingByUser?.[user.id];
  const completedAtLabel = activeTransaction?.completedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        new Date(activeTransaction.completedAt),
      )
    : null;
  const canMarkComplete = Boolean(
    activeSummary &&
      (!activeTransaction || activeTransaction.status !== "completed") &&
      !userHasConfirmedTransaction,
  );

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
      if (activeSummary.thread.messages.length === 0) {
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

    if (messagesEndRef.current && conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [activeThreadId, activeMessageCount]);

  const handleSelectThread = (id: string) => {
    navigate(`/messages/${id}`);
  };

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSummary || !activeSummary.partnerId) {
      return;
    }

    const trimmed = composerMessage.trim();
    if (!trimmed) {
      return;
    }

    try {
      const updatedThread = sendMessageToSeller(
        activeSummary.thread.listingId,
        activeSummary.partnerId,
        trimmed,
      );

      setComposerMessage("");
      markThreadAsRead(updatedThread.id);
      navigate(`/messages/${updatedThread.id}`, { replace: true });
    } catch (error) {
      toast.error("Unable to send message", {
        description:
          error instanceof Error ? error.message : "Verify your account to continue.",
      });
    }
  };

  const handleQuickOffer = () => {
    if (!activeSummary?.listing || activeSummary.listing.isFree) {
      return;
    }

    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: activeSummary.listing.price % 1 === 0 ? 0 : 2,
    }).format(activeSummary.listing.price);

    setComposerMessage(`Offer ${formatted}`);
  };

  const handleMarkComplete = () => {
    if (!activeSummary) {
      return;
    }
    initiateTransaction(activeSummary.thread.id, user.id);
  };

  const handleConfirmCompletion = () => {
    if (!activeSummary) {
      return;
    }
    try {
      confirmTransactionCompletion(activeSummary.thread.id, user.id);
    } catch (error) {
      toast.error("Unable to confirm", {
        description: error instanceof Error ? error.message : "Try again in a moment.",
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
        description: error instanceof Error ? error.message : "Try again in a moment.",
      });
    }
  };

  const handleArchiveAction = (summary: ThreadSummary) => {
    if (summary.isArchived) {
      unarchiveThread(summary.thread.id);
      return;
    }
    archiveThread(summary.thread.id);
  };

  const handleDeleteAction = (summary: ThreadSummary) => {
    deleteThread(summary.thread.id);
  };

  const handleFilterSelect = (nextFilter: ThreadFilter) => {
    setThreadFilter(nextFilter);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const threadListPanel = (
    <aside className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const isActive = option.value === threadFilter;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFilterSelect(option.value)}
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
                    ) : (
                      <MessageSquare className="h-full w-full p-1.5 text-muted-foreground" aria-hidden />
                    )}
                    {summary.unread && (
                      <span className="absolute -right-1 -top-1 inline-flex h-3 w-3 rounded-full bg-primary shadow-sm" aria-label="Unread message" />
                    )}
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col gap-0">
                    <p className={cn(
                      "truncate text-xs",
                      summary.unread ? "font-bold text-foreground" : "font-medium text-foreground"
                    )}>
                      {summary.listing?.title ?? "Listing removed"}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {summary.lastMessage?.body ?? "No messages yet"}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground/60">{summary.lastUpdated}</p>
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
                ) : (
                  <MessageSquare className="h-full w-full p-2 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {activeSummary.listing?.title ?? "Listing removed"}
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
            {activeSummary.listing ? (
              <Button asChild variant="outline" size="sm" className="rounded-full px-3 py-1 text-xs">
                <Link to={`/listing/${activeSummary.listing.id}`}>View item</Link>
              </Button>
            ) : null}
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
                  : "Listing marked sold and history updated."}
              </p>
            </div>
          ) : activeSummary.listing?.status === "sold" ? (
            <div className="border-b border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
              This item is marked sold. You can still view the conversation.
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {activeTransaction?.status === "completed" ? (
              userRatingValue ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold">
                      You rated {activeSummary.partnerName} {userRatingValue} out of 5.
                    </p>
                    <span className="inline-flex items-center gap-0.5" aria-hidden>
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
                          hoveredRating !== null ? value <= hoveredRating : false;
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
                  const timestamp = formatDistanceToNow(new Date(message.sentAt), {
                    addSuffix: true,
                  });

                  if (message.type === "system") {
                    return (
                      <div key={message.id} className="flex justify-center">
                        <div className="max-w-[80%] rounded-2xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary shadow-inner">
                          <p>{message.body}</p>
                          <span className="mt-2 block text-[0.65rem] text-primary/60">{timestamp}</span>
                        </div>
                      </div>
                    );
                  }

                  const isOwn = message.authorId === user.id;

                  return (
                    <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                          isOwn ? "bg-foreground/10 text-foreground" : "bg-muted text-foreground",
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

          <form onSubmit={handleComposerSubmit} className="border-t border-border px-6 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                value={composerMessage}
                onChange={(event) => setComposerMessage(event.target.value)}
                placeholder={activeDefaultComposerMessage}
                className="h-12 rounded-full border-border bg-background/80 text-sm"
              />
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full px-4 text-xs font-semibold"
                  onClick={handleQuickOffer}
                  disabled={!activeSummary?.listing || activeSummary.listing.isFree}
                >
                  {activeSummary?.listing && !activeSummary.listing.isFree
                    ? `Offer ${new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits:
                          activeSummary.listing.price % 1 === 0 ? 0 : 2,
                      }).format(activeSummary.listing.price)}`
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

  const mobileShowingConversation = Boolean(isMobile && threadId && activeSummary);

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
          </div>
          <Button asChild className="rounded-full px-6">
            <Link to="/">Browse listings</Link>
          </Button>
        </div>
      ) : isMobile ? (
        mobileShowingConversation ? conversationPanel : threadListPanel
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr] h-[calc(100vh-250px)]">
          {threadListPanel}
          {conversationPanel}
        </div>
      )}
    </section>
  );
};

export default Messages;
