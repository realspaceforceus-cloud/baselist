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
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [listings, setListings] = useState<Listing[]>(() => {
    return [...LISTING_SEED].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  });
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>(
    () => [...MESSAGE_THREAD_SEED],
  );
  const navigate = useNavigate();
  const knownMessageIdsRef = useRef<Set<string>>(
    new Set(
      MESSAGE_THREAD_SEED.flatMap((thread) =>
        thread.messages.map((message) => message.id),
      ),
    ),
  );
  const simulatedReplyTimers = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  const setCurrentBaseId = useCallback((baseId: string) => {
    setCurrentBaseIdState(baseId);
    setUser((prev) => ({ ...prev, currentBaseId: baseId }));
  }, []);

  const signIn = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(() => {
    setIsAuthenticated(false);
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

  const scheduleSimulatedReply = useCallback(
    (thread: MessageThread, sellerId: string) => {
      if (simulatedReplyTimers.current.has(thread.id)) {
        return;
      }

      const partner = SELLERS.find((candidate) => candidate.id === sellerId);
      const partnerFirstName = partner?.name.split(" ")[0] ?? "there";
      const buyerFirstName = user.name.split(" ")[0];

      const timer = setTimeout(() => {
        setMessageThreads((prev) =>
          prev.map((existingThread) => {
            if (existingThread.id !== thread.id) {
              return existingThread;
            }

            const replyMessage: Message = {
              id: `msg-${crypto.randomUUID()}`,
              authorId: sellerId,
              body: `Hi ${buyerFirstName}, this is ${partnerFirstName}. It is still available — when would you like to pick it up?`,
              sentAt: new Date().toISOString(),
              type: "text",
            };

            return {
              ...existingThread,
              messages: [...existingThread.messages, replyMessage],
            };
          }),
        );
        simulatedReplyTimers.current.delete(thread.id);
      }, 2200);

      simulatedReplyTimers.current.set(thread.id, timer);
    },
    [setMessageThreads, user.name],
  );

  const sendMessageToSeller = useCallback(
    (listingId: string, sellerId: string, messageBody: string) => {
      if (!isAuthenticated) {
        throw new Error("You must be signed in to send messages");
      }

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
      let shouldScheduleReply = false;

      setMessageThreads((prev) => {
        const existingIndex = prev.findIndex(
          (thread) =>
            thread.listingId === listingId &&
            thread.participants.includes(user.id) &&
            thread.participants.includes(sellerId),
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
        shouldScheduleReply = true;

        return [freshThread, ...prev];
      });

      if (shouldScheduleReply && targetThread) {
        scheduleSimulatedReply(targetThread, sellerId);
      }

      return targetThread!;
    },
    [isAuthenticated, scheduleSimulatedReply, user.id],
  );

  const markThreadAsRead = useCallback(
    (threadId: string) => {
      if (!isAuthenticated) {
        return;
      }

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
    [isAuthenticated, user.id],
  );

  const unreadMessageCount = useMemo(() => {
    if (!isAuthenticated) {
      return 0;
    }

    return messageThreads.reduce((count, thread) => {
      const lastReadAt = thread.lastReadAt?.[user.id];
      return (
        count +
        thread.messages.reduce((threadCount, message) => {
          if (message.authorId === user.id) {
            return threadCount;
          }
          if (!lastReadAt) {
            return threadCount + 1;
          }
          const isUnread =
            new Date(message.sentAt).getTime() > new Date(lastReadAt).getTime();
          return threadCount + (isUnread ? 1 : 0);
        }, 0)
      );
    }, 0);
  }, [isAuthenticated, messageThreads, user.id]);

  useEffect(() => {
    const currentIds = new Set<string>();
    const newIncoming: Array<{ thread: MessageThread; message: Message }> = [];

    messageThreads.forEach((thread) => {
      thread.messages.forEach((message) => {
        currentIds.add(message.id);
        if (
          !knownMessageIdsRef.current.has(message.id) &&
          message.authorId !== user.id
        ) {
          newIncoming.push({ thread, message });
        }
      });
    });

    knownMessageIdsRef.current = currentIds;

    if (!isAuthenticated || newIncoming.length === 0) {
      return;
    }

    newIncoming.forEach(({ thread, message }) => {
      const listing = listings.find((item) => item.id === thread.listingId);
      const partnerId = thread.participants.find(
        (participant) => participant !== user.id,
      );
      const partner = partnerId
        ? SELLERS.find((candidate) => candidate.id === partnerId)
        : undefined;

      const preview =
        message.body.length > 120
          ? `${message.body.slice(0, 117)}...`
          : message.body;

      toast(`${partner?.name ?? "New message"} replied`, {
        description: listing ? `${listing.title}: ${preview}` : preview,
        action: {
          label: "Open",
          onClick: () => navigate(`/messages/${thread.id}`),
        },
      });
    });
  }, [isAuthenticated, listings, messageThreads, navigate, user.id]);

  useEffect(
    () => () => {
      simulatedReplyTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      simulatedReplyTimers.current.clear();
    },
    [],
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
      isAuthenticated,
      signIn,
      signOut,
      isVerified: user.verificationStatus === "Verified",
      isModerator: user.role !== "member",
      listings,
      addListing,
      markListingSold,
      removeListing,
      messageThreads,
      sendMessageToSeller,
      markThreadAsRead,
      unreadMessageCount,
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
      signIn,
      signOut,
      unreadMessageCount,
      user,
      isAuthenticated,
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
