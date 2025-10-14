import { MessageSquare } from "lucide-react";

const Messages = (): JSX.Element => {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-nav-border bg-background/70 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-6 w-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">
          No messages yet. Find something you like.
        </p>
      </div>
    </section>
  );
};

export default Messages;
