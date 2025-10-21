import { useState, useEffect } from "react";
import { Building2, AlertCircle } from "lucide-react";
import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminBaseRow {
  id: string;
  name: string;
  region: string;
  moderator: string;
  users: number;
  activeListings: number;
  pendingReports: number;
}

export const BasesSection = () => {
  const [bases, setBases] = useState<AdminBaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // TODO: Fetch from API when endpoint is ready
    setBases([]);
    setIsLoading(false);
  }, []);

  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Bases" subtitle="Manage" accent={`${bases.length} total`} />

      {isLoading ? (
        <div className="rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : bases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No bases found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Base</th>
                <th className="px-4 py-3 text-left font-semibold">Region</th>
                <th className="px-4 py-3 text-left font-semibold">Moderator</th>
                <th className="px-4 py-3 text-center font-semibold">Users</th>
                <th className="px-4 py-3 text-center font-semibold">Listings</th>
                <th className="px-4 py-3 text-center font-semibold">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bases.map((base) => (
                <tr key={base.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {base.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{base.region}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{base.moderator}</td>
                  <td className="px-4 py-3 text-center font-medium">{base.users}</td>
                  <td className="px-4 py-3 text-center font-medium">{base.activeListings}</td>
                  <td className="px-4 py-3 text-center">
                    {base.pendingReports > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                        <AlertCircle className="h-3 w-3" />
                        {base.pendingReports}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
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
