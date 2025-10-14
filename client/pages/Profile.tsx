import { Link } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  ShieldCheck,
  ShoppingBag,
  Star as StarIcon,
  Stars,
  Tag,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { useBaseList } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";
import type { TransactionHistoryEntry } from "@/types";

const Profile = (): JSX.Element => {
  const {
    user,
    currentBase,
    listings,
    isModerator,
    transactions,
    getUserRatingSummary,
    getMemberName,
  } = useBaseList();

  const myListings = listings.filter((listing) => listing.sellerId === user.id);
  const activeListings = myListings.filter((listing) => listing.status === "active");
  const soldListings = myListings.filter((listing) => listing.status === "sold");

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between md:gap-8">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <BadgeCheck className="h-7 w-7" aria-hidden />
          </span>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.verificationStatus} • Member since {new Date(user.memberSince).getFullYear()}
            </p>
            <p className="text-sm text-muted-foreground">
              Current base: <span className="font-semibold text-foreground">{currentBase.name}</span>
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link to="/post">Create listing</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">My listings</h2>
              <p className="text-sm text-muted-foreground">
                Track active and sold posts in one place.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-nav-border bg-card p-4 text-center">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Active</dt>
              <dd className="text-2xl font-semibold text-foreground">{activeListings.length}</dd>
            </div>
            <div className="rounded-2xl border border-nav-border bg-card p-4 text-center">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sold</dt>
              <dd className="text-2xl font-semibold text-foreground">{soldListings.length}</dd>
            </div>
          </dl>
        </article>
        <article className="flex h-full flex-col justify-between rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Stars className="h-4 w-4 text-primary" aria-hidden />
              Saved items & alerts
            </div>
            <p>
              Saved listings, base-wide alerts, and invite controls will appear here as the product expands.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Want a new feature? Share feedback with your base moderator team.
          </p>
        </article>
      </div>

      {isModerator ? (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Moderation tools</h2>
              <p className="text-sm text-muted-foreground">
                Review reports, manage verification requests, and configure base access lists.
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 rounded-full px-6 md:mt-0">
            <Link to="/moderation">Open moderation</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
};

export default Profile;
