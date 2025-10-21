import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";

export interface AdminReportRecord {
  id: string;
  type: string;
  reporter: string;
  targetType: "listing" | "user";
  targetId: string;
  targetLabel: string;
  base: string;
  time: string;
}

interface ReportsSectionProps {
  reports: AdminReportRecord[];
  onApprove?: (reportId: string) => void;
  onDismiss?: (reportId: string) => void;
}

export const ReportsSection = ({
  reports = [],
  onApprove,
  onDismiss,
}: ReportsSectionProps) => {
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const reportTypes = useMemo(() => {
    const types = new Set<string>(reports.map((r) => r.type));
    return ["All", ...Array.from(types)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (activeFilter === "All") return reports;
    return reports.filter((r) => r.type === activeFilter);
  }, [activeFilter, reports]);

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Reports"
        subtitle="Manage"
        accent={`${reports.length} total`}
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {reportTypes.map((type) => (
          <Button
            key={type}
            variant={activeFilter === type ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter(type)}
            className="rounded-full"
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Table */}
      {filteredReports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No reports
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Reporter</th>
                <th className="px-4 py-3 text-left font-semibold">Target</th>
                <th className="px-4 py-3 text-left font-semibold">Base</th>
                <th className="px-4 py-3 text-left font-semibold">Time</th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium capitalize">
                    {report.type}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {report.reporter}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="inline-flex rounded bg-muted px-2 py-1">
                      {report.targetLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {report.base}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {report.time}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {onApprove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onApprove(report.id)}
                          className="h-8 w-8 p-0 rounded-lg text-green-600"
                          title="Approve"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {onDismiss && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDismiss(report.id)}
                          className="h-8 w-8 p-0 rounded-lg text-destructive"
                          title="Dismiss"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
