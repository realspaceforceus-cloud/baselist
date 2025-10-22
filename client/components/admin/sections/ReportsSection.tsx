import { useState, useMemo, useEffect } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import {
  ReportDetailModal,
  ReportDetail,
} from "@/components/admin/ReportDetailModal";
import { toast } from "sonner";

export interface AdminReportRecord {
  id: string;
  type: string;
  reporter: string;
  reporterId: string;
  reporterAvatar?: string;
  notes: string;
  targetType: "listing" | "user" | "thread";
  targetId: string;
  targetLabel: string;
  targetUsername?: string;
  base: string;
  time: string;
  createdAt: string;
}

export const ReportsSection = () => {
  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(
    null,
  );
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      try {
        const result = await (
          await import("@/lib/adminApi")
        ).adminApi.getReports();
        const reportRecords: AdminReportRecord[] = (result?.reports || []).map(
          (report: any) => ({
            id: report.id,
            type: report.type || "Unknown",
            reporter: report.reportedBy || "Unknown",
            reporterId: report.reporterId || "",
            reporterAvatar: report.reporterAvatar,
            notes: report.notes || "",
            targetType: report.targetType || "listing",
            targetId: report.targetId || "",
            targetLabel: report.targetLabel || "Unknown",
            targetUsername: report.targetUsername,
            base: report.baseId || "Unknown",
            createdAt: report.createdAt || "",
            time: report.createdAt
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(report.createdAt))
              : "—",
          }),
        );
        setReports(reportRecords);
      } catch (error) {
        console.error("Failed to load reports:", error);
        toast.error("Failed to load reports");
        setReports([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadReports();
  }, []);

  const reportTypes = useMemo(() => {
    const types = new Set<string>(reports.map((r) => r.type));
    return ["All", ...Array.from(types)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    if (activeFilter === "All") return reports;
    return reports.filter((r) => r.type === activeFilter);
  }, [activeFilter, reports]);

  const handleReportResolved = () => {
    setShowDetailModal(false);
    setSelectedReport(null);
    // Reload reports
    const loadReports = async () => {
      try {
        const result = await (
          await import("@/lib/adminApi")
        ).adminApi.getReports();
        const reportRecords: AdminReportRecord[] = (result?.reports || []).map(
          (report: any) => ({
            id: report.id,
            type: report.type || "Unknown",
            reporter: report.reportedBy || "Unknown",
            reporterId: report.reporterId || "",
            reporterAvatar: report.reporterAvatar,
            notes: report.notes || "",
            targetType: report.targetType || "listing",
            targetId: report.targetId || "",
            targetLabel: report.targetLabel || "Unknown",
            targetUsername: report.targetUsername,
            base: report.baseId || "Unknown",
            createdAt: report.createdAt || "",
            time: report.createdAt
              ? new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(report.createdAt))
              : "—",
          }),
        );
        setReports(reportRecords);
      } catch (error) {
        console.error("Failed to reload reports:", error);
      }
    };
    loadReports();
  };

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Reports"
        subtitle="Manage"
        accent={`${reports.length} total`}
      />

      <ReportDetailModal
        report={selectedReport}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onResolved={handleReportResolved}
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
      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : filteredReports.length === 0 ? (
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
                  <td className="px-4 py-3 text-xs">
                    <Link
                      to={`/profile/${report.reporter}`}
                      className="text-primary hover:underline"
                    >
                      {report.reporter}
                    </Link>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg text-green-600"
                        onClick={() => {
                          setSelectedReport({
                            id: report.id,
                            type: report.type,
                            description: report.notes,
                            reportedBy: {
                              id: report.reporterId,
                              username: report.reporter,
                              avatarUrl: report.reporterAvatar,
                            },
                            target: {
                              id: report.targetId,
                              username: report.targetUsername || "Unknown",
                              avatarUrl: "",
                            },
                            targetType: report.targetType as
                              | "listing"
                              | "user"
                              | "thread",
                            targetId: report.targetId,
                            targetLabel: report.targetLabel,
                            createdAt: report.createdAt,
                          });
                          setShowDetailModal(true);
                        }}
                        title="Resolve report"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
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
