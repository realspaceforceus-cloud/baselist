import type { MessageThread, Message } from "@/types";

export interface ThreadWithPartner extends MessageThread {
  partner?: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    verified?: boolean;
  };
}

export interface ThreadsResponse {
  threads: ThreadWithPartner[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Fetch user's message threads with pagination
 */
export async function getThreads(
  limit: number = 50,
  offset: number = 0,
): Promise<ThreadsResponse> {
  const params = new URLSearchParams();
  params.append("limit", limit.toString());
  params.append("offset", offset.toString());

  const url = `/.netlify/functions/messages?${params.toString()}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch message threads");
  }

  return response.json();
}

/**
 * Fetch messages in a thread
 */
export async function getMessages(
  threadId: string,
  options?: { limit?: number; offset?: number },
): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset !== undefined)
    params.append("offset", options.offset.toString());

  const url = `/.netlify/functions/messages/threads/${threadId}${params.toString() ? "?" + params.toString() : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
}

/**
 * Send a message
 */
export async function sendMessage(data: {
  listingId: string;
  recipientId: string;
  body: string;
}): Promise<{ message: Message; thread: MessageThread }> {
  const response = await fetch("/.netlify/functions/messages", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }

  return response.json();
}

/**
 * Mark a thread as read
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  const response = await fetch(
    `/.netlify/functions/messages/threads/${threadId}/read`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to mark thread as read");
  }
}

/**
 * Archive a thread
 */
export async function archiveThread(threadId: string): Promise<void> {
  const response = await fetch(
    `/.netlify/functions/messages/threads/${threadId}/archive`,
    {
      method: "PATCH",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to archive thread");
  }
}

/**
 * Delete a thread
 */
export async function deleteThread(threadId: string): Promise<void> {
  const response = await fetch(
    `/.netlify/functions/messages/threads/${threadId}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete thread");
  }
}
