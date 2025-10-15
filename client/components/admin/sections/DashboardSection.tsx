import type { LucideIcon } from "lucide-react";

import type { AdminNavItem } from "@/components/admin/AdminSidebar";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface DashboardCard {
  id: string;
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  toneClass?: string;
  target: AdminNavItem["id"];
  chartData?: Array<{ id: string; label: string; value: number }>;
  chartMax?: number;
}

interface DashboardSectionProps {
  cards: DashboardCard[];
  onNavigate: (target: AdminNavItem["id"]) => void;
}

export const DashboardSection = ({ cards, onNavigate }: DashboardSectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Admin Snapshot" subtitle="Home" accent="Live" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const handleClick = () => onNavigate(card.target);

          return (
            <button
              key={card.id}
              type="button"
              onClick={handleClick}
              onKeyUp={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleClick();
                }
              }}
              className="group flex h-full flex-col justify-between rounded-3xl border border-border bg-background/80 p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-primary">
                  {card.label}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="mt-6 flex items-baseline justify-between gap-3">
                <span className="text-3xl font-semibold text-foreground group-hover:text-primary">
                  {card.value}
                </span>
                <span className={`text-xs font-medium ${card.toneClass ?? "text-muted-foreground"}`}>
                  {card.meta}
                </span>
              </div>
              {card.chartData && card.chartData.length > 0 ? (
                <div className="mt-5 space-y-2">
                  {card.chartData.map((entry) => {
                    const width = card.chartMax ? Math.max((entry.value / card.chartMax) * 100, 6) : 0;
                    return (
                      <div key={entry.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          <span className="truncate text-foreground/80 group-hover:text-primary">{entry.label}</span>
                          <span className="text-muted-foreground/80">{entry.value.toLocaleString()} members</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/60">
                          <div
                            className="h-full rounded-full bg-primary/80"
                            style={{ width: `${card.chartMax ? Math.min(width, 100) : 0}%` }}
                            aria-hidden
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
};
