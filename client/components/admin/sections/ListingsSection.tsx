import { AlertTriangle, ArrowLeftRight, Eye, RefreshCcw, ShieldOff } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

const listings = [
  {
    id: "LST-8421",
    item: "Peloton Bike+",
    base: "Joint Base Lewis-McChord",
    price: "$1,100",
    seller: "Capt Harper",
    date: "Oct 12",
    status: "Flagged",
    reports: 3,
  },
  {
    id: "LST-8422",
    item: "Nursery crib",
    base: "Ramstein AB",
    price: "$80",
    seller: "SSgt Lane",
    date: "Oct 13",
    status: "Active",
    reports: 0,
  },
  {
    id: "LST-8423",
    item: "PCS storage bins",
    base: "Travis AFB",
    price: "Free",
    seller: "MSgt Ford",
    date: "Oct 11",
    status: "Removed",
    reports: 4,
  },
];

export const ListingsSection = (): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Listings Oversight" subtitle="Listings" accent="Monitor" />
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        <button type="button" className="rounded-full bg-primary px-3 py-1 text-primary-foreground">
          Active
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1">
          Sold
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-warning px-3 py-1 text-warning">
          Flagged
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className="rounded-full border border-border px-3 py-1">
          Removed
        </button>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border shadow-soft">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-left">Base</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Seller</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Reports</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card/80">
            {listings.map((listing) => (
              <tr key={listing.id} className="hover:bg-muted/40">
                <td className="px-4 py-3 font-semibold text-foreground">{listing.item}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.base}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.price}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.seller}</td>
                <td className="px-4 py-3 text-muted-foreground">{listing.date}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      listing.status === "Flagged"
                        ? "rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-warning"
                        : listing.status === "Removed"
                        ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-destructive"
                        : "rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-success"
                    }
                  >
                    {listing.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{listing.reports}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button type="button" className="rounded-full border border-border px-3 py-1">
                      View
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-destructive px-3 py-1 text-destructive">
                      Remove
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                      Restore
                      <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button type="button" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
                      Messages
                      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5 text-primary" aria-hidden /> Listings with more than two verified reports auto-hide until review completes.
      </p>
    </section>
  );
};
