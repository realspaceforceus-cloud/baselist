import { Ban, CheckCircle2, ClipboardX, Shield } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

const Moderation = (): JSX.Element => {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Shield className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-foreground">Moderation</h1>
            <p className="text-sm text-muted-foreground">
              Keep listings compliant, approve new members, and steward trusted commerce for your base.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link to="/">Return home</Link>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardX className="h-4 w-4 text-primary" aria-hidden />
            Reports queue
          </div>
          <p className="text-sm text-muted-foreground">
            Incoming reports populate here with quick actions for Hide, Ban user, or Dismiss. Every action logs with a time stamp and moderator ID.
          </p>
          <div className="rounded-2xl border border-dashed border-nav-border bg-card p-4 text-xs text-muted-foreground">
            Sample entry: “Suspicious payment request” — Awaiting review.
          </div>
        </article>
        <article className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Verify users
          </div>
          <p className="text-sm text-muted-foreground">
            Approve .mil email confirmations, manage invites, and flag IDs requiring manual review. Decisions notify applicants automatically.
          </p>
          <div className="rounded-2xl border border-dashed border-nav-border bg-card p-4 text-xs text-muted-foreground">
            Awaiting action: 3 pending verifications.
          </div>
        </article>
        <article className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Ban className="h-4 w-4 text-warning" aria-hidden />
            Base controls
          </div>
          <p className="text-sm text-muted-foreground">
            Add or hide bases, sync sponsor placements, and configure posting limits per rank or role from this panel.
          </p>
          <div className="rounded-2xl border border-dashed border-nav-border bg-card p-4 text-xs text-muted-foreground">
            Tip: keep sponsor tiles refreshed every 30 days.
          </div>
        </article>
      </div>
    </section>
  );
};

export default Moderation;
