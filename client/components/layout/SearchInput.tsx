import { Search, X } from "lucide-react";
import { FormEvent } from "react";

import { Input } from "@/components/ui/input";
import { useBaseList } from "@/context/BaseListContext";

export const SearchInput = (): JSX.Element => {
  const { searchQuery, setSearchQuery, clearSearch } = useBaseList();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-none"
      role="search"
      aria-label="Search listings"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search items…"
        aria-label="Search items"
        className="h-11 rounded-2xl border border-border bg-card pl-10 pr-10 text-sm text-foreground shadow-soft placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
      />
      {searchQuery ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clearSearch}
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </form>
  );
};
