import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Filter, Gavel } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export type AdminReportTarget = "listing" | "user";

export interface AdminReportRecord {
  id: string;
  type: string;
  reporter: string;
  targetType: AdminReportTarget;
  targetId: string;
  targetLabel: string;
  base: string;
  time: string;
  attachmentUrl?: string;
}

interface ReportsSectionProps {
  reports: AdminReportRecord[];
  onApprove: (reportId: string) => void;
  onDismiss: (reportId: string) => void;
  onOpenAttachment: (reportId: string) => void;
  onAddNote: (reportId: string) => void;
}

export const ReportsSection = ({
  reports,
  onApprove,
  onDismiss,
  onOpenAttachment,
  onAddNote,
}: ReportsSectionProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const reportTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach((report) => types.add(report.type));
    return ["All", ...Array.from(types)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (activeFilter === "All") {
      return reports;
    }
    return reports.filter((report) => report.type === activeFilter);
  }, [activeFilter, reports]);

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Reports Center" subtitle="Reports" accent="Priority" />
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
        {reportTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={
              activeFilter === type
                ? "inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-card"
                : "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
            }
          >
            {type}
            {type === "Scam" || type === "Weapon" ? (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            ) : null}
          </button>
        ))}
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
          onClick={() => setActiveFilter("All")}
        >
          Filter
          <Filter className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="space-y-3">
        {filteredReports.map((report) => (
          <article
            key={report.id}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-background/90 p-4 shadow-soft md:flex-row md:items-center md:justify-between"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                <span>{report.type}</span>
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
                  {report.base}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Report {report.id}</span>
                <span>By {report.reporter}</span>
                <span>
                  Target {report.targetType === "listing" ? "Listing" : "User"} {report.targetLabel}
                </span>
                <span>{report.time}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {report.attachmentUrl ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1"
                  onClick={() => onOpenAttachment(report.id)}
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  Evidence
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive"
                onClick={() => onApprove(report.id)}
              >
                <Gavel className="h-3.5 w-3.5" aria-hidden />
                Approve
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-success px-3 py-1 text-success"
                onClick={() => onDismiss(report.id)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Dismiss
              </button>
              <button
                type="button"
                className="rounded-full border border-border px-3 py-1"
                onClick={() => onAddNote(report.id)}
              >
                Notes
              </button>
            </div>
          </article>
        ))}
        {filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-nav-border bg-background/80 p-6 text-sm text-muted-foreground">
            No reports match the selected filter.
          </div>
        ) : null}
      </div>
    </section>
  );
};
