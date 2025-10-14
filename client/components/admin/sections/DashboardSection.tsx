import type { LucideIcon } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface DashboardCard {
  id: string;
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  toneClass?: string;
}

interface DashboardSectionProps {
  cards: DashboardCard[];
}

export const DashboardSection = ({ cards }: DashboardSectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Admin Snapshot" subtitle="Home" accent="Live" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
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
                <span className={`text-xs font-medium ${card.toneClass ?? "text-muted-foreground"}`}>
                  {card.meta}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
