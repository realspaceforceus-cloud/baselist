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
  ThreadTransaction,
  TransactionHistoryEntry,
  RatingSummary,
  UserProfile,
} from "@/types";

const PASSWORD_MIN_LENGTH = 12;
const REMEMBER_DEVICE_DAYS = 30;

const buildAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontWeight=700`;

const buildUserProfileFromAccount = (
  account: BaseListAccount,
): UserProfile => ({
  id: account.id,
  name: account.username,
  verified: account.isDodVerified,
  memberSince: account.createdAt,
  avatarUrl: account.avatarUrl,
  rating: undefined,
  completedSales: undefined,
  lastActiveAt: account.lastLoginAt ?? account.createdAt,
  currentBaseId: account.baseId,
  verificationStatus: account.isDodVerified ? "Verified" : "Pending verification",
  role: "member",
});

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const ALLOWED_DOD_DOMAINS = [
  ".mil",
  ".defense.gov",
  ".disa.mil",
  ".dia.mil",
  ".dla.mil",
  ".dcma.mil",
  ".js.mil",
  ".osd.mil",
  ".ng.mil",
  ".spaceforce.mil",
  ".usmc.mil",
  ".army.mil",
  ".af.mil",
  ".navy.mil",
  ".uscg.mil",
  ".va.gov",
  ".us.af.mil",
] as const;

const isDodEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  return ALLOWED_DOD_DOMAINS.some((domain) => trimmed.endsWith(domain));
};

type BaseListAccount = {
  id: string;
  username: string;
  email: string;
  password: string;
  isDodVerified: boolean;
  baseId: string;
  createdAt: string;
  lastLoginAt?: string;
  rememberDeviceUntil?: string;
  avatarUrl: string;
  verificationToken: string | null;
  verificationRequestedAt: string | null;
};

type PasswordResetRequest = {
  token: string;
  accountId: string;
  expiresAt: string;
};

type CreateAccountPayload = {
  username: string;
  email: string;
  password: string;
  baseId: string;
};

type SignInOptions = {
  rememberDevice?: boolean;
};

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
  isDodVerified: boolean;
  isModerator: boolean;
  accounts: BaseListAccount[];
  currentAccount: BaseListAccount | null;
  createAccount: (payload: CreateAccountPayload) => BaseListAccount;
  activateAccount: (accountId: string, options?: SignInOptions) => void;
  signInWithPassword: (
    identifier: string,
    password: string,
    options?: SignInOptions,
  ) => void;
  requestPasswordReset: (email: string) => string | null;
  completePasswordReset: (token: string, newPassword: string) => void;
  cancelPasswordReset: () => void;
  beginVerification: (method: "email" | "invite" | "manual") => void;
  completeDodVerification: (accountId: string) => void;
  signOut: () => void;
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
  initiateTransaction: (threadId: string, initiatedBy: string) => void;
  confirmTransactionCompletion: (threadId: string, confirmerId: string) => void;
  submitTransactionRating: (threadId: string, rating: number) => void;
  archiveThread: (threadId: string) => void;
  unarchiveThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  markThreadAsRead: (threadId: string) => void;
  unreadMessageCount: number;
  transactions: TransactionHistoryEntry[];
  getUserRatingSummary: (userId: string) => RatingSummary;
  getMemberName: (userId: string) => string;
  pendingPasswordReset?: PasswordResetRequest | null;
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
  const [accounts, setAccounts] = useState<BaseListAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [pendingPasswordReset, setPendingPasswordReset] =
    useState<PasswordResetRequest | null>(null);
  const [listings, setListings] = useState<Listing[]>(() => {
    return [...LISTING_SEED].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  });
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>(
    () => [...MESSAGE_THREAD_SEED],
  );
  const [transactions, setTransactions] = useState<TransactionHistoryEntry[]>([]);
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

  const isAuthenticated = activeAccountId !== null;
  const currentAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );
  const isDodVerified = currentAccount?.isDodVerified ?? false;

  useEffect(() => {
    if (currentAccount) {
      setUser(buildUserProfileFromAccount(currentAccount));
      if (currentAccount.baseId !== currentBaseId) {
        setCurrentBaseIdState(currentAccount.baseId);
      }
    } else if (!isAuthenticated) {
      setUser((prev) => ({
        ...CURRENT_USER,
        currentBaseId: CURRENT_USER.currentBaseId,
      }));
      if (currentBaseId !== CURRENT_USER.currentBaseId) {
        setCurrentBaseIdState(CURRENT_USER.currentBaseId);
      }
    }
  }, [currentAccount, currentBaseId, isAuthenticated]);

  const setCurrentBaseId = useCallback(
    (baseId: string) => {
      setCurrentBaseIdState(baseId);
      setUser((prev) => ({ ...prev, currentBaseId: baseId }));
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === activeAccountId
            ? {
                ...account,
                baseId,
              }
            : account,
        ),
      );
    },
    [activeAccountId],
  );

  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const resolveDisplayName = useCallback(
    (id: string): string => {
      if (id === user.id) {
        return user.name;
      }

      const accountMatch = accounts.find((account) => account.id === id);
      if (accountMatch) {
        return accountMatch.username;
      }

      const sellerMatch = SELLERS.find((seller) => seller.id === id);
      if (sellerMatch) {
        return sellerMatch.name;
      }

      return "member";
    },
    [accounts, user.id, user.name],
  );

  const ensureUniqueAccount = useCallback(
    (username: string, email: string) => {
      const normalizedUsername = username.trim().toLowerCase();
      const normalizedEmail = email.trim().toLowerCase();

      const usernameTaken = accounts.some(
        (account) => account.username.toLowerCase() === normalizedUsername,
      );
      if (usernameTaken) {
        throw new Error("That username is already taken. Try another.");
      }

      const emailTaken = accounts.some(
        (account) => account.email.toLowerCase() === normalizedEmail,
      );
      if (emailTaken) {
        throw new Error("An account already exists with that email.");
      }
    },
    [accounts],
  );

  const createAccount = useCallback(
    ({ username, email, password, baseId }: CreateAccountPayload) => {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      if (!trimmedUsername || !trimmedEmail || !trimmedPassword) {
        throw new Error("Fill in all required fields.");
      }

      if (!USERNAME_PATTERN.test(trimmedUsername)) {
        throw new Error(
          "Username must be 3-20 characters using letters, numbers, or underscores.",
        );
      }

      if (!EMAIL_PATTERN.test(trimmedEmail)) {
        throw new Error("Enter a valid email address.");
      }

      if (!isDodEmail(trimmedEmail)) {
        throw new Error("A verified DoD email (.mil or approved DoD domain) is required.");
      }

      if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
        throw new Error("Passwords must be at least 12 characters long.");
      }

      ensureUniqueAccount(trimmedUsername, trimmedEmail);

      const isDod = isDodEmail(trimmedEmail);
      const newAccount: BaseListAccount = {
        id: `acct-${crypto.randomUUID()}`,
        username: trimmedUsername,
        email: trimmedEmail,
        password: trimmedPassword,
        isDodVerified: false,
        baseId,
        createdAt: new Date().toISOString(),
        avatarUrl: buildAvatarUrl(trimmedUsername),
        verificationToken: isDod ? `verify-${crypto.randomUUID()}` : null,
        verificationRequestedAt: isDod ? new Date().toISOString() : null,
      };

      setAccounts((prev) => [newAccount, ...prev]);

      return newAccount;
    },
    [ensureUniqueAccount],
  );

  const activateAccount = useCallback(
    (accountId: string, options?: SignInOptions) => {
      const existing = accounts.find((item) => item.id === accountId);
      if (!existing) {
        throw new Error("Account no longer exists.");
      }

      const rememberUntil = options?.rememberDevice
        ? new Date(Date.now() + REMEMBER_DEVICE_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      const lastLoginAt = new Date().toISOString();

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === accountId
            ? {
                ...account,
                lastLoginAt,
                rememberDeviceUntil: rememberUntil,
              }
            : account,
        ),
      );

      setActiveAccountId(accountId);
      setCurrentBaseIdState(existing.baseId);
      setUser(
        buildUserProfileFromAccount({
          ...existing,
          lastLoginAt,
          rememberDeviceUntil: rememberUntil,
        }),
      );
    },
    [accounts],
  );

  const signInWithPassword = useCallback(
    (identifier: string, password: string, options?: SignInOptions) => {
      const normalized = identifier.trim().toLowerCase();
      const account = accounts.find((candidate) => {
        return (
          candidate.username.toLowerCase() === normalized ||
          candidate.email.toLowerCase() === normalized
        );
      });

      if (!account) {
        throw new Error("We couldn’t find an account with those details.");
      }

      if (account.password !== password) {
        throw new Error("Incorrect password. Try again.");
      }

      if (!account.isDodVerified) {
        throw new Error("Confirm your DoD email from the link we sent before signing in.");
      }

      activateAccount(account.id, options);
      toast.success("Welcome back", {
        description: options?.rememberDevice
          ? "You’re signed in. We’ll remember this device for 30 days."
          : "You’re signed in. We’ll keep you active for this session.",
      });
    },
    [accounts, activateAccount],
  );

  const cancelPasswordReset = useCallback(() => {
    setPendingPasswordReset(null);
  }, []);

  const requestPasswordReset = useCallback(
    (email: string) => {
      const normalized = email.trim().toLowerCase();
      const account = accounts.find(
        (candidate) => candidate.email.toLowerCase() === normalized,
      );

      if (!account) {
        return null;
      }

      const token = `reset-${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      setPendingPasswordReset({
        token,
        accountId: account.id,
        expiresAt,
      });

      return token;
    },
    [accounts],
  );

  const completePasswordReset = useCallback(
    (token: string, newPassword: string) => {
      if (!pendingPasswordReset || pendingPasswordReset.token !== token) {
        throw new Error("Reset link has expired or is invalid.");
      }

      if (newPassword.trim().length < PASSWORD_MIN_LENGTH) {
        throw new Error("Passwords must be at least 12 characters long.");
      }

      const now = new Date();
      if (new Date(pendingPasswordReset.expiresAt) < now) {
        setPendingPasswordReset(null);
        throw new Error("Reset link has expired. Request a new one.");
      }

      setAccounts((prev) =>
        prev.map((account) =>
          account.id === pendingPasswordReset.accountId
            ? { ...account, password: newPassword, rememberDeviceUntil: undefined }
            : account,
        ),
      );

      setPendingPasswordReset(null);
      toast.success("Password updated", {
        description: "Use your new password to sign in.",
      });
    },
    [pendingPasswordReset],
  );

  const beginVerification = useCallback(
    (method: "email" | "invite" | "manual") => {
      if (!currentAccount) {
        toast.info("Sign in to manage your verification status.");
        return;
      }

      if (method === "email") {
        if (!isDodEmail(currentAccount.email)) {
          toast.info(
            "Add a DoD-issued email to verify automatically.",
          );
          return;
        }

        if (currentAccount.isDodVerified) {
          toast.success("Already verified", {
            description: "Your account is already cleared to post and message.",
          });
          return;
        }

        const verificationToken = `verify-${crypto.randomUUID()}`;
        const requestedAt = new Date().toISOString();

        setAccounts((prev) =>
          prev.map((account) =>
            account.id === currentAccount.id
              ? {
                  ...account,
                  verificationToken,
                  verificationRequestedAt: requestedAt,
                }
              : account,
          ),
        );
        toast.success("Verification email sent", {
          description: "Check your inbox and confirm to unlock posting.",
        });
        return;
      }

      if (method === "invite") {
        toast.info("Enter your invite code from the Profile → Verify screen.");
        return;
      }

      toast.info(
        "Upload a redacted DoD ID from Profile → Verify. We delete uploads within 24h.",
      );
    },
    [currentAccount],
  );

  const completeDodVerification = useCallback(
    (accountId: string) => {
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        throw new Error("Account not found for verification.");
      }

      if (!isDodEmail(account.email)) {
        throw new Error("DoD email verification is only available for DoD addresses.");
      }

      if (account.isDodVerified) {
        return;
      }

      const completedAt = new Date().toISOString();

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === accountId
            ? {
                ...item,
                isDodVerified: true,
                verificationToken: null,
                verificationRequestedAt: completedAt,
              }
            : item,
        ),
      );

      if (activeAccountId === accountId) {
        setUser((prev) => ({
          ...prev,
          verificationStatus: "Verified",
          verified: true,
        }));
      }

      toast.success("DoD email verified", {
        description: "You can now post listings and send messages.",
      });
    },
    [accounts, activeAccountId, setAccounts, setUser],
  );

  const signOut = useCallback(() => {
    setActiveAccountId(null);
    setUser((prev) => ({
      ...CURRENT_USER,
      currentBaseId: prev.currentBaseId,
    }));
    setCurrentBaseIdState(CURRENT_USER.currentBaseId);
  }, []);

  const addListing = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        throw new Error("Sign in to post a listing.");
      }
      if (!isDodVerified) {
        throw new Error("Verify DoD access before posting.");
      }

      setListings((prev) => {
        const next = [listing, ...prev];
        next.sort(
          (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
        );
        return next;
      });
    },
    [isAuthenticated, isDodVerified],
  );

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

  const handleTransactionProgress = useCallback(
    (threadId: string, confirmerId: string) => {
      const confirmerName = resolveDisplayName(confirmerId);
      let completionContext:
        | {
            threadId: string;
            listingId: string;
            buyerId: string;
            sellerId: string;
            price: number | null;
            completedAt: string;
          }
        | null = null;
      let createdNewTransaction = false;
      let newlyConfirmed = false;

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const now = new Date().toISOString();
          const listing = listings.find((item) => item.id === thread.listingId);
          const existingTransaction = thread.transaction;

          if (existingTransaction?.status === "completed") {
            return thread;
          }

          const confirmedSet = new Set(existingTransaction?.confirmedBy ?? []);
          const alreadyConfirmed = confirmedSet.has(confirmerId);
          confirmedSet.add(confirmerId);

          const transaction: ThreadTransaction = {
            id: existingTransaction?.id ?? `txn-${crypto.randomUUID()}`,
            status: "pending_confirmation",
            initiatedBy: existingTransaction?.initiatedBy ?? confirmerId,
            confirmedBy: Array.from(confirmedSet),
            completedAt: existingTransaction?.completedAt,
            ratingByUser: existingTransaction?.ratingByUser ?? {},
          };

          const messages = [...thread.messages];

          if (!existingTransaction) {
            createdNewTransaction = true;
            messages.push({
              id: `msg-${crypto.randomUUID()}`,
              authorId: "system",
              body: `This transaction has been marked complete by ${confirmerName}. Confirm?`,
              sentAt: now,
              type: "system",
            });
          } else if (!alreadyConfirmed) {
            newlyConfirmed = true;
            messages.push({
              id: `msg-${crypto.randomUUID()}`,
              authorId: "system",
              body: `${confirmerName} confirmed completion. Waiting for the other member.`,
              sentAt: now,
              type: "system",
            });
          } else {
            return thread;
          }

          const participants = thread.participants;
          const allConfirmed = participants.every((participantId) =>
            transaction.confirmedBy.includes(participantId),
          );

          if (allConfirmed) {
            transaction.status = "completed";
            transaction.completedAt = now;
            messages.push({
              id: `msg-${crypto.randomUUID()}`,
              authorId: "system",
              body: "Transaction completed. Listing marked sold.",
              sentAt: now,
              type: "system",
            });

            if (listing) {
              const sellerId = listing.sellerId;
              const buyerId =
                participants.find((participantId) => participantId !== sellerId) ?? confirmerId;

              completionContext = {
                threadId: thread.id,
                listingId: listing.id,
                buyerId,
                sellerId,
                price: listing.isFree ? 0 : listing.price,
                completedAt: now,
              };
            }
          }

          return {
            ...thread,
            transaction,
            status: allConfirmed ? "completed" : thread.status,
            messages,
          };
        }),
      );

      if (completionContext) {
        markListingSold(completionContext.listingId);
        setTransactions((prev) => {
          if (prev.some((entry) => entry.threadId === completionContext!.threadId)) {
            return prev;
          }
          return [
            {
              id: completionContext.threadId,
              threadId: completionContext.threadId,
              listingId: completionContext.listingId,
              buyerId: completionContext.buyerId,
              sellerId: completionContext.sellerId,
              price: completionContext.price,
              completedAt: completionContext.completedAt,
            },
            ...prev,
          ];
        });
        toast.success("Transaction completed", {
          description: "Listing marked sold and ratings unlocked.",
        });
      } else if (createdNewTransaction) {
        toast.info("Transaction marked complete", {
          description: "Waiting for the other member to confirm.",
        });
      } else if (newlyConfirmed) {
        toast.info("Confirmation recorded", {
          description: "Waiting for the other member.",
        });
      }
    },
    [listings, markListingSold, resolveDisplayName],
  );

  const initiateTransaction = useCallback(
    (threadId: string, initiatedBy: string) => {
      handleTransactionProgress(threadId, initiatedBy);
    },
    [handleTransactionProgress],
  );

  const confirmTransactionCompletion = useCallback(
    (threadId: string, confirmerId: string) => {
      handleTransactionProgress(threadId, confirmerId);
    },
    [handleTransactionProgress],
  );

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
    [user.name],
  );

  const sendMessageToSeller = useCallback(
    (listingId: string, sellerId: string, messageBody: string) => {
      if (!isAuthenticated) {
        throw new Error("Sign in to send messages.");
      }
      if (!isDodVerified) {
        throw new Error("Verify DoD access before messaging sellers.");
      }

      const trimmedMessage = messageBody.trim();
      if (!trimmedMessage) {
        throw new Error("Message body cannot be empty");
      }

      const normalizedMessage = trimmedMessage.toLowerCase();
      const shouldInitiateTransaction =
        normalizedMessage === "offer accepted" || normalizedMessage === "mark sold";

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
            archivedBy: existingThread.archivedBy?.filter((id) => id !== user.id) ?? [],
            deletedBy: existingThread.deletedBy?.filter((id) => id !== user.id) ?? [],
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
          status: "active",
          archivedBy: [],
          deletedBy: [],
        };

        targetThread = freshThread;
        shouldScheduleReply = true;

        return [freshThread, ...prev];
      });

      if (shouldInitiateTransaction && targetThread) {
        initiateTransaction(targetThread.id, user.id);
      }

      if (shouldScheduleReply && targetThread) {
        scheduleSimulatedReply(targetThread, sellerId);
      }

      return targetThread!;
    },
    [
      initiateTransaction,
      isAuthenticated,
      isDodVerified,
      scheduleSimulatedReply,
      user.id,
    ],
  );

  const submitTransactionRating = useCallback(
    (threadId: string, rating: number) => {
      if (!isAuthenticated) {
        throw new Error("Sign in to rate transactions.");
      }

      if (rating < 1 || rating > 5) {
        throw new Error("Ratings must be between 1 and 5 stars.");
      }

      let updated = false;

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (
            thread.id !== threadId ||
            !thread.transaction ||
            thread.transaction.status !== "completed"
          ) {
            return thread;
          }

          const existingRating = thread.transaction.ratingByUser[user.id];
          if (existingRating === rating) {
            return thread;
          }

          updated = true;
          return {
            ...thread,
            transaction: {
              ...thread.transaction,
              ratingByUser: {
                ...thread.transaction.ratingByUser,
                [user.id]: rating,
              },
            },
          };
        }),
      );

      if (!updated) {
        return;
      }

      setTransactions((prev) => {
        const existing = prev.find((entry) => entry.threadId === threadId);
        if (!existing) {
          const thread = messageThreads.find((item) => item.id === threadId);
          if (!thread || !thread.transaction || thread.transaction.status !== "completed") {
            return prev;
          }
          const listing = listings.find((item) => item.id === thread.listingId);
          if (!listing) {
            return prev;
          }
          const sellerId = listing.sellerId;
          const buyerId =
            thread.participants.find((participantId) => participantId !== sellerId) ?? user.id;

          return [
            {
              id: thread.id,
              threadId: thread.id,
              listingId: listing.id,
              buyerId,
              sellerId,
              price: listing.isFree ? 0 : listing.price,
              completedAt: thread.transaction.completedAt ?? new Date().toISOString(),
              ...(buyerId === user.id
                ? { buyerRatingAboutSeller: rating }
                : { sellerRatingAboutBuyer: rating }),
            },
            ...prev,
          ];
        }

        return prev.map((entry) => {
          if (entry.threadId !== threadId) {
            return entry;
          }

          if (entry.buyerId === user.id) {
            return { ...entry, buyerRatingAboutSeller: rating };
          }
          if (entry.sellerId === user.id) {
            return { ...entry, sellerRatingAboutBuyer: rating };
          }
          return entry;
        });
      });

      toast.success("Rating submitted", {
        description: "Thanks for keeping BaseList trustworthy.",
      });
    },
    [isAuthenticated, listings, messageThreads, user.id],
  );

  const archiveThread = useCallback(
    (threadId: string) => {
      if (!isAuthenticated) {
        return;
      }

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }
          const archived = new Set(thread.archivedBy ?? []);
          if (archived.has(user.id)) {
            return thread;
          }
          archived.add(user.id);
          return {
            ...thread,
            archivedBy: Array.from(archived),
          };
        }),
      );

      toast.success("Thread archived", {
        description: "Find it anytime under Archived.",
      });
    },
    [isAuthenticated, user.id],
  );

  const unarchiveThread = useCallback(
    (threadId: string) => {
      if (!isAuthenticated) {
        return;
      }

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }
          return {
            ...thread,
            archivedBy: thread.archivedBy?.filter((id) => id !== user.id) ?? [],
          };
        }),
      );

      toast.success("Thread restored", {
        description: "It’s back in your inbox.",
      });
    },
    [isAuthenticated, user.id],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      if (!isAuthenticated) {
        return;
      }

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }
          const deleted = new Set(thread.deletedBy ?? []);
          if (deleted.has(user.id)) {
            return thread;
          }
          deleted.add(user.id);
          return {
            ...thread,
            deletedBy: Array.from(deleted),
            archivedBy: thread.archivedBy?.filter((id) => id !== user.id) ?? [],
          };
        }),
      );

      toast.success("Thread removed", {
        description: "It won’t appear in your inbox anymore.",
      });
    },
    [isAuthenticated, user.id],
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

  const ratingSummaries = useMemo(() => {
    type Totals = {
      sellerTotal: number;
      sellerCount: number;
      buyerTotal: number;
      buyerCount: number;
    };

    const totalsMap = new Map<string, Totals>();

    const ensureTotals = (id: string): Totals => {
      if (!totalsMap.has(id)) {
        totalsMap.set(id, { sellerTotal: 0, sellerCount: 0, buyerTotal: 0, buyerCount: 0 });
      }
      return totalsMap.get(id)!;
    };

    SELLERS.forEach((seller) => {
      if (seller.rating && seller.ratingCount) {
        const entry = ensureTotals(seller.id);
        entry.sellerTotal += seller.rating * seller.ratingCount;
        entry.sellerCount += seller.ratingCount;
      }
    });

    transactions.forEach((transaction) => {
      if (typeof transaction.buyerRatingAboutSeller === "number") {
        const sellerTotals = ensureTotals(transaction.sellerId);
        sellerTotals.sellerTotal += transaction.buyerRatingAboutSeller;
        sellerTotals.sellerCount += 1;
      }

      if (typeof transaction.sellerRatingAboutBuyer === "number") {
        const buyerTotals = ensureTotals(transaction.buyerId);
        buyerTotals.buyerTotal += transaction.sellerRatingAboutBuyer;
        buyerTotals.buyerCount += 1;
      }
    });

    const summaryMap = new Map<string, RatingSummary>();

    totalsMap.forEach((value, key) => {
      const overallTotal = value.sellerTotal + value.buyerTotal;
      const overallCount = value.sellerCount + value.buyerCount;

      summaryMap.set(key, {
        overallAverage: overallCount ? overallTotal / overallCount : null,
        overallCount,
        sellerAverage: value.sellerCount ? value.sellerTotal / value.sellerCount : null,
        sellerCount: value.sellerCount,
        buyerAverage: value.buyerCount ? value.buyerTotal / value.buyerCount : null,
        buyerCount: value.buyerCount,
      });
    });

    return summaryMap;
  }, [transactions]);

  const getUserRatingSummary = useCallback(
    (userId: string): RatingSummary => {
      const summary = ratingSummaries.get(userId);
      if (summary) {
        return summary;
      }
      return {
        overallAverage: null,
        overallCount: 0,
        sellerAverage: null,
        sellerCount: 0,
        buyerAverage: null,
        buyerCount: 0,
      };
    },
    [ratingSummaries],
  );

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

  useEffect(() => {
    return () => {
      simulatedReplyTimers.current.forEach((timer) => {
        clearTimeout(timer);
      });
      simulatedReplyTimers.current.clear();
    };
  }, []);

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
      isDodVerified,
      isModerator: user.role !== "member",
      accounts,
      currentAccount,
      createAccount,
      activateAccount,
      signInWithPassword,
      requestPasswordReset,
      completePasswordReset,
      cancelPasswordReset,
      beginVerification,
      completeDodVerification,
      signOut,
      listings,
      addListing,
      markListingSold,
      removeListing,
      messageThreads,
      sendMessageToSeller,
      initiateTransaction,
      confirmTransactionCompletion,
      submitTransactionRating,
      archiveThread,
      unarchiveThread,
      deleteThread,
      markThreadAsRead,
      unreadMessageCount,
      transactions,
      getUserRatingSummary,
      getMemberName: resolveDisplayName,
      pendingPasswordReset,
    }),
    [
      accounts,
      activateAccount,
      addListing,
      archiveThread,
      cancelPasswordReset,
      clearSearch,
      completePasswordReset,
      createAccount,
      currentAccount,
      currentBase,
      currentBaseId,
      deleteThread,
      getUserRatingSummary,
      initiateTransaction,
      confirmTransactionCompletion,
      isAuthenticated,
      isDodVerified,
      listings,
      markListingSold,
      completeDodVerification,
      beginVerification,
      markThreadAsRead,
      messageThreads,
      pendingPasswordReset,
      removeListing,
      requestPasswordReset,
      searchQuery,
      sendMessageToSeller,
      setCurrentBaseId,
      signInWithPassword,
      signOut,
      submitTransactionRating,
      transactions,
      unarchiveThread,
      unreadMessageCount,
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

export { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, isDodEmail };
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
