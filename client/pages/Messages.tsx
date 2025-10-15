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

// ... rest of file above unchanged ...

  useEffect(() => {
    if (isMobile && threadId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isMobile, threadId]);

  useEffect(() => {
    if (!activeSummary) {
      setComposerMessage("");
      lastThreadIdRef.current = null;
      return;
    }

    const activeThreadIdValue = activeSummary.thread.id;
    if (lastThreadIdRef.current !== activeThreadIdValue) {
      if (activeSummary.thread.messages.length === 0) {
        setComposerMessage(activeDefaultComposerMessage);
      } else {
        setComposerMessage("");
      }
    }

    lastThreadIdRef.current = activeThreadIdValue;
  }, [activeSummary, activeDefaultComposerMessage]);

  useEffect(() => {
    setHoveredRating(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    if (isMobile && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeThreadId, activeMessageCount, isMobile]);

  const handleSelectThread = (id: string) => {
    navigate(`/messages/${id}`);
    if (isMobile) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

// ... rest of logic above return remains ...

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
                <span className="text-[0.65rem] uppercase tracking-wide">{option.count}</span>
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
            const isActiveThread = summary.thread.id === activeSummary?.thread.id;
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
                      isActiveThread && "border-primary/50 bg-primary/5",
                    )}
                    aria-current={isActiveThread}
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-2xl border border-border bg-muted">
                      {summary.listing?.imageUrls?.[0] ? (
                        <img
                          src={summary.listing.imageUrls[0]}
                          alt={summary.listing.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <MessageSquare className="h-full w-full p-2 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {summary.listing?.title ?? "Listing removed"}
                        </p>
                        {summary.unread ? (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
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
                              {summary.partnerId ? (
                                <Link
                                  to={`/profile/${summary.partnerId}`}
                                  className="font-semibold text-foreground transition hover:text-primary"
                                >
                                  {summary.partnerName}
                                </Link>
                              ) : (
                                summary.partnerName
                              )}
                              {summary.partnerId ? (
                                <RatingBadge
                                  userId={summary.partnerId}
                                  initialAverage={
                                    summary.partnerId === summary.seller?.id
                                      ? summary.seller?.rating ?? null
                                      : null
                                  }
                                  initialCount={
                                    summary.partnerId === summary.seller?.id
                                      ? summary.seller?.ratingCount ?? summary.seller?.completedSales ?? 0
                                      : 0
                                  }
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
  );

  const conversationPanel = (
    <section ref={conversationRef} className="flex min-h-[420px] flex-col rounded-3xl border border-border bg-card shadow-card">
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
                        activeSummary.seller?.ratingCount ?? activeSummary.seller?.completedSales ?? 0
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
              <p className=