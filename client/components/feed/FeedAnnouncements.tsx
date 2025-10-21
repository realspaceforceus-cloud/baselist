import { X } from "lucide-react";
import { feedApi } from "@/lib/feedApi";
import type { FeedAnnouncement } from "@/types";

interface FeedAnnouncementsProps {
  announcements: FeedAnnouncement[];
  onDismiss: (id: string) => void;
}

export function FeedAnnouncements({
  announcements,
  onDismiss,
}: FeedAnnouncementsProps): JSX.Element {
  const handleDismiss = async (announcementId: string) => {
    try {
      await feedApi.dismissAnnouncement(announcementId);
      onDismiss(announcementId);
    } catch (error) {
      console.error("Failed to dismiss announcement:", error);
    }
  };

  const stickyAnnouncements = announcements.filter((a) => a.isSticky);
  const regularAnnouncements = announcements.filter((a) => !a.isSticky);

  return (
    <div className="space-y-3">
      {stickyAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
          isSticky
        />
      ))}

      {regularAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          announcement={announcement}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onDismiss,
  isSticky,
}: {
  announcement: FeedAnnouncement;
  onDismiss: (id: string) => void;
  isSticky?: boolean;
}): JSX.Element {
  const bgClass = isSticky
    ? "bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200"
    : "bg-amber-50/50 border-amber-200";

  return (
    <div className={`rounded-lg border ${bgClass} p-4 relative flex gap-3`}>
      {announcement.imageUrl && (
        <img
          src={announcement.imageUrl}
          alt={announcement.title}
          className="h-16 w-16 rounded object-cover flex-shrink-0"
        />
      )}

      <div className="flex-1">
        <h3 className="font-semibold text-sm mb-1">{announcement.title}</h3>
        <p className="text-sm text-muted-foreground">{announcement.content}</p>
      </div>

      {announcement.isDismissible && (
        <button
          onClick={() => onDismiss(announcement.id)}
          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {isSticky && (
        <div className="absolute right-2 bottom-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
          PINNED
        </div>
      )}
    </div>
  );
}
