import { Building2, MapPin, Pencil, Plus, Users } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const bases = [
  {
    id: "base-01",
    name: "Travis AFB",
    region: "Fairfield, CA",
    moderator: "Capt Logan Pierce",
    users: 812,
    activeListings: 148,
    pendingReports: 5,
  },
  {
    id: "base-02",
    name: "Ramstein AB",
    region: "Kaiserslautern, Germany",
    moderator: "MSgt Elise Harper",
    users: 1_204,
    activeListings: 172,
    pendingReports: 4,
  },
  {
    id: "base-03",
    name: "Joint Base Elmendorf-Richardson",
    region: "Anchorage, AK",
    moderator: "Lt Col Nathan Reese",
    users: 609,
    activeListings: 96,
    pendingReports: 2,
  },
];

export const BasesSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Base Management" subtitle="Bases" accent="Hubs" />
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-card">
          <Plus className="h-4 w-4" aria-hidden />
          Add base
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
          Archive
        </button>
      </div>
      <div className="space-y-3">
        {bases.map((base) => (
          <article
            key={base.id}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-background/90 p-4 shadow-soft md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4 w-4 text-primary" aria-hidden />
                <span>{base.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  Active
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
                {base.region}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Moderator {base.moderator}</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {base.users} members
                </span>
                <span>{base.activeListings} listings</span>
                <span>{base.pendingReports} reports</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <button type="button" className="rounded-full border border-border px-3 py-1">
                Assign moderator
              </button>
              <button type="button" className="rounded-full border border-border px-3 py-1">
                View stats
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
