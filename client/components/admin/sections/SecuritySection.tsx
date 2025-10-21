import { Fingerprint, History, Lock, ShieldAlert } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  time: string;
}

interface SecuritySectionProps {
  auditEntries?: AdminAuditEntry[];
}

export const SecuritySection = ({ auditEntries = [] }: SecuritySectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Security & Audit" subtitle="Security" accent="2FA" />
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            Two-factor required for admin and moderator logins.
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Enforce WebAuthn hardware keys for admins. SMS fallback expires after one hour of inactivity.
          </p>
        </article>
        <article className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 text-warning" aria-hidden />
            All actions stamped with actor, target, and result.
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Logs retained for 90 days. Export to command-level oversight with encrypted delivery.
          </p>
        </article>
      </div>
      <div className="rounded-3xl border border-border bg-card/90 p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-primary" aria-hidden />
          Latest audit entries
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {auditEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-2"
            >
              <span className="font-semibold text-foreground">{entry.action}</span>
              <span className="text-xs text-muted-foreground">
                {entry.actor} • {entry.time}
              </span>
            </li>
          ))}
          {auditEntries.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-3 text-xs text-muted-foreground">
              No administrative actions recorded yet today.
            </li>
          ) : null}
        </ul>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Fingerprint className="h-4 w-4 text-muted-foreground" aria-hidden />
          Audit trail stored for 90 days.
        </div>
      </div>
    </section>
  );
};
