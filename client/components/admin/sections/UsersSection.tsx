import { Ban, Check, History, Search } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const mockUsers = [
  {
    id: "u-001",
    name: "SrA Jamie Cole",
    base: "Joint Base Andrews",
    verified: true,
    joined: "Mar 2024",
    ratings: "4.9 / 68",
    reports: 1,
    listings: 3,
    messages: 12,
  },
  {
    id: "u-002",
    name: "Capt Alex Ramirez",
    base: "Ramstein AB",
    verified: false,
    joined: "Jan 2024",
    ratings: "4.6 / 22",
    reports: 0,
    listings: 1,
    messages: 7,
  },
  {
    id: "u-003",
    name: "TSgt Erin Moss",
    base: "Travis AFB",
    verified: true,
    joined: "Nov 2023",
    ratings: "5.0 / 41",
    reports: 0,
    listings: 5,
    messages: 18,
  },
];

export const UsersSection = (): JSX.Element => {
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
        {mockUsers.map((user) => (
          <article
            key={user.id}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-card/90 p-4 shadow-soft md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span>{user.name}</span>
                <span
                  className={
                    user.verified
                      ? "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success"
                      : "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning"
                  }
                >
                  {user.verified ? "Verified" : "Unverified"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {user.base} • Joined {user.joined}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Ratings {user.ratings}</span>
                <span>Reports {user.reports}</span>
                <span>Listings {user.listings}</span>
                <span>Messages {user.messages}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card"
              >
                Verify
              </button>
              <button type="button" className="rounded-full border border-border px-4 py-2">
                Suspend
              </button>
              <button type="button" className="rounded-full border border-border px-4 py-2">
                Reset method
              </button>
              <button type="button" className="rounded-full border border-border px-4 py-2">
                Activity log
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
