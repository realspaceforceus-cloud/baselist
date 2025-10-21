import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminAuditEntry {
  id: string;
  actor: string;
  action: string;
  time: string;
}

interface SecurityAuditSectionProps {
  auditEntries?: AdminAuditEntry[];
}

export const SecurityAuditSection = ({ auditEntries = [] }: SecurityAuditSectionProps) => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Security & Audit" subtitle="Security" accent="Logs" />

      {auditEntries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No audit entries
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Actor</th>
                <th className="px-4 py-3 text-left font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.actor}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{entry.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
