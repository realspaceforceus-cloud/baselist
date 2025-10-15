import { FormEvent, useMemo, useState } from "react";
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
  reportNotes: Record<string, string[]>;
  onApprove: (reportId: string) => void;
  onDismiss: (reportId: string) => void;
  onOpenAttachment: (reportId: string) => void;
  onAddNote: (reportId: string, note: string) => void;
}

export const ReportsSection = ({
  reports,
  reportNotes,
  onApprove,
  onDismiss,
  onOpenAttachment,
  onAddNote,
}: ReportsSectionProps): JSX.Element => {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [noteErrors, setNoteErrors] = useState<Record<string, string>>({});

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

  const openNoteForm = (reportId: string) => {
    setEditingReportId(reportId);
    setNoteDrafts((prev) => ({ ...prev, [reportId]: prev[reportId] ?? "" }));
    setNoteErrors((prev) => {
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  };

  const closeNoteForm = () => {
    setEditingReportId(null);
  };

  const handleNoteSubmit = (event: FormEvent<HTMLFormElement>, reportId: string) => {
    event.preventDefault();
    const draft = noteDrafts[reportId]?.trim() ?? "";
    if (!draft) {
      setNoteErrors((prev) => ({ ...prev, [reportId]: "Add a note before saving." }));
      return;
    }
    onAddNote(reportId, draft);
    setNoteDrafts((prev) => ({ ...prev, [reportId]: "" }));
    setNoteErrors((prev) => {
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
    setEditingReportId(null);
  };

  const handleNoteChange = (reportId: string, value: string) => {
    setNoteDrafts((prev) => ({ ...prev, [reportId]: value }));
    setNoteErrors((prev) => {
      if (!prev[reportId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  };

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
        {filteredReports.map((report) => {
          const notesForReport = reportNotes[report.id] ?? [];

          return (
            <article
              key={report.id}
              className="flex flex-col gap-3 rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                    onClick={() => openNoteForm(report.id)}
                  >
                    Notes
                  </button>
                </div>
              </div>
              {editingReportId === report.id ? (
                <form
                  className="space-y-3 rounded-2xl border border-dashed border-warning bg-warning/5 p-4"
                  onSubmit={(event) => handleNoteSubmit(event, report.id)}
                >
                  <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
                    <span className="text-foreground">Moderation note</span>
                    <textarea
                      className="min-h-[96px] resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
                      placeholder="Document what action you took and why."
                      value={noteDrafts[report.id] ?? ""}
                      onChange={(event) => handleNoteChange(report.id, event.target.value)}
                    />
                  </label>
                  {noteErrors[report.id] ? (
                    <p className="text-xs font-medium text-destructive">{noteErrors[report.id]}</p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                      type="button"
                      className="rounded-full border border-border px-4 py-2"
                      onClick={closeNoteForm}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-warning px-4 py-2 text-warning-foreground shadow-card"
                    >
                      Save note
                    </button>
                  </div>
                </form>
              ) : null}
              {notesForReport.length > 0 ? (
                <div className="rounded-2xl bg-muted/10 p-3 text-xs text-muted-foreground">
                  <p className="mb-2 font-semibold text-foreground">Recent notes</p>
                  <ul className="space-y-1.5">
                    {notesForReport.map((note, index) => (
                      <li key={`${report.id}-note-${index}`} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
        {filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-nav-border bg-background/80 p-6 text-sm text-muted-foreground">
            No reports match the selected filter.
          </div>
        ) : null}
      </div>
    </section>
  );
};
