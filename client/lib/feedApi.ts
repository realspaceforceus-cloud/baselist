import type { FeedPost, FeedAnnouncement } from "@/types";

export const feedApi = {
  async getPosts(
    baseId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<FeedPost[]> {
    const response = await fetch(
      `/api/feed/posts?baseId=${baseId}&limit=${limit}&offset=${offset}`,
      { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to fetch posts");
    return response.json();
  },

  async getAnnouncements(baseId: string): Promise<FeedAnnouncement[]> {
    const response = await fetch(`/api/feed/announcements?baseId=${baseId}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch announcements");
    return response.json();
  },

  async createPost(
    baseId: string,
    postType: string,
    content: string,
    imageUrls: string[] = [],
    pollOptions?: any,
    eventData?: any,
  ): Promise<FeedPost> {
    const response = await fetch("/api/feed/posts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseId,
        postType,
        content,
        imageUrls,
        pollOptions,
        eventData,
      }),
    });
    if (!response.ok) throw new Error("Failed to create post");
    return response.json();
  },

  async likePost(postId: string): Promise<void> {
    const response = await fetch(`/api/feed/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to like post");
  },

  async commentOnPost(
    postId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<any> {
    const response = await fetch(`/api/feed/posts/${postId}/comment`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentCommentId }),
    });
    if (!response.ok) throw new Error("Failed to add comment");
    return response.json();
  },

  async voteOnPoll(postId: string, optionId: string): Promise<any> {
    const response = await fetch(`/api/feed/posts/${postId}/vote`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    if (!response.ok) throw new Error("Failed to vote on poll");
    return response.json();
  },

  async dismissAnnouncement(announcementId: string): Promise<void> {
    const response = await fetch(
      `/api/feed/announcements/${announcementId}/dismiss`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to dismiss announcement");
  },

  async createAnnouncement(
    baseId: string,
    title: string,
    content: string,
    imageUrl?: string,
    isSticky: boolean = false,
    isDismissible: boolean = true,
  ): Promise<any> {
    const response = await fetch("/api/feed/admin/announcements", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseId,
        title,
        content,
        imageUrl,
        isSticky,
        isDismissible,
      }),
    });
    if (!response.ok) throw new Error("Failed to create announcement");
    return response.json();
  },

  async deletePost(postId: string): Promise<void> {
    const response = await fetch(`/api/feed/posts/${postId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to delete post");
  },

  async reportPost(postId: string, reason: string): Promise<void> {
    const response = await fetch(`/api/feed/posts/${postId}/report`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error("Failed to report post");
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    const response = await fetch(
      `/api/feed/posts/${postId}/comments/${commentId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to delete comment");
  },

  async likeComment(postId: string, commentId: string): Promise<void> {
    const response = await fetch(
      `/api/feed/posts/${postId}/comments/${commentId}/like`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    if (!response.ok) throw new Error("Failed to like comment");
  },
};
