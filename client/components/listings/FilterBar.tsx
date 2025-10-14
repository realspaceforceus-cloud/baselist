import { cn } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ListingFilter } from "@/types";

interface FilterBarProps {
  filters: ListingFilter[];
  activeFilter: ListingFilter;
  onFilterChange: (filter: ListingFilter) => void;
}

export const FilterBar = ({
  filters,
  activeFilter,
  onFilterChange,
}: FilterBarProps): JSX.Element => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <button
            key={filter}
            type="button"
            onClick={() => onFilterChange(filter)}
            aria-pressed={isActive}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              isActive
                ? "border-primary/60 bg-primary/10 text-primary shadow-soft"
                : "border-border/70 bg-background/60 text-foreground/80 hover:bg-muted/60",
            )}
          >
            {filter}
          </button>
        );
      })}
    </div>
  );
};
