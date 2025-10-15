import { Check, ChevronDown, MapPin } from "lucide-react";
import { useCallback } from "react";

import { useBaseList } from "@/context/BaseListContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const BaseSelector = (): JSX.Element => {
  const { bases, currentBase, setCurrentBaseId } = useBaseList();

  const handleSelect = useCallback(
    (baseId: string) => {
      setCurrentBaseId(baseId);
    },
    [setCurrentBaseId],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 md:w-auto"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground/80">
              Base
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground md:text-base">
              {currentBase.name}
            </span>
          </span>
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground/80 transition group-hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Switch base</p>
            <p className="text-xs text-muted-foreground">
              Choose another installation to browse its marketplace.
            </p>
          </div>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {bases.map((base) => {
            const isActive = base.id === currentBase.id;
            return (
              <li key={base.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(base.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition",
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {base.abbreviation}
                  </span>
                  <span className="flex flex-col">
                    <span>{base.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {base.region} • {base.timezone}
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto mt-1 h-4 w-4 text-primary transition",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
