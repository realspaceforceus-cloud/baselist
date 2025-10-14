import { Check, Eye, FileX, MailCheck, Users } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const verificationQueues = [
  {
    id: "auto",
    label: ".mil Verified",
    count: 128,
    description: "Auto-approved via base allow list",
    icon: MailCheck,
    tone: "text-success",
  },
  {
    id: "invite",
    label: "Invite Code",
    count: 19,
    description: "Moderator review required",
    icon: Users,
    tone: "text-primary",
  },
  {
    id: "id",
    label: "ID Review",
    count: 7,
    description: "Upload expires after action",
    icon: Eye,
    tone: "text-warning",
  },
];

const documents = [
  {
    id: "VRF-5102",
    name: "SrA Teague",
    method: "ID Review",
    submitted: "7m ago",
    url: "https://cdn.builder.io/api/v1/image/assets%2Fverification-proof.png",
  },
  {
    id: "VRF-5103",
    name: "Capt Bennett",
    method: "Invite Code",
    submitted: "12m ago",
    url: "https://cdn.builder.io/api/v1/image/assets%2Fverification-proof-2.png",
  },
];

export const VerificationSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Verification Requests" subtitle="Verification" accent="Identity" />
      <div className="grid gap-3 md:grid-cols-3">
        {verificationQueues.map((queue) => {
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
                <span className={`text-xs font-medium ${queue.tone}`}>{queue.description}</span>
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
            <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-3 text-sm">
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
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-success px-3 py-1 text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Approve
                </button>
                <button type="button" className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive">
                  <FileX className="h-3.5 w-3.5" aria-hidden />
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
