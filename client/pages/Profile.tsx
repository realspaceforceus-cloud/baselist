import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Star as StarIcon,
  Stars,
  Tag,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RatingBadge } from "@/components/shared/RatingBadge";
import { useBaseList } from "@/context/BaseListContext";
import { useUserListings } from "@/hooks/useListings";
import { cn } from "@/lib/utils";
import type { TransactionHistoryEntry, UserProfile, Listing } from "@/types";

const Profile = (): JSX.Element => {
  const {
    user: currentUser,
    bases,
    currentBase,
    listings,
    isModerator,
    transactions,
    isAuthenticated,
    getUserRatingSummary,
    getMemberName,
    getMemberProfile,
    notices,
    markNoticeRead,
  } = useBaseList();

  const { memberId } = useParams<{ memberId?: string }>();
  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Clear fetched user when navigating to own profile
  useEffect(() => {
    if (!memberId || (currentUser && memberId === currentUser.id)) {
      setFetchedUser(null);
      setIsLoadingUser(false);
    }
  }, [memberId, currentUser?.id]);

  // Fetch user from API if not in local context
  useEffect(() => {
    if (!memberId || (currentUser && memberId === currentUser.id)) {
      return;
    }

    // Fetch from API
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch(`/.netlify/functions/users/${memberId}`, {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setFetchedUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setFetchedUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [memberId, currentUser.id]);

  // Determine viewing own profile (must come before other hooks)
  const isViewingOwnProfile = !memberId || memberId === currentUser.id;

  const profileUser = useMemo(() => {
    if (isViewingOwnProfile) {
      return currentUser;
    }
    // Try local context first, then fetched user
    return getMemberProfile(memberId) ?? fetchedUser ?? null;
  }, [
    currentUser,
    getMemberProfile,
    memberId,
    fetchedUser,
    isViewingOwnProfile,
  ]);

  // Fetch user's listings using React Query hook (only fetch when we have a valid user)
  const { data: listingsResponse, isLoading: isLoadingListings } =
    useUserListings(profileUser?.id ? profileUser.id : null);

  const profileBase = useMemo(() => {
    if (isViewingOwnProfile) {
      return currentBase;
    }
    if (!profileUser) return currentBase;
    return (
      bases.find((base) => base.id === profileUser.currentBaseId) ?? currentBase
    );
  }, [
    bases,
    currentBase,
    profileUser?.currentBaseId,
    isViewingOwnProfile,
    profileUser,
  ]);

  // Show error if profile not found (check after all hooks)
  if (profileUser === null) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-card">
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            Member Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            This member's profile is not available or you need to sign in to
            view it.
          </p>
          <Link to="/" className="text-primary hover:underline font-semibold">
            Return to home
          </Link>
        </div>
      </section>
    );
  }

  // Show a message if guest tries to view their own profile without memberId
  if (!isAuthenticated && isViewingOwnProfile) {
    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-card">
          <h1 className="text-3xl font-semibold text-foreground mb-3">
            View Your Profile
          </h1>
          <p className="text-muted-foreground mb-6">
            Sign in to view your profile and complete your member journey.
          </p>
          <Link to="/" className="text-primary hover:underline font-semibold">
            Sign in to continue
          </Link>
        </div>
      </section>
    );
  }

  const profileFirstName = useMemo(() => {
    return profileUser.name.includes(" ")
      ? profileUser.name.split(" ")[0]
      : profileUser.name;
  }, [profileUser.name]);

  const profileMemberSinceYear = useMemo(
    () => new Date(profileUser.memberSince).getFullYear(),
    [profileUser.memberSince],
  );

  // Use API-fetched listings or filter from context if viewing own profile
  const myListings = useMemo(() => {
    if (!profileUser?.id) return [];
    if (isViewingOwnProfile) {
      return listings.filter((listing) => listing.sellerId === profileUser.id);
    }
    return listingsResponse?.listings || [];
  }, [listingsResponse, listings, profileUser?.id, isViewingOwnProfile]);

  const activeListings = myListings.filter(
    (listing) => listing.status === "active",
  );
  const soldListings = myListings.filter(
    (listing) => listing.status === "sold",
  );

  const purchases = transactions.filter(
    (entry) => entry.buyerId === profileUser.id,
  );
  const sales = transactions.filter(
    (entry) => entry.sellerId === profileUser.id,
  );
  const totalTransactions = purchases.length + sales.length;
  const profileRatingSummary = getUserRatingSummary(profileUser.id);
  const profileRatingFallbackAverage = profileUser.rating ?? null;
  const profileRatingFallbackCount =
    profileUser.ratingCount ?? profileUser.completedSales ?? 0;

  const userNotices = useMemo(
    () =>
      isViewingOwnProfile && profileUser
        ? notices
            .filter(
              (notice) =>
                (notice.userId === profileUser.id || notice.userId === "all") &&
                notice.category !== "payout",
            )
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
        : [],
    [notices, profileUser?.id, isViewingOwnProfile, profileUser],
  );

  const noticeSeverityClass: Record<string, string> = {
    info: "text-muted-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  const ratingGlyphs = [1, 2, 3, 4, 5];

  const formatTransactionDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));

  const formatNoticeDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const renderStars = (score?: number) => {
    if (!score) {
      return <span className="text-muted-foreground/70">No rating</span>;
    }

    return (
      <span
        className="inline-flex items-center gap-0.5"
        aria-label={`${score} star rating`}
      >
        {ratingGlyphs.map((value) => (
          <StarIcon
            key={value}
            className={cn(
              "h-3.5 w-3.5",
              value <= Math.round(score)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30",
            )}
          />
        ))}
      </span>
    );
  };

  const renderTransactionList = (
    entries: TransactionHistoryEntry[],
    role: "buyer" | "seller",
  ) => {
    if (entries.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-xs text-muted-foreground">
          {role === "buyer" ? "No purchases yet." : "No sales yet."}
        </div>
      );
    }

    return (
      <ul className="space-y-3">
        {entries.map((entry) => {
          const listing = listings.find((item) => item.id === entry.listingId);
          const partnerId = role === "buyer" ? entry.sellerId : entry.buyerId;
          const partnerName = getMemberName(partnerId);
          const priceLabel =
            entry.price === null || entry.price === 0
              ? "Free"
              : `$${entry.price.toLocaleString("en-US")}`;
          const completedLabel = formatTransactionDate(entry.completedAt);
          const givenRating =
            role === "buyer"
              ? entry.buyerRatingAboutSeller
              : entry.sellerRatingAboutBuyer;
          const receivedRating =
            role === "buyer"
              ? entry.sellerRatingAboutBuyer
              : entry.buyerRatingAboutSeller;

          return (
            <li key={`${entry.threadId}-${role}`}>
              <div className="flex gap-3 rounded-3xl border border-border bg-background/80 p-4 shadow-soft">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                  {listing?.imageUrls?.[0] ? (
                    <img
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ShoppingBag className="h-5 w-5" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {listing?.title ?? "Listing removed"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {priceLabel} • {completedLabel}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {role === "buyer" ? "Seller" : "Buyer"}:
                      </span>
                      <span className="flex items-center gap-2 text-foreground">
                        {partnerId ? (
                          <Link
                            to={`/profile/${partnerId}`}
                            className="font-semibold text-foreground transition hover:text-primary"
                          >
                            {partnerName}
                          </Link>
                        ) : (
                          partnerName
                        )}
                        {partnerId ? (
                          <RatingBadge userId={partnerId} size="sm" />
                        ) : null}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {isViewingOwnProfile
                          ? "You rated"
                          : `${profileFirstName} rated`}
                      </span>
                      {renderStars(givenRating)}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {isViewingOwnProfile
                          ? "They rated you"
                          : `${partnerName} rated ${profileFirstName}`}
                      </span>
                      {renderStars(receivedRating)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const defaultTransactionTab = purchases.length > 0 ? "purchases" : "sales";

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between md:gap-8">
        <div className="flex items-center gap-4">
          {profileUser?.avatarUrl ? (
            <img
              src={profileUser.avatarUrl}
              alt={profileUser.name}
              className="h-14 w-14 rounded-3xl object-cover border border-border"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
              <BadgeCheck className="h-7 w-7" aria-hidden />
            </span>
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-foreground">
              {profileUser.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profileUser.verificationStatus} • Member since{" "}
              {profileMemberSinceYear}
            </p>
            <p className="text-sm text-muted-foreground">
              Current base:{" "}
              <span className="font-semibold text-foreground">
                {profileBase.name}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <RatingBadge
                userId={profileUser.id}
                size="md"
                initialAverage={
                  profileRatingSummary.overallCount > 0
                    ? profileRatingSummary.overallAverage
                    : profileRatingFallbackAverage
                }
                initialCount={
                  profileRatingSummary.overallCount > 0
                    ? profileRatingSummary.overallCount
                    : profileRatingFallbackCount
                }
                label={`${profileUser.name} rating`}
              />
              <span>
                {totalTransactions} transaction
                {totalTransactions === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background/80 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isViewingOwnProfile
                  ? "My listings"
                  : `${profileFirstName}'s listings`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Track active and sold posts in one place.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-nav-border bg-card p-4 text-center">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Active
              </dt>
              <dd className="text-2xl font-semibold text-foreground">
                {activeListings.length}
              </dd>
            </div>
            <div className="rounded-2xl border border-nav-border bg-card p-4 text-center">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Sold
              </dt>
              <dd className="text-2xl font-semibold text-foreground">
                {soldListings.length}
              </dd>
            </div>
          </dl>
          {isViewingOwnProfile && (
            <Button
              asChild
              variant="outline"
              className="mt-4 rounded-xl w-full"
              size="sm"
            >
              <Link to="/my-listings">Manage listings</Link>
            </Button>
          )}
        </article>
        <article className="flex h-full flex-col justify-between rounded-3xl border border-dashed border-nav-border bg-background/70 p-6 text-sm text-muted-foreground">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Stars className="h-4 w-4 text-primary" aria-hidden />
              {isViewingOwnProfile
                ? "Saved items & alerts"
                : `${profileFirstName}'s highlights`}
            </div>
            <p>
              Saved listings, base-wide alerts, and invite controls will appear
              here as the product expands.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Want a new feature? Share feedback with your base moderator team.
          </p>
        </article>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {isViewingOwnProfile
                  ? "My transactions"
                  : `${profileFirstName}'s transactions`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Purchases and sales history, all in one place.
              </p>
            </div>
          </div>
          <RatingBadge
            userId={profileUser.id}
            size="sm"
            initialAverage={
              profileRatingSummary.overallCount > 0
                ? profileRatingSummary.overallAverage
                : profileRatingFallbackAverage
            }
            initialCount={
              profileRatingSummary.overallCount > 0
                ? profileRatingSummary.overallCount
                : profileRatingFallbackCount
            }
            label={`${profileUser.name} overall rating`}
          />
        </div>
        <Tabs defaultValue={defaultTransactionTab} className="mt-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2 rounded-full bg-muted/60 p-1">
            <TabsTrigger
              value="purchases"
              className="rounded-full text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-1">
                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                Purchases ({purchases.length})
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="sales"
              className="rounded-full text-xs font-semibold"
            >
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" aria-hidden />
                Sales ({sales.length})
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="purchases" className="mt-4 space-y-3">
            {renderTransactionList(purchases, "buyer")}
          </TabsContent>
          <TabsContent value="sales" className="mt-4 space-y-3">
            {renderTransactionList(sales, "seller")}
          </TabsContent>
        </Tabs>
      </section>

      {isViewingOwnProfile ? (
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Account notices
              </h2>
              <p className="text-sm text-muted-foreground">
                Audit trail of reports and strikes on your account.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {userNotices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-nav-border bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                No notices yet—you're in good standing.
              </div>
            ) : (
              userNotices.map((notice) => (
                <article
                  key={notice.id}
                  className="rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-soft"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[0.65rem] uppercase tracking-wide ${noticeSeverityClass[notice.severity] ?? "text-muted-foreground"}`}
                      >
                        {notice.category}
                      </span>
                      <span>{notice.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatNoticeDate(notice.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {notice.message}
                  </p>
                  {!notice.read ? (
                    <button
                      type="button"
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                      onClick={() => markNoticeRead(notice.id)}
                    >
                      Mark as read
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {isModerator ? (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Moderation tools
              </h2>
              <p className="text-sm text-muted-foreground">
                Review reports, manage verification requests, and configure base
                access lists.
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
