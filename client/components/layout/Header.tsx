import { ShieldCheck } from "lucide-react";

import { MessageSquare, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { BaseSelector } from "@/components/layout/BaseSelector";
import { SearchInput } from "@/components/layout/SearchInput";
import { useBaseList } from "@/context/BaseListContext";

const LOGO_SRC =
  "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F9f8d10811f0e4d94a520d1b0b4d411e2?format=webp&width=320";

export const Header = (): JSX.Element => {
  const { user, isVerified, unreadMessageCount } = useBaseList();

  return (
    <header className="sticky top-0 z-30 border-b border-nav-border bg-nav/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:gap-8 md:py-5">
        <div className="flex items-center gap-3">
          <img
            src={LOGO_SRC}
            alt="BaseList"
            className="h-8 w-auto object-contain md:h-9"
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
              BaseList
            </span>
            <span className="text-xs text-muted-foreground md:text-sm">
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
          <Link
            to="/messages"
            className="relative flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="relative inline-flex">
              <MessageSquare className="h-4 w-4" aria-hidden />
              {unreadMessageCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-[0.2rem] text-[0.65rem] font-semibold leading-none text-background">
                  {Math.min(unreadMessageCount, 9)}
                </span>
              ) : null}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Messages
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
};
