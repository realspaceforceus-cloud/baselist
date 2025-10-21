import { useState } from "react";
import { Heart, MessageCircle, BadgeCheck, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { feedApi } from "@/lib/feedApi";
import { useAuth } from "@/context/AuthContext";
import type { FeedPost } from "@/types";

interface FeedPostItemProps {
  post: FeedPost;
}

export function FeedPostItem({ post }: FeedPostItemProps): JSX.Element {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.userLiked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentingLoading, setIsCommentingLoading] = useState(false);
  const [pollOptions, setPollOptions] = useState(post.pollOptions || []);
  const [isVoting, setIsVoting] = useState(false);

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
  });

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    setIsLiking(true);
    try {
      await feedApi.likePost(post.id);
      setIsLiked(!isLiked);
      setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (error) {
      toast.error("Failed to like post");
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!commentText.trim()) return;

    setIsCommentingLoading(true);
    try {
      await feedApi.commentOnPost(post.id, commentText);
      setCommentText("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommentingLoading(false);
    }
  };

  const getPostIcon = () => {
    switch (post.postType) {
      case "photo":
        return "📷";
      case "poll":
        return "📊";
      case "event":
        return "📅";
      case "psa":
        return "⚠️";
      default:
        return "💬";
    }
  };

  const getPSABadge = () => {
    if (post.postType !== "psa") return null;
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
        <AlertCircle className="h-3 w-3" />
        ANNOUNCEMENT
      </span>
    );
  };

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-card transition hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src={
              post.author?.avatarUrl ||
              "https://api.dicebear.com/7.x/initials/svg?seed=user"
            }
            alt={post.author?.name}
            className="h-10 w-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{post.author?.name}</h3>
              {post.author?.verified && (
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        <span className="text-2xl">{getPostIcon()}</span>
      </div>

      {/* Content */}
      <div className="mb-3 space-y-3">
        <div>
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {post.content}
          </p>
          {post.postType === "psa" && getPSABadge()}
        </div>

        {/* Images */}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {post.imageUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="Post image"
                className="rounded-lg object-cover w-full aspect-square"
              />
            ))}
          </div>
        )}

        {/* Poll */}
        {post.postType === "poll" && post.pollOptions && (
          <div className="space-y-2 rounded-lg bg-accent/50 p-3">
            {post.pollOptions.map((option) => (
              <div
                key={option.id}
                className="rounded border border-border bg-background p-2 cursor-pointer hover:bg-accent transition"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>{option.text}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {option.votes || 0}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${
                        post.pollOptions && post.pollOptions.length > 0
                          ? (option.votes /
                              Math.max(
                                ...post.pollOptions.map((o) => o.votes || 0),
                                1,
                              )) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Event */}
        {post.postType === "event" && post.eventData && (
          <div className="rounded-lg border border-border bg-accent/50 p-3">
            <p className="font-semibold text-sm">{post.eventData.title}</p>
            {post.eventData.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {post.eventData.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              📅 {new Date(post.eventData.startDate).toLocaleDateString()}
            </p>
            {post.eventData.location && (
              <p className="text-xs text-muted-foreground">
                📍 {post.eventData.location}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Engagement stats */}
      <div className="mb-3 flex gap-4 border-t border-border pt-2 text-xs text-muted-foreground">
        {likes > 0 && (
          <span>
            {likes} like{likes !== 1 ? "s" : ""}
          </span>
        )}
        {post.comments && post.comments > 0 && (
          <span>
            {post.comments} comment{post.comments !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 border-t border-border pt-3">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 transition text-sm font-medium ${
            isLiked
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
          Like
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition"
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </button>
      </div>

      {/* Comment box */}
      {showComments && (
        <div className="mt-4 border-t border-border pt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim() || isCommentingLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Post
            </button>
          </div>

          {/* Existing comments */}
          {post.userComments && post.userComments.length > 0 && (
            <div className="space-y-2 rounded-lg bg-accent/50 p-3">
              {post.userComments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <p className="font-medium">{comment.author?.name}</p>
                  <p className="text-muted-foreground">{comment.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
