import { AlertTriangle, CheckCircle2, Shield } from "lucide-react";

const Moderation = (): JSX.Element => {
  return (
    <section className="space-y-6">
      <header className="flex items-center gap-3 rounded-3xl border border-border bg-card p-6 shadow-card">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Shield className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review reports, manage verification, and keep listings compliant.
          </p>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-3xl border border-dashed border-nav-border bg-background/80 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
            Reports queue
          </div>
          <p className="text-sm text-muted-foreground">
            Quick actions for Hide, Ban user, and Dismiss will appear here.
          </p>
        </article>
        <article className="flex flex-col gap-3 rounded-3xl border border-dashed border-nav-border bg-background/80 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Verification requests
          </div>
          <p className="text-sm text-muted-foreground">
            Approve or deny pending users and manage invites.
          </p>
        </article>
      </div>
    </section>
  );
};

export default Moderation;
