import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Check,
  AlertTriangle,
  Heart,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Notification } from "@/types";
import { notifications as notificationsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (notificationId: string) => void;
  onClick?: () => void;
}

export const NotificationItem = ({
  notification,
  onDismiss,
  onClick,
}: NotificationItemProps): JSX.Element => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const getIconAndColor = (type: string) => {
    switch (type) {
      case "message":
        return {
          icon: MessageSquare,
          bgColor: "bg-blue-50 dark:bg-blue-950",
          textColor: "text-blue-600 dark:text-blue-400",
        };
      case "item_sold":
      case "offer_accepted":
        return {
          icon: Check,
          bgColor: "bg-green-50 dark:bg-green-950",
          textColor: "text-green-600 dark:text-green-400",
        };
      case "item_favorited":
      case "comment_liked":
        return {
          icon: Heart,
          bgColor: "bg-rose-50 dark:bg-rose-950",
          textColor: "text-rose-600 dark:text-rose-400",
        };
      case "post_commented":
      case "comment_replied":
      case "tagged_in_post":
      case "tagged_in_comment":
        return {
          icon: MessageSquare,
          bgColor: "bg-purple-50 dark:bg-purple-950",
          textColor: "text-purple-600 dark:text-purple-400",
        };
      case "listing_removed":
      case "verification_needed":
      case "offer_declined":
        return {
          icon: AlertTriangle,
          bgColor: "bg-amber-50 dark:bg-amber-950",
          textColor: "text-amber-600 dark:text-amber-400",
        };
      default:
        return {
          icon: MessageSquare,
          bgColor: "bg-primary/10",
          textColor: "text-primary",
        };
    }
  };

  const { icon: Icon, bgColor, textColor } = getIconAndColor(notification.type);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Mark as read when clicked
      if (!notification.read) {
        await notificationsApi.markAsRead(notification.id);
      }

      // Navigate based on notification type and target type
      if (notification.targetType === "thread" && notification.targetId) {
        navigate(`/messages/${notification.targetId}`);
      } else if (
        notification.targetType === "listing" &&
        notification.targetId
      ) {
        navigate(`/listings/${notification.targetId}`);
      } else if (notification.targetType === "post" && notification.targetId) {
        navigate(`/feed#post-${notification.targetId}`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await notificationsApi.dismiss(notification.id);
      onDismiss(notification.id);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get quick action buttons based on notification type
  const getQuickActions = (): Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
  }> => {
    switch (notification.type) {
      case "item_favorited":
        return [
          {
            label: "View item",
            onClick: () => {
              if (notification.targetId) {
                navigate(`/listings/${notification.targetId}`);
              }
            },
          },
          {
            label: "View profile",
            onClick: () => {
              if (notification.actorId) {
                navigate(`/profile/${notification.actorId}`);
              }
            },
          },
        ];
      case "offer_received":
      case "offer_accepted":
      case "offer_declined":
        return [
          {
            label: "View offer",
            onClick: () => {
              if (notification.targetId) {
                navigate(`/messages/${notification.targetId}`);
              }
            },
          },
        ];
      case "transaction_complete":
        return [
          {
            label: "Rate transaction",
            onClick: () => {
              if (notification.targetId) {
                navigate(`/messages/${notification.targetId}`);
              }
            },
          },
        ];
      case "listing_removed":
        return [
          {
            label: "View help",
            onClick: () => {
              navigate("/guidelines");
            },
          },
        ];
      default:
        return [];
    }
  };

  const quickActions = getQuickActions();

  return (
    <div
      className={cn(
        "border-b border-border last:border-b-0 transition",
        !notification.read && "bg-muted/50",
      )}
    >
      <div
        className={cn(
          "p-4 hover:bg-muted/30 transition cursor-pointer active:bg-muted/40",
        )}
        onClick={() => {
          handleClick();
          // Also call the onClick callback to close popover
          if (onClick) {
            onClick();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="flex gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0",
              bgColor,
              textColor,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {notification.title}
              </p>
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {notification.description}
            </p>
            <div className="flex items-center justify-between mt-3 gap-2">
              <p className="text-xs text-muted-foreground">
                {(() => {
                  try {
                    const date = new Date(notification.createdAt);
                    if (isNaN(date.getTime())) {
                      return "just now";
                    }
                    return formatDistanceToNow(date, {
                      addSuffix: true,
                    });
                  } catch (error) {
                    return "just now";
                  }
                })()}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium rounded-md border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50"
                onClick={handleDismiss}
                disabled={isLoading}
                title="Dismiss notification"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
      {quickActions.length > 0 && (
        <div className="flex gap-2 px-4 pb-3 border-t border-border/50">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className="flex-1 text-xs px-2 py-1.5 rounded border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
