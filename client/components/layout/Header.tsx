import { Gauge, MessageSquare, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { BaseSelector } from "@/components/layout/BaseSelector";
import { SearchInput } from "@/components/layout/SearchInput";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBaseList } from "@/context/BaseListContext";
import { useAuthDialog } from "@/context/AuthDialogContext";

const LOGO_SRC =
  "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F9f8d10811f0e4d94a520d1b0b4d411e2?format=webp&width=320";

export const Header = (): JSX.Element => {
  const {
    user,
    isDodVerified,
    unreadMessageCount,
    isAuthenticated,
    signOut,
    getUserRatingSummary,
  } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const displayName = user.name.includes(" ") ? user.name.split(" ")[0] : user.name;
  const userRatingSummary = getUserRatingSummary(user.id);
  const userRatingFallbackAverage = user.rating ?? null;
  const userRatingFallbackCount = user.ratingCount ?? user.completedSales ?? 0;
  const canManage = user.role !== "member";

  return (
    <header className="sticky top-0 z-30 border-b border-nav-border bg-nav/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:gap-8 md:py-5">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <img
            src={LOGO_SRC}
            alt="BaseList"
            className="h-8 w-auto object-contain md:h-9"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
            BaseList
          </span>
          <Badge variant="secondary" className="rounded-full text-[0.65rem] font-semibold uppercase tracking-wide">
            Built by Active-Duty Airmen
          </Badge>
        </div>

        {isAuthenticated ? (
          <div className="flex flex-1 flex-col gap-3 md:ml-auto md:flex-row md:items-center md:justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm shadow-soft">
              <ShieldCheck className="h-4 w-4 text-verified" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isDodVerified ? "Verified" : user.verificationStatus}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{displayName}</span>
                <RatingBadge
                  userId={user.id}
                  size="sm"
                  initialAverage={
                    userRatingSummary.overallCount > 0
                      ? userRatingSummary.overallAverage
                      : userRatingFallbackAverage
                  }
                  initialCount={
                    userRatingSummary.overallCount > 0
                      ? userRatingSummary.overallCount
                      : userRatingFallbackCount
                  }
                  label={`${user.name} rating`}
                />
              </div>
            </div>
            <BaseSelector />
            <SearchInput />
            {canManage ? (
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  <Gauge className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Admin</span>
              </Link>
            ) : null}
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
            <Button
              variant="ghost"
              className="rounded-full px-4 py-2 text-xs font-semibold"
              type="button"
              onClick={signOut}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-end gap-3 md:ml-auto">
            <Button
              variant="ghost"
              className="rounded-full px-5 py-2 text-sm font-semibold"
              type="button"
              onClick={openSignIn}
            >
              Sign In
            </Button>
            <Button asChild className="rounded-full px-5 py-2 text-sm font-semibold">
              <a href="#join">Join Now</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
