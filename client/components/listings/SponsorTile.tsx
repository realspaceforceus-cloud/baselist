import { ArrowUpRight } from "lucide-react";

import { type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SponsorPlacement } from "@/types";

interface SponsorTileProps {
  placement?: SponsorPlacement | null;
}

export const SponsorTile = ({ placement }: SponsorTileProps): JSX.Element | null => {
  if (!placement) {
    return null;
  }

  const hasBackgroundImage = Boolean(placement.backgroundImageUrl);
  const backgroundStyles: CSSProperties | undefined = hasBackgroundImage
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(255,255,255,0.94), rgba(255,255,255,0.88)), url(${placement.backgroundImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <a
      href={placement.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex w-full flex-col gap-3 overflow-hidden rounded-3xl border border-border p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        hasBackgroundImage ? "bg-white/95" : "bg-card",
      )}
      style={backgroundStyles}
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
