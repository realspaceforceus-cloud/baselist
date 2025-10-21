import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";
import { Megaphone } from "lucide-react";
import type { SponsorPlacement } from "@/types";

interface AdminSponsorRow extends SponsorPlacement {
  baseName: string;
}

interface SponsorsSectionProps {
  placements: AdminSponsorRow[];
}

export const SponsorsSection = ({ placements = [] }: SponsorsSectionProps) => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader
        title="Sponsors"
        subtitle="Manage"
        accent={`${placements.length} total`}
      />

      {placements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background/50 p-8 text-center text-muted-foreground">
          No sponsors configured
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {placements.map((placement) => (
            <div
              key={placement.id}
              className="rounded-3xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{placement.label}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">{placement.description}</p>
                <p className="text-xs">
                  <span className="font-medium">Base:</span>{" "}
                  {placement.baseName}
                </p>
                <p className="text-xs">
                  <span className="font-medium">Link:</span>{" "}
                  <a
                    href={placement.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {placement.href}
                  </a>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
