import { useState, useMemo } from "react";
import { Check, FileX } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export interface VerificationQueueSummary {
  id: string;
  label: string;
  count: number;
  description: string;
  icon: LucideIcon;
  toneClass?: string;
}

export interface VerificationDocument {
  id: string;
  userId: string;
  name: string;
  method: string;
  submitted: string;
  url: string;
}

interface VerificationSectionProps {
  queues: VerificationQueueSummary[];
  documents: VerificationDocument[];
  onApprove?: (documentId: string) => void;
  onDeny?: (documentId: string) => void;
}

export const VerificationSection = ({
  queues = [],
  documents = [],
  onApprove,
  onDeny,
}: VerificationSectionProps) => {
  const [viewMode, setViewMode] = useState<"queues" | "docs">("queues");

  const methodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      counts[doc.method] = (counts[doc.method] || 0) + 1;
    });
    return counts;
  }, [documents]);

  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Verification"
        subtitle="Manage"
        accent={`${documents.length} pending`}
      />

      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "queues" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("queues")}
          className="rounded-full"
        >
          Queues
        </Button>
        <Button
          variant={viewMode === "docs" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("docs")}
          className="rounded-full"
        >
          Documents
        </Button>
      </div>

      {/* Queues View */}
      {viewMode === "queues" && (
        <div className="grid gap-3 md:grid-cols-3">
          {queues.map((queue) => {
            const Icon = queue.icon;
            return (
              <div
                key={queue.id}
                className="rounded-3xl border border-border bg-background/90 p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase">
                    {queue.label}
                  </span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-3xl font-semibold mb-1">{queue.count}</div>
                <p className="text-xs text-muted-foreground">
                  {queue.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Documents View */}
      {viewMode === "docs" &&
        (documents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
            No documents pending
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Method</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{doc.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {doc.method}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {doc.submitted}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {onApprove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onApprove(doc.id)}
                            className="h-8 w-8 p-0 rounded-lg text-green-600"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeny && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeny(doc.id)}
                            className="h-8 w-8 p-0 rounded-lg text-destructive"
                            title="Deny"
                          >
                            <FileX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
};
