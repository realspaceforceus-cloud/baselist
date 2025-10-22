import { useEffect, useState, useCallback } from "react";
import { useBaseList } from "@/context/BaseListContext";
import { feedApi } from "@/lib/feedApi";
import type { FeedPost, FeedAnnouncement } from "@/types";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedAnnouncements } from "@/components/feed/FeedAnnouncements";
import { FeedPostItem } from "@/components/feed/FeedPostItem";
import { Loader2 } from "lucide-react";

export default function Feed(): JSX.Element {
  const { currentBaseId, currentBase } = useBaseList();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [announcements, setAnnouncements] = useState<FeedAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const baseName = currentBase?.abbreviation || "community";

  const loadAnnouncements = useCallback(async () => {
    if (!currentBaseId) return;

    try {
      const announcements = await feedApi.getAnnouncements(currentBaseId);
      setAnnouncements(announcements);
    } catch (error) {
      console.error("Failed to load announcements:", error);
    }
  }, [currentBaseId]);

  useEffect(() => {
    if (!currentBaseId) {
      console.debug("Feed: Skipping load - no currentBaseId");
      return;
    }

    console.debug("Feed: Loading posts for base", currentBaseId);
    setIsLoading(true);
    setOffset(0);
    setPosts([]);

    (async () => {
      try {
        const newPosts = await feedApi.getPosts(currentBaseId, 20, 0);
        console.debug("Feed: Loaded posts", newPosts.length, newPosts);
        setPosts(newPosts);
        setHasMore(newPosts.length === 20);
      } catch (error) {
        console.error("Feed: Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    })();

    loadAnnouncements();
  }, [currentBaseId, loadAnnouncements]);

  useEffect(() => {
    if (offset > 0 && currentBaseId) {
      (async () => {
        try {
          const newPosts = await feedApi.getPosts(currentBaseId, 20, offset);
          setPosts((prev) => [...prev, ...newPosts]);
          setHasMore(newPosts.length === 20);
        } catch (error) {
          console.error("Feed: Failed to load more posts:", error);
        }
      })();
    }
  }, [offset, currentBaseId]);

  const handlePostCreated = (newPost: FeedPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleAnnouncementDismissed = (announcementId: string) => {
    setAnnouncements((prev) =>
      prev.map((ann) =>
        ann.id === announcementId ? { ...ann, isDismissed: true } : ann,
      ),
    );
  };

  const visibleAnnouncements = announcements.filter((ann) => !ann.isDismissed);

  // Separate PSA posts from regular posts
  const psaPosts = posts.filter((p) => p.postType === "psa");
  const regularPosts = posts.filter((p) => p.postType !== "psa");

  return (
    <div className="space-y-6 px-4 py-6">
      {/* PSA Posts (if any) */}
      {psaPosts.length > 0 && (
        <div className="space-y-4">
          {psaPosts.map((post) => (
            <FeedPostItem
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}

      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <FeedAnnouncements
          announcements={visibleAnnouncements}
          onDismiss={handleAnnouncementDismissed}
        />
      )}

      {/* Composer */}
      <FeedComposer onPostCreated={handlePostCreated} baseName={baseName} />

      {/* Feed Posts */}
      <div className="space-y-4">
        {regularPosts.length === 0 && !isLoading && psaPosts.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}

        {regularPosts.map((post) => (
          <FeedPostItem
            key={post.id}
            post={post}
            onPostDeleted={() => handlePostDeleted(post.id)}
          />
        ))}

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {hasMore && !isLoading && posts.length > 0 && (
          <button
            onClick={() => setOffset((prev) => prev + 20)}
            className="w-full rounded-lg border border-border bg-card py-3 text-sm font-medium hover:bg-accent"
          >
            Load more posts
          </button>
        )}
      </div>
    </div>
  );
}
