import { useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export interface ReportDetail {
  id: string;
  type: string;
  description: string;
  reportedBy: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  target: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  targetType: "listing" | "user" | "thread";
  targetId: string;
  targetLabel: string;
  createdAt: string;
  contentUrl?: string;
}

interface ReportDetailModalProps {
  report: ReportDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

const RESOLUTION_ACTIONS = [
  {
    id: "removed",
    label: "Content Removed",
    message:
      "This content has been removed. Thank you for helping keep our community safe!",
  },
  {
    id: "warning",
    label: "Warning Sent",
    message:
      "Your content was reported and has been reviewed. Please follow our community guidelines.",
  },
  {
    id: "suspended",
    label: "Account Suspended",
    message:
      "Your account has been suspended due to multiple violations of our community guidelines.",
  },
  {
    id: "false_report",
    label: "False Report",
    message: "This report has been reviewed and determined to be false.",
  },
  {
    id: "custom",
    label: "Custom Message",
    message: "",
  },
];

export const ReportDetailModal = ({
  report,
  isOpen,
  onClose,
  onResolved,
}: ReportDetailModalProps) => {
  const [selectedAction, setSelectedAction] = useState<string>("removed");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!report) return null;

  const handleResolve = async () => {
    if (!selectedAction) {
      toast.error("Please select a resolution action");
      return;
    }

    const action = RESOLUTION_ACTIONS.find((a) => a.id === selectedAction);
    const message =
      selectedAction === "custom" ? customMessage : action?.message || "";

    if (!message) {
      toast.error("Please provide a message");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/reports/${report.id}/resolve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "resolved",
            action: selectedAction,
            message,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to resolve report");
      }

      toast.success("Report resolved");
      onResolved();
      onClose();
    } catch (error) {
      toast.error("Failed to resolve report", {
        description: error instanceof Error ? error.message : "Try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <AlertDialogTitle>Review Report</AlertDialogTitle>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <AlertDialogDescription className="space-y-6">
          {/* Report Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Report Details</h3>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <span className="text-sm font-medium capitalize">
                  {report.type}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reported:</span>
                <span className="text-sm">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              {report.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-1">
                    Report Message:
                  </p>
                  <p className="text-sm">{report.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reporter Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Reported By</h3>
            <Link
              to={`/profile/${report.reportedBy.username}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              {report.reportedBy.avatarUrl && (
                <img
                  src={report.reportedBy.avatarUrl}
                  alt={report.reportedBy.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <span className="font-medium hover:underline">
                {report.reportedBy.username}
              </span>
            </Link>
          </div>

          {/* Target Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Reported User</h3>
            <Link
              to={`/profile/${report.target.username}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              {report.target.avatarUrl && (
                <img
                  src={report.target.avatarUrl}
                  alt={report.target.username}
                  className="h-10 w-10 rounded-full object-cover"
                />
              )}
              <span className="font-medium hover:underline">
                {report.target.username}
              </span>
            </Link>
          </div>

          {/* View Content Link */}
          {report.contentUrl && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">
                Reported Content
              </h3>
              <Link
                to={report.contentUrl}
                className="inline-block px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium"
              >
                View{" "}
                {report.targetType === "thread" ? "Message" : report.targetType}
              </Link>
            </div>
          )}

          {/* Resolution Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Resolution Action</h3>
            <div className="space-y-2">
              {RESOLUTION_ACTIONS.map((action) => (
                <label
                  key={action.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="action"
                    value={action.id}
                    checked={selectedAction === action.id}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="h-4 w-4"
                  />
                  <span className="font-medium">{action.label}</span>
                </label>
              ))}
            </div>

            {selectedAction === "custom" && (
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter custom message for reporter and reported user..."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            )}

            {selectedAction !== "custom" && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Message to both parties:
                </p>
                <p className="text-sm">
                  {
                    RESOLUTION_ACTIONS.find((a) => a.id === selectedAction)
                      ?.message
                  }
                </p>
              </div>
            )}
          </div>
        </AlertDialogDescription>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={handleResolve} disabled={isSubmitting}>
            {isSubmitting ? "Resolving..." : "Resolve Report"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
