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
          className="group flex w-full items-center gap-3 rounded-2xl border border-transparent bg-primary/5 px-4 py-2 text-left transition hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:w-auto"
        >
          <span className="hidden rounded-full bg-primary/15 p-2 text-primary md:flex">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Base
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground md:text-base">
              {currentBase.name}
            </span>
          </span>
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
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
