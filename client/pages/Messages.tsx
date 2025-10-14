import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

  const threadSummaries = useMemo(
    () =>
      messageThreads.map((thread) => {
        const listing = listings.find((item) => item.id === thread.listingId);
        const partnerId = thread.participants.find(
          (participant) => participant !== user.id,
        );
        const seller = partnerId
          ? SELLERS.find((candidate) => candidate.id === partnerId)
          : undefined;
        const lastMessage =
          thread.messages[thread.messages.length - 1] ?? undefined;
        const lastUpdated = lastMessage
          ? formatDistanceToNow(new Date(lastMessage.sentAt), {
              addSuffix: true,
            })
          : "Just now";
        const lastReadTimestamp = thread.lastReadAt?.[user.id];
        const unread = lastMessage
          ? !lastReadTimestamp || new Date(lastReadTimestamp).getTime() < new Date(lastMessage.sentAt).getTime()
          : false;
        const defaultComposerMessage = seller
          ? `Hi ${seller.name.split(" ")[0]}, is this still available?`
          : "Hi, is this still available?";

        return {
          thread,
          listing,
          seller,
          partnerId,
          lastMessage,
          lastUpdated,
          unread,
          defaultComposerMessage,
        };
      }),
    [listings, messageThreads, user.id],
  );

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
          <aside className="space-y-3">
            <ul className="space-y-3">
              {threadSummaries.map((summary) => {
                const isActive = summary.thread.id === activeSummary?.thread.id;
                return (
                  <li key={summary.thread.id}>
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
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {summary.lastUpdated}
                          {summary.seller ? (
                            <>
                              <Dot className="h-3 w-3 text-muted-foreground" aria-hidden />
                              {summary.seller.name}
                            </>
                          ) : null}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary">Open</span>
                    </button>
                  </li>
                );
              })}
            </ul>
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
                      <p className="text-xs text-muted-foreground">
                        {activeSummary.seller?.name ?? "Verified member"}
                        {activeSummary.seller?.rating ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                            <span aria-hidden>⭐</span>
                            {activeSummary.seller.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </p>
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
