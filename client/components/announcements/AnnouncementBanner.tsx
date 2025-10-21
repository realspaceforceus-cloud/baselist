import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@/types";

interface AnnouncementBannerProps {
  announcement: Announcement | null;
}

export const AnnouncementBanner = ({
  announcement,
}: AnnouncementBannerProps): JSX.Element | null => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load dismissal state from localStorage on mount
  useEffect(() => {
    if (announcement) {
      const dismissedAnnouncements = JSON.parse(
        localStorage.getItem("dismissedAnnouncements") || "[]",
      );
      setIsDismissed(dismissedAnnouncements.includes(announcement.id));
    }
  }, [announcement]);

  // Reset dismissed state when a new announcement arrives
  useEffect(() => {
    setIsDismissed(false);
  }, [announcement?.id]);

  const handleDismiss = async () => {
    if (!announcement) return;

    try {
      setIsLoading(true);

      // If user is authenticated, save to backend
      const response = await fetch(
        `/api/announcements/${announcement.id}/dismiss`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (response.ok) {
        // Update localStorage
        const dismissedAnnouncements = JSON.parse(
          localStorage.getItem("dismissedAnnouncements") || "[]",
        );
        if (!dismissedAnnouncements.includes(announcement.id)) {
          dismissedAnnouncements.push(announcement.id);
          localStorage.setItem(
            "dismissedAnnouncements",
            JSON.stringify(dismissedAnnouncements),
          );
        }
        setIsDismissed(true);
      }
    } catch (error) {
      console.error("Failed to dismiss announcement:", error);
      // Still dismiss locally even if backend call fails
      const dismissedAnnouncements = JSON.parse(
        localStorage.getItem("dismissedAnnouncements") || "[]",
      );
      if (!dismissedAnnouncements.includes(announcement.id)) {
        dismissedAnnouncements.push(announcement.id);
        localStorage.setItem(
          "dismissedAnnouncements",
          JSON.stringify(dismissedAnnouncements),
        );
      }
      setIsDismissed(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!announcement || isDismissed || !announcement.isVisible) {
    return null;
  }

  return (
    <div
      className="w-full border-b"
      style={{
        backgroundColor: announcement.backgroundColor,
        borderColor: announcement.color,
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: announcement.textColor }}
            >
              {announcement.title}
            </h3>
            <p
              className="text-sm opacity-90"
              style={{ color: announcement.textColor }}
            >
              {announcement.content}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            disabled={isLoading}
            className="flex-shrink-0 h-8 px-3 text-xs font-medium"
            style={{
              borderColor: announcement.textColor,
              color: announcement.textColor,
            }}
            aria-label="Dismiss announcement"
          >
            {isLoading ? "Dismissing..." : "Dismiss"}
          </Button>
        </div>
      </div>
    </div>
  );
};
