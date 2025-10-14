import { AlertTriangle, CheckCircle2, FileText, Filter, Gavel } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const reports = [
  {
    id: "RPT-2301",
    type: "Scam attempt",
    reporter: "A1C Dorsey",
    target: "Listing LST-8421",
    base: "Joint Base Lewis-McChord",
    time: "5m ago",
    attachment: true,
  },
  {
    id: "RPT-2302",
    type: "Weapon",
    reporter: "Capt Monroe",
    target: "User u-002",
    base: "Ramstein AB",
    time: "18m ago",
    attachment: false,
  },
  {
    id: "RPT-2303",
    type: "Adult content",
    reporter: "SSgt Young",
    target: "Listing LST-8425",
    base: "Travis AFB",
    time: "42m ago",
    attachment: true,
  },
];

export const ReportsSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Reports Center" subtitle="Reports" accent="Priority" />
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
        <button type="button" className="rounded-full border border-border px-3 py-1">
          All
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-warning px-3 py-1 text-warning">
          Scam
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1">
          Weapon
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1">
          Conduct
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
          Filter
          <Filter className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="space-y-3">
        {reports.map((report) => (
          <article
            key={report.id}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-background/90 p-4 shadow-soft md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span>{report.type}</span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
                  {report.base}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Report {report.id}</span>
                <span>By {report.reporter}</span>
                <span>Target {report.target}</span>
                <span>{report.time}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {report.attachment ? (
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Evidence
                </button>
              ) : null}
              <button type="button" className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive">
                <Gavel className="h-3.5 w-3.5" aria-hidden />
                Approve
              </button>
              <button type="button" className="inline-flex items-center gap-1 rounded-full border border-success px-3 py-1 text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Dismiss
              </button>
              <button type="button" className="rounded-full border border-border px-3 py-1">
                Notes
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
