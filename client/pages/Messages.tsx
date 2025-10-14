import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

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
import { RatingBadge } from "@/components/shared/RatingBadge";
import type { Listing, Message, MessageThread } from "@/types";

type ThreadFilter = "all" | "active" | "completed" | "archived";

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
    confirmTransactionCompletion,
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
          ? formatDistanceToNow(new Date(lastMessage.sentAt), {
              addSuffix: true,
            })
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
          transaction?.status === "pending_confirmation" &&
            !(transaction.confirmedBy ?? []).includes(user.id),
        );
        const ratingSubmitted = Boolean(
          transaction?.status === "completed" &&
            transaction.ratingByUser?.[user.id] !== undefined,
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

    const exists = threadSummaries.some(
      (summary) => summary.thread.id === threadId,
    );
    if (!threadId || !exists) {
      navigate(`/messages/${threadSummaries[0].thread.id}`, { replace: true });
    }
  }, [navigate, threadId, threadSummaries]);

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
      threadSummaries[0] ??
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
    if (!activeThreadId) {
      setComposerMessage("");
      lastThreadIdRef.current = null;
      return;
    }

    if (lastThreadIdRef.current !== activeThreadId) {
      if (activeMessageCount === 0) {
        setComposerMessage(activeDefaultComposerMessage);
      } else {
        setComposerMessage("");
      }
    }

    lastThreadIdRef.current = activeThreadId;
  }, [activeDefaultComposerMessage, activeMessageCount, activeThreadId]);

  useEffect(() => {
    setHoveredRating(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    if (isMobile && conversationRef.current) {
      conversationRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeThreadId, activeMessageCount, isMobile]);

  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  const filterOptions: Array<{ value: ThreadFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: threadCounts.all },
    { value: "active", label: "Active", count: threadCounts.active },
    { value: "completed", label: "Completed", count: threadCounts.completed },
    { value: "archived", label: "Archived", count: threadCounts.archived },
  ];

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Your messages are tied to listings—quick offers, updates, and pickups.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link to="/post">
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Post an item
          </Link>
        </Button>
      </header>

      {threadSummaries.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">
              No messages yet. Find something you like.
            </h2>
            <p className="text-sm text-muted-foreground">
              Start a conversation from any listing to see the full inbox and thread experience.
            </p>
          </div>
          <Button asChild className="rounded-full px-6">
            <Link to="/">Browse listings</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
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
                        {option.count}
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
              <ul className="space-y-3">
                {filteredSummaries.map((summary) => {
                  const isActive = summary.thread.id === activeSummary?.thread.id;
                  const statusLabel =
                    summary.userStatus === "completed"
                      ? "Completed"
                      : summary.userStatus === "archived"
                      ? "Archived"
                      : "Active";
                  const statusClass =
                    summary.userStatus === "completed"
                      ? "text-emerald-600"
                      : summary.userStatus === "archived"
                      ? "text-muted-foreground"
                      : "text-primary";

                  return (
                    <li key={summary.thread.id}>
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectThread(summary.thread.id)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            isActive && "border-primary/50 bg-primary/5",
                          )}
                          aria-current={isActive}
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-2xl border border-border bg-muted">
                            {summary.listing?.imageUrls?.[0] ? (
                              <img
                                src={summary.listing.imageUrls[0]}
                                alt={summary.listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <MessageSquare
                                className="h-full w-full p-2 text-muted-foreground"
                                aria-hidden
                              />
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {summary.listing?.title ?? "Listing removed"}
                              </p>
                              {summary.unread ? (
                                <span
                                  className="inline-flex h-2.5 w-2.5 rounded-full bg-primary"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {summary.lastMessage?.body ?? "No messages yet"}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{summary.lastUpdated}</span>
                              {summary.partnerName ? (
                                <>
                                  <Dot className="h-3 w-3 text-muted-foreground" aria-hidden />
                                  <span className="flex items-center gap-1">
                                    {summary.partnerName}
                                    {summary.seller ? (
                                      <RatingBadge
                                        userId={summary.seller.id}
                                        initialAverage={summary.seller.rating ?? null}
                                        initialCount={summary.seller.ratingCount ?? summary.seller.completedSales ?? 0}
                                        size="sm"
                                      />
                                    ) : null}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <span className={cn("text-xs font-semibold", statusClass)}>{statusLabel}</span>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
                              aria-label="Conversation actions"
                            >
                              <EllipsisVertical className="h-4 w-4" aria-hidden />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => handleArchiveAction(summary)}>
                              {summary.isArchived ? (
                                <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden />
                              ) : (
                                <Archive className="mr-2 h-4 w-4" aria-hidden />
                              )}
                              {summary.isArchived ? "Restore to inbox" : "Archive thread"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => handleDeleteAction(summary)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                              Delete thread
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section
            ref={conversationRef}
            className="flex min-h-[420px] flex-col rounded-3xl border border-border bg-card shadow-card"
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
                        <MessageSquare
                          className="h-full w-full p-2 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-foreground">
                        {activeSummary.listing?.title ?? "Listing removed"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{activeSummary.partnerName}</span>
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
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 py-1 text-xs"
                    >
                      <Link to={`/listing/${activeSummary.listing.id}`}>View item</Link>
                    </Button>
                  ) : null}
                </div>

                {activeSummary.listing?.status === "sold" ? (
                  <div className="border-b border-border bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
                    This item is marked sold. You can still view the conversation.
                  </div>
                ) : null}

                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                  {activeSummary.thread.messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No messages yet. Send the first note.
                    </div>
                  ) : (
                    <>
                      {activeSummary.thread.messages.map((message) => {
                        const isOwn = message.authorId === user.id;
                        const timestamp = formatDistanceToNow(
                          new Date(message.sentAt),
                          { addSuffix: true },
                        );

                        return (
                          <div
                            key={message.id}
                            className={cn("flex", isOwn ? "justify-end" : "justify-start")}
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
                    <div className="flex gap-2 md:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-4 text-xs"
                        onClick={handleQuickOffer}
                        disabled={
                          !activeSummary.listing ||
                          activeSummary.listing.isFree ||
                          !activeSummary.listing.price
                        }
                      >
                        {activeSummary?.listing && !activeSummary.listing.isFree
                          ? `Offer $${activeSummary.listing.price.toLocaleString("en-US")}`
                          : "Offer"}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-full px-5"
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
                Select a conversation to view details.
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default Messages;
