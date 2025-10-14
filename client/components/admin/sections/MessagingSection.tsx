import { AlertTriangle, MessageCircleWarning, ShieldCheck, UserMinus } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const flaggedThreads = [
  {
    id: "MSG-9021",
    base: "Travis AFB",
    reason: "Payment outside platform",
    participants: "Harper • Cole",
    excerpt: "Let’s move to Zelle. I’ll send you the details…",
    accessedBy: "None",
  },
  {
    id: "MSG-9022",
    base: "Ramstein AB",
    reason: "Harassment",
    participants: "Ramirez • Young",
    excerpt: "You’re wasting my time. Drop your price now…",
    accessedBy: "Moderator Moss",
  },
];

export const MessagingSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Messaging Oversight" subtitle="Messaging" accent="Flagged" />
      <p className="text-xs text-muted-foreground">
        Admins see only reported threads. Every access is recorded with timestamp and reviewer ID.
      </p>
      <div className="space-y-3">
        {flaggedThreads.map((thread) => (
          <article
            key={thread.id}
            className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageCircleWarning className="h-4 w-4 text-warning" aria-hidden />
                  <span>{thread.reason}</span>
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
                    {thread.base}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Thread {thread.id} • {thread.participants}</div>
                <p className="rounded-2xl border border-dashed border-nav-border bg-card/90 px-3 py-2 text-sm text-foreground/80">
                  “{thread.excerpt}”
                </p>
                <div className="text-xs text-muted-foreground">
                  Last accessed: {thread.accessedBy ?? "Not yet"}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-xs font-semibold">
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Warn users
                </button>
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-destructive px-4 py-2 text-destructive">
                  <UserMinus className="h-3.5 w-3.5" aria-hidden />
                  Ban offender
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="rounded-3xl border border-dashed border-nav-border bg-card/90 px-4 py-3 text-xs text-muted-foreground">
        Access log retained for 90 days with reviewer, timestamp, and action taken.
      </div>
    </section>
  );
};
