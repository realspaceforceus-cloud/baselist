import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { useBaseList } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RatingBadgeProps {
  userId: string;
  className?: string;
  size?: "sm" | "md";
  initialAverage?: number | null;
  initialCount?: number | null;
  label?: string;
}

const formatCountLabel = (count: number) =>
  count === 1 ? "1 transaction" : `${count} transactions`;

const renderStaticStars = (value: number) => {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-3.5 w-3.5",
            index < rounded
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/50",
          )}
        />
      ))}
    </span>
  );
};

export const RatingBadge = ({
  userId,
  className,
  size = "sm",
  initialAverage = null,
  initialCount = null,
  label,
}: RatingBadgeProps): JSX.Element => {
  const { getUserRatingSummary, getMemberName } = useBaseList();
  const [open, setOpen] = useState(false);
  const [ratingDetails, setRatingDetails] = useState<any[]>([]);

  const summary = getUserRatingSummary(userId) || {
    overallAverage: null,
    overallCount: 0,
    sellerAverage: null,
    sellerCount: 0,
    buyerAverage: null,
    buyerCount: 0,
  };

  const effectiveOverall = useMemo(() => {
    if (summary?.overallCount > 0 && summary?.overallAverage !== null) {
      return {
        average: summary.overallAverage,
        count: summary.overallCount,
      };
    }
    if (initialAverage !== null && (initialCount ?? 0) > 0) {
      return {
        average: initialAverage,
        count: initialCount ?? 0,
      };
    }
    return { average: null, count: 0 };
  }, [
    initialAverage,
    initialCount,
    summary.overallAverage,
    summary.overallCount,
  ]);

  const sellerView = useMemo(() => {
    if (summary?.sellerCount > 0 && summary?.sellerAverage !== null) {
      return {
        average: summary.sellerAverage,
        count: summary.sellerCount,
      };
    }
    if (
      (summary?.overallCount ?? 0) === 0 &&
      effectiveOverall.average !== null
    ) {
      return {
        average: effectiveOverall.average,
        count: effectiveOverall.count,
      };
    }
    return { average: null, count: 0 };
  }, [
    effectiveOverall,
    summary?.sellerAverage,
    summary?.sellerCount,
    summary?.overallCount,
  ]);

  const buyerView = useMemo(() => {
    if (summary?.buyerCount > 0 && summary?.buyerAverage !== null) {
      return {
        average: summary.buyerAverage,
        count: summary.buyerCount,
      };
    }
    return { average: null, count: 0 };
  }, [summary?.buyerAverage, summary?.buyerCount]);

  // Fetch individual ratings for the modal
  useEffect(() => {
    if (!open) return;

    const fetchRatings = async () => {
      try {
        const response = await fetch(`/api/ratings?targetUserId=${userId}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch ratings");
        const data = await response.json();
        // Get last 3 ratings, sorted by date (newest first)
        const lastThree = (data.ratings || [])
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )
          .slice(0, 3);
        setRatingDetails(lastThree);
      } catch (error) {
        console.error("Failed to fetch ratings:", error);
        setRatingDetails([]);
      }
    };

    fetchRatings();
  }, [open, userId]);

  const hasRatings =
    (effectiveOverall?.average ?? null) !== null &&
    (effectiveOverall?.count ?? 0) > 0;

  const triggerClasses = cn(
    "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
    size === "md" && "text-sm",
    className,
  );

  if (!hasRatings) {
    return (
      <span
        className={cn(triggerClasses, "cursor-default select-none bg-muted/70")}
        aria-label={label ? `${label}: New member` : "New member"}
      >
        <span aria-hidden>⭐</span>
        New
      </span>
    );
  }

  const averageLabel = (effectiveOverall?.average ?? 0).toFixed(1);
  const countLabel = formatCountLabel(effectiveOverall?.count ?? 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className={cn(triggerClasses, "cursor-pointer")}
          aria-label={
            label
              ? `${label}: ${averageLabel} average across ${effectiveOverall.count} transactions`
              : `${averageLabel} average across ${effectiveOverall.count} transactions`
          }
        >
          <span aria-hidden>⭐</span>
          <span>{averageLabel}</span>
          <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground/80">
            {effectiveOverall.count}
          </span>
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>⭐ {averageLabel}</DialogTitle>
          <DialogDescription>{countLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <section className="space-y-2">
            <header className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seller ratings
            </header>
            {sellerView.average !== null ? (
              <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {sellerView.average.toFixed(1)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatCountLabel(sellerView.count)}
                  </p>
                </div>
                {renderStaticStars(sellerView.average)}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-nav-border px-3 py-2 text-xs">
                No seller ratings yet.
              </p>
            )}
          </section>
          <section className="space-y-2">
            <header className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Buyer ratings
            </header>
            {buyerView.average !== null ? (
              <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {buyerView.average.toFixed(1)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatCountLabel(buyerView.count)}
                  </p>
                </div>
                {renderStaticStars(buyerView.average)}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-nav-border px-3 py-2 text-xs">
                No buyer ratings yet.
              </p>
            )}
          </section>
          <footer className="rounded-2xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Ratings are collected after each completed transaction.{" "}
            {getMemberName(userId)} can earn more by closing reliable deals.
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
