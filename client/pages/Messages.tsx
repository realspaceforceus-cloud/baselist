import { Inbox, MessageSquare, MessageSquarePlus } from "lucide-react";
import { Dot, MessageSquare, MessageSquarePlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
import { SELLERS } from "@/data/mock";

const Messages = (): JSX.Element => {
  const { listings, messageThreads, user } = useBaseList();

  const threadSummaries = messageThreads.map((thread) => {
    const listing = listings.find((item) => item.id === thread.listingId);
    const partnerId = thread.participants.find((participant) => participant !== user.id);
    const seller = partnerId
      ? SELLERS.find((candidate) => candidate.id === partnerId)
      : undefined;
    const lastMessage = thread.messages.at(-1);
    const lastUpdated = lastMessage
      ? formatDistanceToNow(new Date(lastMessage.sentAt), { addSuffix: true })
      : "Just now";

    return {
      thread,
      listing,
      seller,
      lastMessage,
      lastUpdated,
      unread: thread.lastReadAt?.[user.id] !== lastMessage?.sentAt,
    };
  });

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Coordinate meetups, send quick offers, and keep every exchange on base. Threads live alongside each listing for context.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link to="/post">
            <MessageSquarePlus className="h-4 w-4" aria-hidden />
            Post an item
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Inbox className="h-4 w-4 text-primary" aria-hidden />
            Inbox preview
          </div>
          <p className="text-sm text-muted-foreground">
            Your inbox will surface the latest activity across listings with unread badges and quick filters for offers, pickups, and archived threads.
          </p>
        </article>
        <article className="flex flex-col gap-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
            Thread snapshot
          </div>
          {primaryThread && threadListing && threadPartner ? (
            <div className="rounded-2xl border border-dashed border-nav-border bg-card p-4 text-sm">
              <div className="font-semibold text-foreground">{threadListing.title}</div>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                Last message {lastUpdated ? `· ${lastUpdated}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {lastMessage?.body ?? "Thread preview"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                With {threadPartner.name}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Message threads will appear here once enabled.
            </p>
          )}
        </article>
      </div>

      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {messageThreads.length > 0
              ? "Keep conversations moving."
              : "No messages yet. Find something you like."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {messageThreads.length > 0
              ? "Tap a thread to coordinate pickup details or send a quick offer."
              : "Start a conversation from any listing to see the full inbox and thread experience."}
          </p>
        </div>
        <Button asChild className="rounded-full px-6">
          <Link to="/">Browse listings</Link>
        </Button>
      </div>
    </section>
  );
};

export default Messages;
