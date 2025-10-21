import { AlertTriangle, Ban } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Button } from "@/components/ui/button";

export interface AdminFlaggedThread {
  id: string;
  base: string;
  reason: string;
  participants: string;
  excerpt: string;
  accessedBy?: string;
  flaggedAt?: string;
  offendingUserId?: string;
}

interface MessagingSectionProps {
  threads: AdminFlaggedThread[];
  onBan?: (threadId: string, offendingUserId?: string) => void;
  onMarkReviewed?: (threadId: string) => void;
}

export const MessagingSection = ({
  threads = [],
  onBan,
  onMarkReviewed,
}: MessagingSectionProps) => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Messaging"
        subtitle="Manage"
        accent={`${threads.length} flagged`}
      />

      {threads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No flagged threads
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-3xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="font-semibold">{thread.reason}</span>
                    <span className="inline-flex rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      {thread.base}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {thread.participants}
                    {thread.flaggedAt && ` • ${thread.flaggedAt}`}
                  </p>
                  <p className="text-sm text-foreground italic border-l-2 border-muted pl-3">
                    "{thread.excerpt}"
                  </p>
                </div>
                {onBan && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onBan(thread.id, thread.offendingUserId);
                      onMarkReviewed?.(thread.id);
                    }}
                    className="rounded-lg whitespace-nowrap"
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Ban
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
