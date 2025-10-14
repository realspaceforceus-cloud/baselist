import { ArrowUpRight } from "lucide-react";

import type { SponsorPlacement } from "@/types";

interface SponsorTileProps {
  placement?: SponsorPlacement | null;
}

export const SponsorTile = ({ placement }: SponsorTileProps): JSX.Element | null => {
  if (!placement) {
    return null;
  }

  return (
    <a
      href={placement.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-muted-foreground/80">
        Sponsor
      </span>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground md:text-2xl">
            {placement.label}
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {placement.description}
          </p>
        </div>
        <span
          className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold text-white shadow-soft"
          style={{ backgroundColor: placement.brandColor }}
        >
          Learn more
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </a>
  );
};
