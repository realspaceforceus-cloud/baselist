import { Heart, MessageCircle, Flag, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types";
import { cn } from "@/lib/utils";

interface SellerInfoSidebarProps {
  seller: UserProfile | null;
  isSaved: boolean;
  onSaveListing: () => void;
  onOpenComposer: () => void;
  onOpenReportDialog: () => void;
  isLoadingSave?: boolean;
}

export const SellerInfoSidebar = ({
  seller,
  isSaved,
  onSaveListing,
  onOpenComposer,
  onOpenReportDialog,
  isLoadingSave = false,
}: SellerInfoSidebarProps): JSX.Element => {
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  if (!seller) {
    return (
      <aside className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <p className="text-sm text-muted-foreground">Loading seller info...</p>
      </aside>
    );
  }

  const sellerYear = new Date(seller.memberSince).getFullYear();

  return (
    <aside className="space-y-4">
      <article className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            {seller.avatarUrl ? (
              <img
                src={seller.avatarUrl}
                alt={seller.name}
                className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                loading="lazy"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary flex-shrink-0">
                {seller.name?.[0]?.toUpperCase() ?? "M"}
              </span>
            )}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  {seller.name}
                </h3>
                {seller.verified && (
                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-950/30 rounded-full px-2 py-1">
                    <Check
                      className="h-3 w-3 text-green-600"
                      aria-hidden
                      title="Verified DoW Member"
                    />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      Verified
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Member since{" "}
                  <span className="font-medium text-foreground">{sellerYear}</span>
                </p>
                {seller.rating ? (
                  <p>
                    <span aria-hidden>⭐</span>{" "}
                    <span className="font-medium text-foreground">
                      {seller.rating.toFixed(1)}
                    </span>{" "}
                    from {seller.ratingCount} {seller.ratingCount === 1 ? "sale" : "sales"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No ratings yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <Button
              className="w-full rounded-full"
              onClick={onOpenComposer}
              disabled={!seller}
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Message seller
            </Button>
            <Button
              variant={isSaved ? "default" : "outline"}
              className="w-full rounded-full"
              onClick={onSaveListing}
              disabled={isLoadingSave}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  isSaved ? "fill-current" : "",
                )}
                aria-hidden
              />
              {isSaved ? "Saved" : "Save listing"}
            </Button>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-red-200/50 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 p-6 shadow-card">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Flag className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                Report this listing
              </h3>
              <p className="text-xs text-red-800/70 dark:text-red-300/70 mt-1">
                Help us keep the community safe by reporting inappropriate content or suspicious activity.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full rounded-full border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
            onClick={onOpenReportDialog}
            disabled={isLoadingReport}
          >
            <Flag className="h-4 w-4" aria-hidden />
            Report listing
          </Button>
        </div>
      </article>
    </aside>
  );
};
