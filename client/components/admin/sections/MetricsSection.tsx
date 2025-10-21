import { Clock3, Download, LineChart, Percent } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminMetricCard {
  id: string;
  label: string;
  value: string;
  period: string;
  delta: string;
}

interface MetricsSectionProps {
  metrics: AdminMetricCard[];
}

export const MetricsSection = ({ metrics = [] }: MetricsSectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Metrics & Logs" subtitle="Metrics" accent="Pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map((metric) => (
          <article
            key={metric.id}
            className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground/80">
                <Percent className="h-3.5 w-3.5" aria-hidden />
                {metric.delta}
              </span>
            </div>
            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-3xl font-semibold text-foreground">{metric.value}</span>
              <span className="text-xs text-muted-foreground">{metric.period}</span>
            </div>
          </article>
        ))}
        {metrics.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-nav-border bg-background/80 p-6 text-sm text-muted-foreground">
            Nothing to report for this range.
          </div>
        ) : null}
      </div>
      <div className="rounded-3xl border border-border bg-card/90 p-4 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <LineChart className="h-5 w-5 text-primary" aria-hidden />
          <span>Weekly audit log stored for 90 days.</span>
        </div>
      </div>
    </section>
  );
};
