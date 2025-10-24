import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  ClipboardList,
  HelpCircle,
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
import { generateSlug } from "@/lib/slugUtils";
import type {
  TransactionHistoryEntry,
  UserProfile,
  Listing,
  Rating,
} from "@/types";

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
  const navigate = useNavigate();
  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [profileRatings, setProfileRatings] = useState<any[]>([]);
  const [profileRatingsTotal, setProfileRatingsTotal] = useState(0);
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);

  // Redirect to /{username} if user navigates to /profile without username
  useEffect(() => {
    if (!memberId && isAuthenticated && currentUser) {
      // Always use username as it's the cleaner URL identifier
      if (currentUser.username) {
        navigate(`/profile/${currentUser.username}`, { replace: true });
      }
    }
  }, [memberId, isAuthenticated, currentUser, navigate]);

  console.log(
    "[Profile] Rendering with memberId:",
    memberId,
    "currentUser.id:",
    currentUser?.id,
    "fetchedUser:",
    fetchedUser?.id,
  );

  // Clear fetched user when navigating to own profile
  useEffect(() => {
    if (
      !memberId ||
      (currentUser &&
        (memberId === currentUser.id || memberId === currentUser.username))
    ) {
      setFetchedUser(null);
      setIsLoadingUser(false);
    }
  }, [memberId, currentUser?.id, currentUser?.username]);

  // Fetch user from API if not in local context
  useEffect(() => {
    if (
      !memberId ||
      (currentUser &&
        (memberId === currentUser.id || memberId === currentUser.username))
    ) {
      return;
    }

    // Fetch from API (can use username or id)
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        const response = await fetch(`/api/users/${memberId}`, {
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

    // Refetch profile data every 5 seconds when viewing own profile to catch rating updates
    const interval = setInterval(() => {
      fetchUser();
    }, 5000);

    return () => clearInterval(interval);
  }, [memberId, currentUser?.id, currentUser?.username]);

  // Determine viewing own profile (must come before other hooks)
  // Safe boolean: don't read currentUser.id unless it exists
  const isViewingOwnProfile =
    !memberId ||
    (currentUser &&
      (currentUser.id === memberId || currentUser.username === memberId));
  console.log("[Profile] isViewingOwnProfile:", isViewingOwnProfile);

  const profileUser = useMemo(() => {
    // Always prefer fetchedUser when available (includes refreshed data)
    // Fall back to currentUser only when viewing own profile and fetchedUser isn't available
    const result =
      fetchedUser || (isViewingOwnProfile ? currentUser : null) || null;
    console.log(
      "[Profile] useMemo profileUser:",
      result?.id,
      "dependencies: isViewingOwnProfile=",
      isViewingOwnProfile,
      "fetchedUser available=",
      !!fetchedUser,
    );
    return result;
  }, [isViewingOwnProfile, currentUser, fetchedUser]);

  // Fetch user's listings using React Query hook (only fetch when we have a valid user)
  const { data: listingsResponse, isLoading: isLoadingListings } =
    useUserListings(profileUser?.id || null);

  const profileBase = useMemo(() => {
    if (isViewingOwnProfile) {
      return currentBase ?? null;
    }
    if (!profileUser) return currentBase ?? null;
    const found = bases.find((base) => base.id === profileUser.currentBaseId);
    const result = found ?? currentBase ?? null;
    console.log("[Profile] useMemo profileBase:", result?.id);
    return result;
  }, [bases, currentBase, profileUser, isViewingOwnProfile]);

  // Define all hooks BEFORE any early returns (required by React rules of hooks)
  const profileFirstName = useMemo(() => {
    if (!profileUser) return "";
    return profileUser.name.includes(" ")
      ? profileUser.name.split(" ")[0]
      : profileUser.name;
  }, [profileUser?.name]);

  const profileMemberSinceYear = useMemo(() => {
    if (!profileUser?.memberSince) return new Date().getFullYear();
    return new Date(profileUser.memberSince).getFullYear();
  }, [profileUser?.memberSince]);

  // Use API-fetched listings or filter from context if viewing own profile
  const myListings = useMemo(() => {
    if (!profileUser) return [];
    if (isViewingOwnProfile) {
      return listings.filter((listing) => listing.sellerId === profileUser.id);
    }
    return listingsResponse?.listings || [];
  }, [
    listingsResponse,
    listings,
    profileUser?.id,
    isViewingOwnProfile,
    profileUser,
  ]);

  const activeListings = useMemo(() => {
    return myListings.filter((listing) => listing.status === "active");
  }, [myListings]);

  const soldListings = useMemo(() => {
    return myListings.filter((listing) => listing.status === "sold");
  }, [myListings]);

  // Define userNotices BEFORE early returns (required by React rules of hooks)
  const userNotices = useMemo(() => {
    if (!profileUser || !isViewingOwnProfile) {
      return [];
    }
    const result = notices
      .filter(
        (notice) =>
          (notice.userId === profileUser.id || notice.userId === "all") &&
          notice.category !== "payout",
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    console.log("[Profile] useMemo userNotices count:", result.length);
    return result;
  }, [notices, profileUser?.id, isViewingOwnProfile, profileUser]);

  // Fetch ratings for the profile user
  useEffect(() => {
    if (!profileUser?.id) {
      setProfileRatings([]);
      setProfileRatingsTotal(0);
      return;
    }

    const fetchRatings = async () => {
      setIsLoadingRatings(true);
      try {
        console.log("[Profile] Fetching ratings for user:", profileUser.id);
        const url = `/api/ratings?targetUserId=${profileUser.id}`;
        console.log("[Profile] Fetch URL:", url);
        const response = await fetch(url, {
          credentials: "include",
        });
        console.log("[Profile] Response status:", response.status);
        console.log("[Profile] Response ok:", response.ok);

        if (!response.ok) {
          console.error("[Profile] Response not ok, status:", response.status);
          const errorText = await response.text();
          console.error("[Profile] Response error text:", errorText);
          setProfileRatings([]);
          setProfileRatingsTotal(0);
          return;
        }

        const data = await response.json();
        console.log("[Profile] Response data:", data);
        const ratings = Array.isArray(data.ratings) ? data.ratings : [];
        console.log("[Profile] Ratings array length:", ratings.length);

        if (ratings.length === 0) {
          console.warn("[Profile] No ratings returned from API");
          setProfileRatings([]);
          setProfileRatingsTotal(0);
          return;
        }

        // Store total count of all ratings
        setProfileRatingsTotal(ratings.length);

        // Get the 2 most recent ratings sorted by date
        const recentRatings = ratings
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 2);
        setProfileRatings(recentRatings);
        console.log("[Profile] Recent ratings set:", recentRatings);
      } catch (error) {
        console.error("[Profile] Error fetching ratings:", error);
        setProfileRatings([]);
        setProfileRatingsTotal(0);
      } finally {
        setIsLoadingRatings(false);
      }
    };

    fetchRatings();
  }, [profileUser?.id]);

  // Calculate rating summary and stats BEFORE early returns (required by React rules of hooks)
  const profileRatingSummary = profileUser?.id
    ? getUserRatingSummary(profileUser.id)
    : null;

  const calculateRatingStats = useMemo(() => {
    if (profileRatingsTotal === 0) {
      return {
        average:
          profileRatingSummary?.overallAverage ?? profileUser?.rating ?? null,
        count:
          profileRatingSummary?.overallCount ?? profileUser?.ratingCount ?? 0,
      };
    }
    // Calculate average from the 2 most recent ratings (or fewer if not enough)
    const average =
      profileRatings.length > 0
        ? profileRatings.reduce((sum: number, r: any) => sum + r.score, 0) /
          profileRatings.length
        : 0;
    return {
      average: average,
      count: profileRatingsTotal,
    };
  }, [
    profileRatings,
    profileRatingsTotal,
    profileRatingSummary,
    profileUser?.rating,
    profileUser?.ratingCount,
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

  // Use detailed transaction history from context if available, otherwise use context for display
  const purchases = transactions.filter(
    (entry) => entry.buyerId === profileUser.id,
  );
  const sales = transactions.filter(
    (entry) => entry.sellerId === profileUser.id,
  );

  // Use completedSales count from user profile (server-authoritative) for display
  // This updates whenever ratings are submitted and transactions complete
  const totalTransactions =
    profileUser.completedSales ?? purchases.length + sales.length ?? 0;

  const profileRatingAverage = calculateRatingStats.average;
  const profileRatingCount = calculateRatingStats.count;

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

          // Create detailed transaction description
          const transactionDescription =
            role === "buyer"
              ? `Purchased "${listing?.title ?? "item"}" from ${partnerName} on ${completedLabel} for ${priceLabel}`
              : `Sold "${listing?.title ?? "item"}" to ${partnerName} on ${completedLabel} for ${priceLabel}`;

          return (
            <li key={`${entry.threadId}-${role}`}>
              <div className="flex gap-3 rounded-3xl border border-border bg-background/80 p-4 shadow-soft flex-col md:flex-row">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-muted md:order-1">
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
                <div className="flex flex-1 flex-col gap-3 md:order-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {transactionDescription}
                    </h3>
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
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground md:grid-cols-3">
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {isViewingOwnProfile
                          ? "You rated"
                          : `${profileFirstName} rated`}
                      </p>
                      <div>{renderStars(givenRating)}</div>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">
                        {isViewingOwnProfile
                          ? "They rated you"
                          : `${partnerName} rated ${profileFirstName}`}
                      </p>
                      <div>{renderStars(receivedRating)}</div>
                    </div>
                    {isViewingOwnProfile && (
                      <div className="col-span-2 md:col-span-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-lg gap-1.5"
                          onClick={() =>
                            navigate(`/messages/${entry.threadId}`)
                          }
                        >
                          <HelpCircle className="h-4 w-4" aria-hidden />
                          <span className="text-xs">Help</span>
                        </Button>
                      </div>
                    )}
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
    <section className="space-y-8">
      {/* Modern Profile Header */}
      <header className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-background shadow-lg">
        <div className="px-6 py-8 md:px-8 md:py-10">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              {profileUser?.avatarUrl ? (
                <img
                  src={profileUser.avatarUrl}
                  alt={profileUser.name}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-primary/20 shadow-md"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-md">
                  <BadgeCheck className="h-10 w-10" aria-hidden />
                </span>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl font-bold text-foreground">
                    {profileUser.name}
                  </h1>
                  {profileUser.verificationStatus === "verified" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
                      <BadgeCheck className="h-3 w-3" aria-hidden />
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>Member since {profileMemberSinceYear}</span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                    {profileBase?.name ?? "Base not set"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:text-right">
              <div className="flex items-center gap-2">
                <RatingBadge
                  userId={profileUser.id}
                  size="lg"
                  initialAverage={
                    profileRatingSummary?.overallCount > 0
                      ? profileRatingSummary.overallAverage
                      : profileRatingAverage
                  }
                  initialCount={
                    profileRatingSummary?.overallCount > 0
                      ? profileRatingSummary.overallCount
                      : profileRatingCount
                  }
                  label={`${profileUser.name} rating`}
                />
              </div>
            </div>
          </div>
        </div>
      </header>


      {/* Active Listings Section - Modern Grid */}
      {activeListings.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                <ShoppingBag className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-xl font-bold text-foreground">
                {isViewingOwnProfile
                  ? "Items for sale"
                  : `${profileFirstName}'s items`}
              </h2>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              {activeListings.length}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${generateSlug(listing.title, listing.id)}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:border-primary/30"
              >
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                  {listing.imageUrls?.[0] ? (
                    <img
                      src={listing.imageUrls[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ShoppingBag
                        className="h-10 w-10 opacity-40"
                        aria-hidden
                      />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-border/30">
                    <p className="text-lg font-bold text-primary">
                      ${listing.price?.toLocaleString("en-US") ?? "0"}
                    </p>
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary opacity-0 transition-all group-hover:opacity-100">
                      <span className="text-xs font-bold">��</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Highlights Section */}
      <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 md:p-8">
        <article className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Stars className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-lg font-semibold text-foreground">
              {isViewingOwnProfile
                ? "Saved & alerts"
                : `${profileFirstName}'s highlights`}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isViewingOwnProfile
              ? "Your saved listings, price alerts, and base community features will appear here as we expand the platform."
              : `Saved items and community highlights will appear here as ${profileFirstName} builds their profile.`}
          </p>
          <p className="text-xs text-muted-foreground pt-2 border-t border-primary/10">
            Have ideas? Reach out to your base moderator team with suggestions.
          </p>
        </article>
      </div>

      {isViewingOwnProfile && (
        <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 shadow-sm overflow-hidden">
          <div className="border-b border-border/30 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent px-6 md:px-8 py-6 md:py-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-foreground">
                    Transaction history
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Track your purchases and sales
                  </p>
                </div>
              </div>
              <RatingBadge
                userId={profileUser.id}
                size="md"
                initialAverage={
                  profileRatingSummary?.overallCount > 0
                    ? profileRatingSummary.overallAverage
                    : profileRatingAverage
                }
                initialCount={
                  profileRatingSummary?.overallCount > 0
                    ? profileRatingSummary.overallCount
                    : profileRatingCount
                }
                label={`${profileUser.name} overall rating`}
              />
            </div>
          </div>
          {(profileRatingCount > 0 || profileRatingsTotal > 0) && (
            <div className="border-t border-border/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent px-6 md:px-8 py-6">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  What people have to say
                </h3>
                <p className="text-sm text-muted-foreground">
                  Feedback from {profileUser.name}'s recent transactions
                </p>
              </div>
              {isLoadingRatings ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-muted/30 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : profileRatings.length > 0 ? (
                <div className="space-y-3">
                  {profileRatings.map((rating: any) => {
                    const ratingDate = new Date(
                      rating.created_at,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={rating.id}
                        className="rounded-lg border border-border bg-muted/30 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                  key={star}
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    star <= Math.round(rating.score)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/30",
                                  )}
                                  aria-hidden
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {rating.score}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {ratingDate}
                          </span>
                        </div>
                        {rating.comment && (
                          <p className="text-sm text-foreground leading-relaxed">
                            "{rating.comment}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-nav-border px-3 py-2 text-xs text-muted-foreground">
                  No ratings yet. {profileUser.name} will receive ratings after
                  their first completed transaction.
                </p>
              )}
            </div>
          )}
          <div className="p-6 md:p-8">
            <Tabs defaultValue={defaultTransactionTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-lg bg-muted/60 p-1 mb-6">
                <TabsTrigger
                  value="purchases"
                  className="rounded-md text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" aria-hidden />
                    Purchases
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {purchases.length}
                    </span>
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="sales"
                  className="rounded-md text-sm font-semibold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Tag className="h-4 w-4" aria-hidden />
                    Sales
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {sales.length}
                    </span>
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="purchases" className="space-y-3 mt-0">
                {renderTransactionList(purchases, "buyer")}
              </TabsContent>
              <TabsContent value="sales" className="space-y-3 mt-0">
                {renderTransactionList(sales, "seller")}
              </TabsContent>
            </Tabs>
          </div>
        </section>
      )}

      {isViewingOwnProfile ? (
        <section className="rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 shadow-sm overflow-hidden">
          <div className="border-b border-border/30 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent px-6 md:px-8 py-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Account notices
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Audit trail of reports and strikes on your account
              </p>
            </div>
          </div>
          <div className="p-6 md:p-8">
            {userNotices.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-green-200/50 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20 px-4 py-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  You're in good standing
                </p>
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                  No notices to display
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userNotices.map((notice) => (
                  <article
                    key={notice.id}
                    className={`rounded-lg border transition-all p-4 ${
                      !notice.read
                        ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30"
                        : "border-border/50 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-bold uppercase tracking-wider ${
                            noticeSeverityClass[notice.severity] ??
                            "bg-muted/60 text-muted-foreground"
                          }`}
                        >
                          {notice.category}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {notice.title}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatNoticeDate(notice.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {notice.message}
                    </p>
                    {!notice.read && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                        onClick={() => markNoticeRead(notice.id)}
                      >
                        Mark as read →
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {isModerator ? (
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20 dark:to-background p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow md:flex md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4 flex-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                Moderation tools
              </h2>
              <p className="text-sm text-muted-foreground">
                Review reports, manage verifications, and configure base
                settings
              </p>
            </div>
          </div>
          <Button
            asChild
            className="mt-4 rounded-lg px-6 md:mt-0 whitespace-nowrap font-medium"
          >
            <Link to="/moderation">Open tools</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
};

export default Profile;
