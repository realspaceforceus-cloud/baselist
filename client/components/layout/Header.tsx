import { Gauge, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { BaseSelector } from "@/components/layout/BaseSelector";
import { SearchInput } from "@/components/layout/SearchInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
import { useAuthDialog } from "@/context/AuthDialogContext";

const LOGO_SRC =
  "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F9f8d10811f0e4d94a520d1b0b4d411e2?format=webp&width=320";

const getAvatarInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "BL";
  }
  const words = trimmed.replace(/[_-]+/g, " ").split(" ");
  const letters = words.filter(Boolean).map((word) => word[0]?.toUpperCase() ?? "");
  if (letters.length > 1) {
    return (letters[0] + letters[1]).slice(0, 2);
  }
  const fallback = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return fallback ? fallback.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
};

export const Header = (): JSX.Element => {
  const { user, isDowVerified, isAuthenticated, signOut } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const location = useLocation();

  const showAdminLink = user.role === "admin";
  const avatarInitials = getAvatarInitials(user.name);
  const verificationLabel = isDowVerified ? "Verified" : user.verificationStatus;
  const showSearch = isAuthenticated && location.pathname === "/";

  const logo = (
    <Link to="/" className="flex items-center" aria-label="BaseList home">
      <img src={LOGO_SRC} alt="BaseList" className="h-8 w-auto object-contain md:h-9" />
    </Link>
  );

  const userControls = (
    <>
      {showAdminLink ? (
        <Link
          to="/admin"
          className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
        >
          <Gauge className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Admin</span>
        </Link>
      ) : null}
      <Button
        variant="ghost"
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide"
        type="button"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
      <div className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1.5 shadow-soft">
        <Avatar className="h-9 w-9">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={`${user.name} avatar`} />
          ) : (
            <AvatarFallback className="text-[0.65rem] font-semibold uppercase tracking-wide text-foreground">
              {avatarInitials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck
              className={`h-3 w-3 ${isDowVerified ? "text-verified" : "text-warning"}`}
              aria-hidden
            />
            {verificationLabel}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-nav-border bg-background/95 backdrop-blur-lg">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 md:py-5">
        {isAuthenticated ? (
          <>
            <div className="flex w-full flex-col gap-3 md:gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">{logo}</div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                  {showSearch ? (
                    <div className="hidden md:block md:w-56 lg:w-72">
                      <SearchInput />
                    </div>
                  ) : null}
                  {userControls}
                </div>
              </div>
              <div className="w-full">
                <BaseSelector />
              </div>
            </div>
            {showSearch ? (
              <div className="mt-3 w-full md:hidden">
                <SearchInput />
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            {logo}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                className="rounded-full px-4 py-2 text-sm font-semibold"
                type="button"
                onClick={openSignIn}
              >
                Sign In
              </Button>
              <Button asChild className="rounded-full px-5 py-2 text-sm font-semibold">
                <a href="#join">Join Now</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
