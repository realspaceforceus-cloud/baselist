import { Activity, AlertTriangle, Building2, CheckCircle2, Gauge, Users } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const dashboardCards = [
  {
    id: "verifications",
    label: "Pending Verifications",
    value: 18,
    meta: "Needs review",
    icon: CheckCircle2,
    tone: "text-primary",
  },
  {
    id: "reports",
    label: "Active Reports",
    value: 6,
    meta: "Unresolved",
    icon: AlertTriangle,
    tone: "text-warning",
  },
  {
    id: "listings",
    label: "Listings",
    value: "412 / 38",
    meta: "Active / Flagged",
    icon: Gauge,
    tone: "text-foreground",
  },
  {
    id: "users",
    label: "New Users",
    value: "24 / 139",
    meta: "Today / Week",
    icon: Users,
    tone: "text-success",
  },
  {
    id: "bases",
    label: "Top Bases",
    value: "Travis, Ramstein, Elmendorf",
    meta: "Listings volume",
    icon: Building2,
    tone: "text-muted-foreground",
  },
  {
    id: "uptime",
    label: "Queue Health",
    value: "Stable",
    meta: "Under 2m response",
    icon: Activity,
    tone: "text-verified",
  },
];

export const DashboardSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Admin Snapshot"
        subtitle="Home"
        accent="Live"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dashboardCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.id}
              className="flex h-full flex-col justify-between rounded-3xl border border-border bg-background/80 p-5 shadow-soft"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="mt-6 flex items-baseline justify-between gap-3">
                <span className="text-3xl font-semibold text-foreground">{card.value}</span>
                <span className={`text-xs font-medium ${card.tone}`}>{card.meta}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
