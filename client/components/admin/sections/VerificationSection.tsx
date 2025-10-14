import type { LucideIcon } from "lucide-react";
import { Check, Eye, FileX } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

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
  onApprove: (documentId: string) => void;
  onDeny: (documentId: string) => void;
}

export const VerificationSection = ({
  queues,
  documents,
  onApprove,
  onDeny,
}: VerificationSectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Verification Requests" subtitle="Verification" accent="Identity" />
      <div className="grid gap-3 md:grid-cols-3">
        {queues.map((queue) => {
          const Icon = queue.icon;

          return (
            <article
              key={queue.id}
              className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {queue.label}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <span className="text-3xl font-semibold text-foreground">{queue.count}</span>
                <span className={`text-xs font-medium ${queue.toneClass ?? "text-muted-foreground"}`}>
                  {queue.description}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <div className="space-y-3 rounded-3xl border border-border bg-card/90 p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Latest submissions</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Auto-delete after decision
          </span>
        </div>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-3 text-sm"
            >
              <div className="space-y-0.5">
                <div className="font-semibold text-foreground">
                  {doc.name}
                  <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning">
                    {doc.method}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Submitted {doc.submitted}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <a
                  href={doc.url}
                  className="rounded-full border border-border px-3 py-1"
                  target="_blank"
                  rel="noreferrer"
                >
                  View proof
                </a>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-success px-3 py-1 text-success"
                  onClick={() => onApprove(doc.id)}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Approve
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive"
                  onClick={() => onDeny(doc.id)}
                >
                  <FileX className="h-3.5 w-3.5" aria-hidden />
                  Deny
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-5 text-sm text-muted-foreground">
              All manual requests are cleared.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
