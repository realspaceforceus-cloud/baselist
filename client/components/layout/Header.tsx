import { ShieldCheck } from "lucide-react";

import { BaseSelector } from "@/components/layout/BaseSelector";
import { SearchInput } from "@/components/layout/SearchInput";
import { useBaseList } from "@/context/BaseListContext";

export const Header = (): JSX.Element => {
  const { user, isVerified } = useBaseList();

  return (
    <header className="sticky top-0 z-30 border-b border-nav-border bg-nav/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:gap-8 md:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-lg font-semibold">
            BL
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground tracking-tight md:text-xl">
              BaseList
            </span>
            <span className="text-sm text-muted-foreground">
              Buy & sell on base. DoD-verified.
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 md:ml-auto md:flex-row md:items-center md:justify-end">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm shadow-soft">
            <ShieldCheck className="h-4 w-4 text-verified" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isVerified ? "Verified" : user.verificationStatus}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {user.name.split(" ")[0]}
            </span>
          </div>
          <BaseSelector />
          <SearchInput />
        </div>
      </div>
    </header>
  );
};
