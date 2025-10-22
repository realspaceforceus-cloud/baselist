import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getThreads,
  getMessages,
  sendMessage,
  markThreadAsRead,
  archiveThread,
  deleteThread,
} from "@/lib/messagesApi";

const THREADS_QUERY_KEY = ["messageThreads"];
const MESSAGES_QUERY_KEY = ["messages"];

/**
 * Hook to fetch user's message threads with pagination
 */
export function useMessageThreads(options?: {
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...THREADS_QUERY_KEY, options?.offset],
    queryFn: () => getThreads(options),
    staleTime: 1000 * 30, // 30 seconds (messages are fresh-critical)
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch messages in a specific thread
 */
export function useMessages(
  threadId: string | null,
  options?: { limit?: number; offset?: number },
) {
  return useQuery({
    queryKey: [...MESSAGES_QUERY_KEY, threadId, options?.offset],
    queryFn: () => getMessages(threadId!, options),
    enabled: !!threadId,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      // Invalidate threads and messages to get fresh data
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });

      toast.success("Message sent");
      return data;
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to send message";
      toast.error(message);
    },
  });
}

/**
 * Hook to mark a thread as read
 */
export function useMarkThreadAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markThreadAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
    },
    onError: (error) => {
      console.error("Failed to mark thread as read:", error);
    },
  });
}

/**
 * Hook to archive a thread
 */
export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
      toast.success("Thread archived");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to archive thread";
      toast.error(message);
    },
  });
}

/**
 * Hook to delete a thread
 */
export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteThread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: THREADS_QUERY_KEY });
      toast.success("Thread deleted");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to delete thread";
      toast.error(message);
    },
  });
}
