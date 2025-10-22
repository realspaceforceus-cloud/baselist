import { useState } from "react";
import {
  Heart,
  MessageCircle,
  BadgeCheck,
  AlertCircle,
  Trash2,
  Flag,
  ChevronDown,
  ChevronUp,
  Share2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { feedApi } from "@/lib/feedApi";
import { useAuth } from "@/context/AuthContext";
import { useBaseList } from "@/context/BaseListContext";
import { FeedCommentItem } from "./FeedCommentItem";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { shareContent, generatePostShareUrl } from "@/lib/shareUtils";
import type { FeedPost, FeedComment } from "@/types";

interface FeedPostItemProps {
  post: FeedPost;
  onPostDeleted?: () => void;
}

export function FeedPostItem({
  post,
  onPostDeleted,
}: FeedPostItemProps): JSX.Element {
  const { user } = useAuth();
  const { currentBase } = useBaseList();
  const [isLiked, setIsLiked] = useState(post.userLiked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentingLoading, setIsCommentingLoading] = useState(false);
  const [pollOptions, setPollOptions] = useState(post.pollOptions || []);
  const [isVoting, setIsVoting] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(
    post.userComments || [],
  );
  const [showAllComments, setShowAllComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Recursively find and update a comment at any nesting level
  const addReplyToComment = (
    commentList: FeedComment[],
    parentCommentId: string,
    newComment: FeedComment,
  ): FeedComment[] => {
    return commentList.map((c) => {
      if (c.id === parentCommentId) {
        // Found the parent - add the reply
        return {
          ...c,
          replies: [...(c.replies || []), newComment],
        };
      }
      // Recursively search in nested replies
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: addReplyToComment(c.replies, parentCommentId, newComment),
        };
      }
      return c;
    });
  };

  const handleComment = async (parentCommentId?: string) => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }

    if (!commentText.trim()) return;

    setIsCommentingLoading(true);
    try {
      const newComment = await feedApi.commentOnPost(
        post.id,
        commentText,
        parentCommentId,
      );

      if (parentCommentId) {
        // Add reply to parent comment (handles any nesting level)
        setComments(addReplyToComment(comments, parentCommentId, newComment));
      } else {
        // Add top-level comment
        setComments([newComment, ...comments]);
      }

      setCommentText("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommentingLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setIsDeleting(true);
    try {
      await feedApi.deletePost(post.id);
      toast.success("Post deleted");
      onPostDeleted?.();
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReportPost = async () => {
    if (!user) {
      toast.error("Please sign in to report");
      return;
    }

    const reason = prompt("Why are you reporting this post?");
    if (!reason) return;

    try {
      await feedApi.reportPost(post.id, reason);
      toast.success(
        "Post reported. Thank you for helping keep our community safe.",
      );
    } catch (error) {
      toast.error("Failed to report post");
    }
  };

  // Recursively find and delete a comment at any nesting level
  const deleteCommentRecursive = (
    commentList: FeedComment[],
    commentId: string,
  ): FeedComment[] => {
    return commentList
      .filter((c) => c.id !== commentId)
      .map((c) => {
        // Also remove from nested replies
        if (c.replies && c.replies.length > 0) {
          return {
            ...c,
            replies: deleteCommentRecursive(c.replies, commentId),
          };
        }
        return c;
      });
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await feedApi.deleteComment(post.id, commentId);
      setComments(deleteCommentRecursive(comments, commentId));
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  // Recursively find and update a comment's like status at any nesting level
  const likeCommentRecursive = (
    commentList: FeedComment[],
    commentId: string,
  ): FeedComment[] => {
    return commentList.map((c) => {
      if (c.id === commentId) {
        // Found it - toggle the like
        const liked = c.userLiked;
        return {
          ...c,
          userLiked: !liked,
          likes: (c.likes || 0) + (liked ? -1 : 1),
        };
      }
      // Recursively search in nested replies
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: likeCommentRecursive(c.replies, commentId),
        };
      }
      return c;
    });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }

    try {
      await feedApi.likeComment(post.id, commentId);
      setComments(likeCommentRecursive(comments, commentId));
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleShare = async () => {
    const shareUrl = generatePostShareUrl(post.id);
    const success = await shareContent({
      title: "Check out this post",
      text: post.content.substring(0, 100),
      url: shareUrl,
    });

    if (success) {
      if (navigator.share) {
        // Native share was used
        toast.success("Post shared!");
      } else {
        // Fallback copy to clipboard
        toast.success("Link copied to clipboard!");
      }
    } else {
      toast.error("Failed to share post");
    }
  };

  const canDeletePost =
    user?.userId === post.userId ||
    (currentBase && (user?.role === "admin" || user?.role === "moderator"));

  // Recursively find a comment at any nesting level
  const findComment = (
    commentList: FeedComment[],
    commentId: string,
  ): FeedComment | undefined => {
    for (const c of commentList) {
      if (c.id === commentId) return c;
      if (c.replies && c.replies.length > 0) {
        const found = findComment(c.replies, commentId);
        if (found) return found;
      }
    }
    return undefined;
  };

  const canDeleteComment = (commentId: string) => {
    const comment = findComment(comments, commentId);
    return (
      user?.userId === comment?.userId ||
      (currentBase && (user?.role === "admin" || user?.role === "moderator"))
    );
  };

  const handlePollVote = async (optionId: string) => {
    if (!user) {
      toast.error("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    try {
      const result = await feedApi.voteOnPoll(post.id, optionId);
      setPollOptions(result.pollOptions);
      toast.success("Vote recorded!");
    } catch (error) {
      toast.error("Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  const getUserVote = (): string | null => {
    if (!user || !pollOptions) return null;
    const votedOption = pollOptions.find(
      (option) => Array.isArray(option.votes) && option.votes.includes(user.id),
    );
    return votedOption?.id || null;
  };

  const getVoteCount = (option: any): number => {
    if (Array.isArray(option.votes)) {
      return option.votes.length;
    }
    return typeof option.votes === "number" ? option.votes : 0;
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
        return "⚠���";
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
        <div className="flex items-center gap-3 flex-1">
          <Link
            to={`/profile/${post.author?.username || post.userId}`}
            className="flex-shrink-0 rounded-full hover:opacity-80 transition"
          >
            <img
              src={
                post.author?.avatarUrl ||
                "https://api.dicebear.com/7.x/initials/svg?seed=user"
              }
              alt={post.author?.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Link
                to={`/profile/${post.author?.username || post.userId}`}
                className="font-semibold text-sm hover:text-primary transition"
              >
                {post.author?.name}
              </Link>
              {post.author?.verified && (
                <BadgeCheck className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {canDeletePost && (
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="rounded px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition"
              title="Delete your post"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleReportPost}
            className="rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition"
            title="Report post"
          >
            Report
          </button>
        </div>
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
        {post.postType === "poll" && pollOptions && pollOptions.length > 0 && (
          <div className="space-y-2 rounded-lg bg-accent/50 p-3">
            {pollOptions.map((option) => {
              const voteCount = getVoteCount(option);
              const userVoted = getUserVote() === option.id;
              const totalVotes = pollOptions.reduce(
                (sum, opt) => sum + getVoteCount(opt),
                0,
              );
              const percentage =
                totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

              return (
                <button
                  key={option.id}
                  onClick={() => handlePollVote(option.id)}
                  disabled={isVoting}
                  className={`w-full rounded border p-2 cursor-pointer transition ${
                    userVoted
                      ? "border-primary bg-primary/10 hover:bg-primary/20"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>{option.text}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {voteCount}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        userVoted ? "bg-primary" : "bg-primary/60"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
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
      {(likes > 0 || comments.length > 0) && (
        <div className="mb-3 flex gap-4 border-t border-border pt-2 text-xs text-muted-foreground">
          {likes > 0 && (
            <span>
              {likes} like{likes !== 1 ? "s" : ""}
            </span>
          )}
          {comments.length > 0 && (
            <button
              onClick={() => setShowComments(true)}
              className="hover:text-primary transition cursor-pointer"
            >
              {comments.length} comment{comments.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

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

        <button
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition"
          title="Share post"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* Comments section - always show if there are comments or if comment box is open */}
      {showComments && (
        <div className="mt-4 border-t border-border pt-4 space-y-3">
          {/* Comments display */}
          {comments.length > 0 && (
            <div className="space-y-3 rounded-lg bg-accent/30 p-3">
              {/* View all comments button */}
              {comments.length > 2 && !showAllComments && (
                <button
                  onClick={() => setShowAllComments(true)}
                  className="flex items-center gap-2 text-xs text-primary hover:underline w-full justify-center py-1"
                >
                  <ChevronDown className="h-3 w-3" />
                  View all {comments.length} comments
                </button>
              )}

              {/* Display comments using nested component */}
              <div className="space-y-3">
                {(showAllComments ? comments : comments.slice(0, 2)).map(
                  (comment) => (
                    <FeedCommentItem
                      key={comment.id}
                      comment={comment}
                      onLike={(commentId) => handleLikeComment(commentId)}
                      onDelete={(commentId) => handleDeleteComment(commentId)}
                      onReply={(parentCommentId, content) => {
                        setCommentText(content);
                        return new Promise((resolve) => {
                          // The handleComment function will be called with parentCommentId
                          const originalText = commentText;
                          setCommentText(content);
                          setTimeout(() => {
                            handleComment(parentCommentId)
                              .then(resolve)
                              .catch(resolve);
                          }, 0);
                        });
                      }}
                      canDelete={canDeleteComment}
                      isLoading={isDeleting || isCommentingLoading}
                    />
                  ),
                )}
              </div>

              {/* Show less button */}
              {showAllComments && comments.length > 2 && (
                <button
                  onClick={() => setShowAllComments(false)}
                  className="flex items-center gap-2 text-xs text-primary hover:underline w-full justify-center py-1"
                >
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </button>
              )}
            </div>
          )}

          {/* Comment input box */}
          <div className="flex gap-2">
            <img
              src={
                user?.avatarUrl ||
                "https://api.dicebear.com/7.x/initials/svg?seed=user"
              }
              alt={user?.name}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 flex gap-2">
              <MentionAutocomplete
                value={commentText}
                onChange={setCommentText}
                placeholder="Add a comment... (@ to mention)"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                userId={user?.userId}
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
                {isCommentingLoading ? "..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
