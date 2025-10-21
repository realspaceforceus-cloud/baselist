import { useState, useEffect } from "react";
import { Check, FileX, MailCheck, Users } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

export interface VerificationQueueSummary {
  id: string;
  label: string;
  count: number;
  description: string;
  icon: LucideIcon;
}

export interface VerificationDocument {
  id: string;
  userId: string;
  name: string;
  method: string;
  submitted: string;
}

export const VerificationSection = () => {
  const [viewMode, setViewMode] = useState<"queues" | "docs">("queues");
  const [queues, setQueues] = useState<VerificationQueueSummary[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVerifications = async () => {
      setIsLoading(true);
      try {
        const result = await (
          await import("@/lib/adminApi")
        ).adminApi.getVerifications();
        const verifications: VerificationDocument[] = (
          result?.verifications || []
        ).map((v: any) => ({
          id: v.id,
          userId: v.userId,
          name: v.userName || "Unknown",
          method: v.method || "Unknown",
          submitted: v.submittedAt
            ? new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(v.submittedAt))
            : "—",
        }));
        setDocuments(verifications);
        setQueues([
          {
            id: "auto",
            label: ".mil Verified",
            count: verifications.filter((d) => d.method === ".mil").length,
            description: "Auto-approved via allow list",
            icon: MailCheck,
          },
          {
            id: "invite",
            label: "Invite Code",
            count: verifications.filter((d) => d.method === "Invite Code")
              .length,
            description: "Moderator review required",
            icon: Users,
          },
          {
            id: "id",
            label: "ID Review",
            count: verifications.filter((d) => d.method === "ID Review").length,
            description: "Manual review required",
            icon: FileX,
          },
        ]);
      } catch (error) {
        console.error("Failed to load verifications:", error);
        const { toast } = await import("sonner");
        toast.error("Failed to load verifications");
        setQueues([]);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadVerifications();
  }, []);

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
          {queues.length === 0 ? (
            <div className="col-span-3 text-center text-muted-foreground p-8">
              No queue data
            </div>
          ) : (
            queues.map((queue) => {
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
                  <div className="text-3xl font-semibold mb-1">
                    {queue.count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {queue.description}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Documents View */}
      {viewMode === "docs" &&
        (isLoading ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : documents.length === 0 ? (
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg text-green-600"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg text-destructive"
                        >
                          <FileX className="h-4 w-4" />
                        </Button>
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
