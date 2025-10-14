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
    const lastMessage = thread.messages[thread.messages.length - 1];
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

      {threadSummaries.length > 0 ? (
        <ul className="space-y-3">
          {threadSummaries.map(({ thread, listing, seller, lastMessage, lastUpdated, unread }) => (
            <li
              key={thread.id}
              className="flex items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="h-12 w-12 overflow-hidden rounded-2xl border border-border bg-muted">
                {listing?.imageUrls?.[0] ? (
                  <img
                    src={listing.imageUrls[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <MessageSquare className="h-full w-full p-2 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {listing?.title ?? "Listing removed"}
                  </p>
                  {unread ? (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {lastMessage?.body ?? "No messages yet"}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {lastUpdated}
                  {seller ? (
                    <>
                      <Dot className="h-3 w-3 text-muted-foreground" aria-hidden />
                      {seller.name}
                    </>
                  ) : null}
                </p>
              </div>
              <Button variant="ghost" className="rounded-full px-4 text-xs" asChild>
                <Link to={`/messages/${thread.id}`}>Open</Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {threadSummaries.length > 0
              ? "Keep conversations moving."
              : "No messages yet. Find something you like."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {threadSummaries.length > 0
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
