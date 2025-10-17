import { FormEvent, useMemo, useState } from "react";
import { Ban, Check, Gavel, History, RotateCcw, Search, ShieldCheck } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  pendingEmail?: string;
  base: string;
  verified: boolean;
  suspended: boolean;
  joined: string;
  ratingLabel: string;
  reports: number;
  listings: number;
  messages: number;
  strikes: number;
}

interface UsersSectionProps {
  users: AdminUserRecord[];
  onVerify: (userId: string) => void;
  onSuspend: (userId: string) => void;
  onReinstate: (userId: string) => void;
  onResetVerification: (userId: string) => void;
  onViewActivity: (userId: string) => void;
  onIssueStrike: (userId: string, note: string) => void;
  onApprovePendingEmail?: (userId: string, newEmail: string) => void;
  onRejectPendingEmail?: (userId: string) => void;
}

export const UsersSection = ({
  users,
  onVerify,
  onSuspend,
  onReinstate,
  onResetVerification,
  onViewActivity,
  onIssueStrike,
}: UsersSectionProps): JSX.Element => {
  const [query, setQuery] = useState<string>("");
  const [strikeTarget, setStrikeTarget] = useState<string | null>(null);
  const [strikeDrafts, setStrikeDrafts] = useState<Record<string, string>>({});
  const [strikeErrors, setStrikeErrors] = useState<Record<string, string>>({});

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return users;
    }
    return users.filter((user) =>
      [user.name, user.base].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [query, users]);

  const openStrikeForm = (userId: string) => {
    setStrikeTarget(userId);
    setStrikeDrafts((prev) => ({ ...prev, [userId]: prev[userId] ?? "" }));
    setStrikeErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const cancelStrikeForm = (userId?: string) => {
    const target = userId ?? strikeTarget;
    setStrikeTarget(null);
    if (target) {
      setStrikeErrors((prev) => {
        if (!prev[target]) {
          return prev;
        }
        const next = { ...prev };
        delete next[target];
        return next;
      });
    }
  };

  const handleStrikeSubmit = (event: FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault();
    const note = strikeDrafts[userId]?.trim() ?? "";
    if (!note) {
      setStrikeErrors((prev) => ({ ...prev, [userId]: "Add a short note before issuing a strike." }));
      return;
    }
    onIssueStrike(userId, note);
    setStrikeTarget(null);
    setStrikeDrafts((prev) => ({ ...prev, [userId]: "" }));
    setStrikeErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const handleStrikeChange = (userId: string, value: string) => {
    setStrikeDrafts((prev) => ({ ...prev, [userId]: value }));
    setStrikeErrors((prev) => {
      if (!prev[userId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="User Controls" subtitle="Users" accent="Access" />
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-background/80 p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <label className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-nav-border bg-card px-3 py-2 text-sm text-muted-foreground md:max-w-md">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            placeholder="Search username, email, or base"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            aria-label="Search users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-success">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-warning">
            <History className="h-3.5 w-3.5" aria-hidden />
            Pending audit
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-destructive">
            <Ban className="h-3.5 w-3.5" aria-hidden />
            Suspended
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const statusBadge = user.suspended
            ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive"
            : user.verified
            ? "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success"
            : "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning";

          return (
            <article
              key={user.id}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-card/90 p-4 shadow-soft"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <span>{user.name}</span>
                    <span className={statusBadge}>
                      {user.suspended ? "Suspended" : user.verified ? "Verified" : "Unverified"}
                    </span>
                    {user.strikes > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-warning">
                        {user.strikes} strike{user.strikes === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.base} • Joined {user.joined}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Ratings {user.ratingLabel}</span>
                    <span>Reports {user.reports}</span>
                    <span>Listings {user.listings}</span>
                    <span>Messages {user.messages}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card disabled:opacity-60"
                    onClick={() => onVerify(user.id)}
                    disabled={user.verified}
                  >
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Verify
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-4 py-2"
                    onClick={() => (user.suspended ? onReinstate(user.id) : onSuspend(user.id))}
                  >
                    {user.suspended ? "Reinstate" : "Suspend"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2"
                    onClick={() => onResetVerification(user.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Reset method
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-border px-4 py-2"
                    onClick={() => onViewActivity(user.id)}
                  >
                    Activity log
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border border-warning px-4 py-2 text-warning"
                    onClick={() =>
                      strikeTarget === user.id ? cancelStrikeForm(user.id) : openStrikeForm(user.id)
                    }
                  >
                    <Gavel className="h-3.5 w-3.5" aria-hidden />
                    Issue strike
                  </button>
                </div>
              </div>
              {strikeTarget === user.id ? (
                <form
                  className="space-y-3 rounded-2xl border border-dashed border-warning bg-warning/5 p-4"
                  onSubmit={(event) => handleStrikeSubmit(event, user.id)}
                >
                  <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Strike reason</span>
                    <textarea
                      className="min-h-[96px] resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      placeholder="Document the behavior and include any references (e.g., report ID)."
                      value={strikeDrafts[user.id] ?? ""}
                      onChange={(event) => handleStrikeChange(user.id, event.target.value)}
                    />
                  </label>
                  {strikeErrors[user.id] ? (
                    <p className="text-xs font-medium text-destructive">{strikeErrors[user.id]}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      className="rounded-full border border-border px-4 py-2"
                      onClick={() => cancelStrikeForm(user.id)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-warning px-4 py-2 text-warning-foreground shadow-card"
                    >
                      Record strike
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          );
        })}
        {filteredUsers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
            No users match your search.
          </div>
        ) : null}
      </div>
    </section>
  );
};
