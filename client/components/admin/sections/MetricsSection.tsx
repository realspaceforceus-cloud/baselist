import { Clock3, Download, LineChart, Percent } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const metrics = [
  {
    id: "verified",
    label: "New verified users",
    value: "139",
    period: "Last 30 days",
    delta: "+12%",
  },
  {
    id: "listings",
    label: "Listings created / sold",
    value: "412 / 287",
    period: "Last 30 days",
    delta: "+9%",
  },
  {
    id: "reports",
    label: "Reports resolved",
    value: "94%",
    period: "SLA 24h",
    delta: "-3%",
  },
  {
    id: "verifications",
    label: "Verification response",
    value: "01:42",
    period: "Average time",
    delta: "-18%",
  },
];

export const MetricsSection = (): JSX.Element => {
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
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card/90 p-4 shadow-soft text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <LineChart className="h-5 w-5 text-primary" aria-hidden />
          <span>Weekly audit log stored for 90 days with export on demand.</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            View log
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export CSV
          </button>
        </div>
      </div>
    </section>
  );
};
}