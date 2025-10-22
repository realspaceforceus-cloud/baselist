import { useState } from "react";
import {
  Heart,
  Trash2,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { FeedComment } from "@/types";

interface FeedCommentItemProps {
  comment: FeedComment;
  depth?: number;
  onLike: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (parentCommentId: string, content: string) => Promise<void>;
  canDelete: (commentId: string) => boolean;
  isLoading?: boolean;
}

export function FeedCommentItem({
  comment,
  depth = 0,
  onLike,
  onDelete,
  onReply,
  canDelete,
  isLoading = false,
}: FeedCommentItemProps): JSX.Element {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const replies = comment.replies || [];
  const hasReplies = replies.length > 0;

  const handleLike = async () => {
    setIsLiking(true);
    try {
      await onLike(comment.id);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete(comment.id)) return;
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText("");
      setShowReplyInput(false);
      setShowReplies(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 12)}` : "";

  return (
    <div className={`text-sm bg-background rounded-lg p-3 ${indentClass}`}>
      {/* Comment header and content */}
      <div className="flex items-start gap-2">
        <img
          src={
            comment.author?.avatarUrl ||
            "https://api.dicebear.com/7.x/initials/svg?seed=user"
          }
          alt={comment.author?.name}
          className="h-6 w-6 rounded-full object-cover flex-shrink-0 mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/profile/${comment.author?.username || comment.userId}`}
              className="font-semibold text-xs hover:text-primary transition"
            >
              {comment.author?.name}
            </Link>
            {comment.author?.verified && (
              <BadgeCheck className="h-3 w-3 text-blue-500" />
            )}
          </div>
          <div className="text-muted-foreground whitespace-pre-wrap">
            {(() => {
              const parts = comment.content.split(/(@\w+)/g);
              return parts.map((part, idx) => {
                if (part.startsWith("@")) {
                  const username = part.slice(1);
                  return (
                    <Link
                      key={idx}
                      to={`/profile/${username}`}
                      className="font-bold text-white hover:underline"
                    >
                      {part}
                    </Link>
                  );
                }
                return <span key={idx}>{part}</span>;
              });
            })()}
          </div>
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <button
              onClick={handleLike}
              disabled={isLiking || isLoading}
              className={`hover:text-primary transition ${
                comment.userLiked ? "text-red-500" : ""
              }`}
            >
              <Heart
                className="h-3 w-3 inline mr-1"
                fill={comment.userLiked ? "currentColor" : "none"}
              />
              {comment.likes || 0}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="hover:text-primary transition"
            >
              Reply
            </button>
            {canDelete(comment.id) && (
              <button
                onClick={handleDelete}
                disabled={isDeleting || isLoading}
                className="hover:text-destructive transition"
              >
                <Trash2 className="h-3 w-3 inline mr-1" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-3 flex gap-2 ml-8">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmitReply();
              }
            }}
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim() || isSubmitting || isLoading}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? "..." : "Reply"}
          </button>
          <button
            onClick={() => setShowReplyInput(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Show replies button */}
      {hasReplies && !showReplies && (
        <button
          onClick={() => setShowReplies(true)}
          className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <ChevronDown className="h-3 w-3" />
          Show {replies.length} repl{replies.length === 1 ? "y" : "ies"}
        </button>
      )}

      {/* Replies section */}
      {showReplies && hasReplies && (
        <div className="mt-3 space-y-3 border-l border-border/50 pl-3">
          {replies.map((reply) => (
            <FeedCommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onLike={onLike}
              onDelete={onDelete}
              onReply={onReply}
              canDelete={canDelete}
              isLoading={isLoading}
            />
          ))}

          {/* Hide replies button */}
          <button
            onClick={() => setShowReplies(false)}
            className="flex items-center gap-2 text-xs text-primary hover:underline mt-2"
          >
            <ChevronUp className="h-3 w-3" />
            Hide replies
          </button>
        </div>
      )}
    </div>
  );
}
