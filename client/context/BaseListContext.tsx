import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  BASES,
  CURRENT_USER,
  LISTINGS as LISTING_SEED,
  MESSAGE_THREADS as MESSAGE_THREAD_SEED,
  SELLERS,
} from "@/data/mock";
import type {
  Base,
  Listing,
  Message,
  MessageThread,
  UserProfile,
} from "@/types";

type BaseListContextValue = {
  bases: Base[];
  currentBaseId: string;
  currentBase: Base;
  setCurrentBaseId: (baseId: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  clearSearch: () => void;
  user: UserProfile;
  isVerified: boolean;
  isModerator: boolean;
  listings: Listing[];
  addListing: (listing: Listing) => void;
  markListingSold: (listingId: string) => void;
  removeListing: (listingId: string) => void;
  messageThreads: MessageThread[];
  sendMessageToSeller: (
    listingId: string,
    sellerId: string,
    messageBody: string,
  ) => MessageThread;
  markThreadAsRead: (threadId: string) => void;
  unreadMessageCount: number;
};

const BaseListContext = createContext<BaseListContextValue | undefined>(
  undefined,
);

export const BaseListProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const [currentBaseId, setCurrentBaseIdState] = useState<string>(
    CURRENT_USER.currentBaseId,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);
  const [listings, setListings] = useState<Listing[]>(() => {
    return [...LISTING_SEED].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  });
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>(
    () => [...MESSAGE_THREAD_SEED],
  );

  const setCurrentBaseId = useCallback((baseId: string) => {
    setCurrentBaseIdState(baseId);
    setUser((prev) => ({ ...prev, currentBaseId: baseId }));
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const addListing = useCallback((listing: Listing) => {
    setListings((prev) => {
      const next = [listing, ...prev];
      next.sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      );
      return next;
    });
  }, []);

  const markListingSold = useCallback((listingId: string) => {
    setListings((prev) =>
      prev.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              status: "sold",
            }
          : listing,
      ),
    );
  }, []);

  const removeListing = useCallback((listingId: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== listingId));
  }, []);

  const sendMessageToSeller = useCallback(
    (listingId: string, sellerId: string, messageBody: string) => {
      const trimmedMessage = messageBody.trim();
      if (!trimmedMessage) {
        throw new Error("Message body cannot be empty");
      }

      const timestamp = new Date().toISOString();
      const newMessage: Message = {
        id: `msg-${crypto.randomUUID()}`,
        authorId: user.id,
        body: trimmedMessage,
        sentAt: timestamp,
        type: "text",
      };

      let targetThread: MessageThread | undefined;

      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex(
          (thread) => thread.listingId === listingId,
        );

        if (existingIndex !== -1) {
          const existingThread = prev[existingIndex];
          const updatedThread: MessageThread = {
            ...existingThread,
            messages: [...existingThread.messages, newMessage],
            lastReadAt: {
              ...existingThread.lastReadAt,
              [user.id]: timestamp,
            },
          };

          targetThread = updatedThread;

          const remaining = prev.filter((_, index) => index !== existingIndex);
          return [updatedThread, ...remaining];
        }

        const freshThread: MessageThread = {
          id: `thread-${crypto.randomUUID()}`,
          listingId,
          participants: [user.id, sellerId],
          messages: [newMessage],
          lastReadAt: {
            [user.id]: timestamp,
          },
        };

        targetThread = freshThread;

        return [freshThread, ...prev];
      });

      return targetThread!;
    },
    [user.id],
  );

  const markThreadAsRead = useCallback(
    (threadId: string) => {
      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const lastMessage = thread.messages[thread.messages.length - 1];

          if (!lastMessage) {
            return thread;
          }

          return {
            ...thread,
            lastReadAt: {
              ...thread.lastReadAt,
              [user.id]: lastMessage.sentAt,
            },
          };
        }),
      );
    },
    [user.id],
  );

  const currentBase = useMemo<Base>(() => {
    return (
      BASES.find((base) => base.id === currentBaseId) ??
      BASES.find((base) => base.id === CURRENT_USER.currentBaseId) ??
      BASES[0]
    );
  }, [currentBaseId]);

  const contextValue = useMemo<BaseListContextValue>(
    () => ({
      bases: BASES,
      currentBaseId,
      currentBase,
      setCurrentBaseId,
      searchQuery,
      setSearchQuery,
      clearSearch,
      user,
      isVerified: user.verificationStatus === "Verified",
      isModerator: user.role !== "member",
      listings,
      addListing,
      markListingSold,
      removeListing,
      messageThreads,
      sendMessageToSeller,
      markThreadAsRead,
    }),
    [
      addListing,
      clearSearch,
      currentBase,
      currentBaseId,
      listings,
      markListingSold,
      markThreadAsRead,
      messageThreads,
      removeListing,
      searchQuery,
      sendMessageToSeller,
      setCurrentBaseId,
      user,
    ],
  );

  return (
    <BaseListContext.Provider value={contextValue}>
      {children}
    </BaseListContext.Provider>
  );
};

export const useBaseList = (): BaseListContextValue => {
  const context = useContext(BaseListContext);

  if (!context) {
    throw new Error("useBaseList must be used within BaseListProvider");
  }

  return context;
};
