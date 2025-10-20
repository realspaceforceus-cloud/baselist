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
  CURRENT_USER,
  LISTINGS as LISTING_SEED,
  MESSAGE_THREADS as MESSAGE_THREAD_SEED,
  SELLERS,
  SPONSOR_PLACEMENTS,
} from "@/data/mock";
import { adminApi } from "@/lib/adminApi";
import type {
  AccountNotice,
  AccountNoticeCategory,
  AccountNoticeSeverity,
  Base,
  Listing,
  Message,
  MessageThread,
  ThreadTransaction,
  TransactionHistoryEntry,
  RatingSummary,
  SponsorPlacement,
  UserProfile,
} from "@/types";

const PASSWORD_MIN_LENGTH = 12;
const REMEMBER_DEVICE_DAYS = 30;

const buildAvatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontWeight=700`;

const buildUserProfileFromAccount = (
  account: BaseListAccount,
  discipline?: MemberDisciplineRecord,
): UserProfile => ({
  id: account.id,
  name: account.username,
  verified: account.isDowVerified,
  memberSince: account.createdAt,
  avatarUrl: account.avatarUrl,
  rating: undefined,
  completedSales: undefined,
  lastActiveAt: account.lastLoginAt ?? account.createdAt,
  currentBaseId: account.baseId,
  verificationStatus: account.isDowVerified
    ? "Verified"
    : "Pending verification",
  role: account.role,
  status: discipline?.suspendedAt ? "suspended" : "active",
  strikes: discipline?.strikes ?? 0,
});

const EMAIL_PATTERN = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export const ALLOWED_DOW_DOMAINS = [
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

const isDowEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(trimmed)) {
    return false;
  }
  return ALLOWED_DOW_DOMAINS.some((domain) => trimmed.endsWith(domain));
};

type BaseListAccount = {
  id: string;
  username: string;
  email: string;
  password: string;
  isDowVerified: boolean;
  baseId: string;
  createdAt: string;
  lastLoginAt?: string;
  rememberDeviceUntil?: string;
  avatarUrl: string;
  verificationToken: string | null;
  verificationRequestedAt: string | null;
  role: UserProfile["role"];
};

export type MemberDisciplineRecord = {
  strikes: number;
  suspendedAt?: string | null;
  reason?: string | null;
};

type PasswordResetRequest = {
  token: string;
  accountId: string;
  expiresAt: string;
};

type AddNoticePayload = {
  userId: string | "all";
  category: AccountNoticeCategory;
  severity?: AccountNoticeSeverity;
  title: string;
  message: string;
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

const toUsername = (name: string, fallback: string) => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "");

  return base.length >= 3 ? base : fallback;
};

const buildSeedAccounts = (): BaseListAccount[] => {
  return SELLERS.map((seller, index) => {
    const username = toUsername(seller.name, `member_${index + 1}`);
    // Use hardcoded base IDs - these will be replaced when bases are loaded from database
    const baseIds = [
      "ramstein-ab",
      "lakenheath-ab",
      "nellis-afb",
      "kadena-ab",
      "misawa-ab",
    ];
    const baseId = baseIds[index % baseIds.length];
    const createdAt = new Date(
      Date.now() - (index + 3) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const lastLoginAt = new Date(
      Date.now() - (index + 1) * 60 * 60 * 1000,
    ).toISOString();

    return {
      id: seller.id,
      username,
      email: `${username}@us.af.mil`,
      password: "Password!2024",
      isDowVerified: seller.verified,
      baseId,
      createdAt,
      lastLoginAt,
      rememberDeviceUntil: undefined,
      avatarUrl: seller.avatarUrl ?? buildAvatarUrl(seller.name),
      verificationToken: seller.verified
        ? null
        : `verify-${crypto.randomUUID()}`,
      verificationRequestedAt: seller.verified ? null : createdAt,
      role: seller.id === CURRENT_USER.id ? CURRENT_USER.role : "member",
    } satisfies BaseListAccount;
  });
};

const INITIAL_DISCIPLINE: Record<string, MemberDisciplineRecord> = {
  "seller-taylor": { strikes: 1, reason: "Report: incomplete delivery" },
  "seller-lena": { strikes: 2, reason: "Report: pricing dispute" },
};

const INITIAL_NOTICES: AccountNotice[] = [
  {
    id: `notice-${crypto.randomUUID()}`,
    userId: CURRENT_USER.id,
    category: "payout",
    severity: "success",
    title: "Payout sent",
    message: "$420.00 from your dining set sale was deposited.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
  },
  {
    id: `notice-${crypto.randomUUID()}`,
    userId: CURRENT_USER.id,
    category: "report",
    severity: "info",
    title: "Report resolved",
    message:
      "Buyer feedback for thread MSG-9022 was reviewed and closed with no action.",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: true,
  },
];

const ACCOUNT_SEED = buildSeedAccounts();

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
  isDowVerified: boolean;
  isModerator: boolean;
  accounts: BaseListAccount[];
  currentAccount: BaseListAccount | null;
  memberDiscipline: Record<string, MemberDisciplineRecord>;
  notices: AccountNotice[];
  addNotice: (payload: AddNoticePayload) => AccountNotice;
  markNoticeRead: (noticeId: string) => void;
  markAllNoticesRead: () => void;
  suspendMember: (memberId: string, reason: string) => void;
  reinstateMember: (memberId: string) => void;
  issueStrike: (memberId: string, reason: string) => void;
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
  completeDowVerification: (accountId: string) => void;
  signOut: () => void;
  updateUserAvatar: (avatarUrl: string) => void;
  listings: Listing[];
  addListing: (listing: Listing) => void;
  markListingSold: (listingId: string) => void;
  removeListing: (listingId: string) => void;
  sponsorPlacements: SponsorPlacement[];
  addSponsorPlacement: (placement: SponsorPlacement) => void;
  updateSponsorPlacement: (
    placementId: string,
    updates: Partial<Omit<SponsorPlacement, "id">>,
  ) => void;
  removeSponsorPlacement: (placementId: string) => void;
  messageThreads: MessageThread[];
  sendMessageToSeller: (
    listingId: string,
    sellerId: string,
    messageBody: string,
  ) => MessageThread;
  initiateTransaction: (threadId: string, initiatedBy: string) => void;
  markTransactionComplete: (threadId: string, userId: string) => void;
  confirmTransactionCompletion: (threadId: string, confirmerId: string) => void;
  raiseDispute: (threadId: string, userId: string, reason?: string) => void;
  resolveDispute: (
    threadId: string,
    resolveTo: "pending_complete" | "completed",
  ) => void;
  autoCompleteTransaction: (threadId: string) => void;
  submitTransactionRating: (threadId: string, rating: number) => void;
  archiveThread: (threadId: string) => void;
  unarchiveThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  markThreadAsRead: (threadId: string) => void;
  unreadMessageCount: number;
  transactions: TransactionHistoryEntry[];
  getUserRatingSummary: (userId: string) => RatingSummary;
  getMemberName: (userId: string) => string;
  getMemberProfile: (userId: string) => UserProfile | null;
  pendingPasswordReset?: PasswordResetRequest | null;
  analytics: {
    verifiedMembers: number;
    activeBases: number;
    completedTransactions: number;
  };
};

const BaseListContext = createContext<BaseListContextValue | undefined>(
  undefined,
);

export const BaseListProvider = ({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element => {
  const [bases, setBases] = useState<Base[]>([]);
  const [currentBaseId, setCurrentBaseIdState] = useState<string>(
    CURRENT_USER.currentBaseId,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [accounts, setAccounts] = useState<BaseListAccount[]>(() => [
    ...ACCOUNT_SEED,
  ]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    // Restore session from localStorage on mount
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("activeAccountId");
      return saved && typeof saved === "string" && saved.length > 0
        ? saved
        : null;
    } catch {
      return null;
    }
  });
  const [memberDiscipline, setMemberDiscipline] = useState<
    Record<string, MemberDisciplineRecord>
  >(() => ({ ...INITIAL_DISCIPLINE }));
  const [notices, setNotices] = useState<AccountNotice[]>(() => [
    ...INITIAL_NOTICES,
  ]);
  const [user, setUser] = useState<UserProfile>(() => {
    const initialAccount = ACCOUNT_SEED.find(
      (account) => account.id === CURRENT_USER.id,
    );
    if (initialAccount) {
      return buildUserProfileFromAccount(
        initialAccount,
        INITIAL_DISCIPLINE[initialAccount.id],
      );
    }
    return CURRENT_USER;
  });
  const [pendingPasswordReset, setPendingPasswordReset] =
    useState<PasswordResetRequest | null>(null);
  const [listings, setListings] = useState<Listing[]>(() => {
    return [...LISTING_SEED].sort(
      (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
    );
  });
  const [sponsorPlacements, setSponsorPlacements] = useState<
    SponsorPlacement[]
  >(() => [...SPONSOR_PLACEMENTS]);
  // Only show mock messages for unauthenticated users
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>(
    () => [],
  );
  const [transactions, setTransactions] = useState<TransactionHistoryEntry[]>(
    [],
  );
  const [analyticsCounters, setAnalyticsCounters] = useState({
    verifiedMembers: ACCOUNT_SEED.filter((account) => account.isDowVerified)
      .length,
    activeBases: 0,
    completedTransactions: 0,
  });
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
  const isDowVerified = currentAccount?.isDowVerified ?? false;

  // Persist session to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (activeAccountId && currentAccount) {
        localStorage.setItem("activeAccountId", activeAccountId);
        localStorage.setItem("activeAccount", JSON.stringify(currentAccount));
      } else {
        localStorage.removeItem("activeAccountId");
        localStorage.removeItem("activeAccount");
      }
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }, [activeAccountId, currentAccount]);

  // Fetch bases from the database on mount
  useEffect(() => {
    const fetchBases = async () => {
      try {
        const response = await fetch("/api/bases");

        if (!response.ok) {
          const text = await response.text();
          console.error(
            `Failed to fetch bases: HTTP ${response.status}`,
            text.substring(0, 200),
          );
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error(
            "Invalid content type:",
            contentType,
            "Response:",
            text.substring(0, 200),
          );
          throw new Error("Invalid content type");
        }

        const basesData = await response.json();
        if (Array.isArray(basesData) && basesData.length > 0) {
          setBases(basesData);
        } else {
          console.warn("No bases returned from API:", basesData);
          throw new Error("No bases returned from API");
        }
      } catch (error) {
        console.error("Failed to fetch bases from database:", error);
        // Don't throw - app should continue loading even if bases fetch fails
      }
    };
    fetchBases();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      setUser(
        buildUserProfileFromAccount(
          currentAccount,
          memberDiscipline[currentAccount.id],
        ),
      );
      if (currentAccount.baseId !== currentBaseId) {
        setCurrentBaseIdState(currentAccount.baseId);
      }
    } else if (!isAuthenticated) {
      const disciplineRecord = memberDiscipline[CURRENT_USER.id];
      setUser({
        ...CURRENT_USER,
        currentBaseId: CURRENT_USER.currentBaseId,
        status: disciplineRecord?.suspendedAt ? "suspended" : "active",
        strikes: disciplineRecord?.strikes ?? 0,
      });
      if (currentBaseId !== CURRENT_USER.currentBaseId) {
        setCurrentBaseIdState(CURRENT_USER.currentBaseId);
      }
    }
  }, [currentAccount, currentBaseId, isAuthenticated, memberDiscipline]);

  useEffect(() => {
    const verifiedMembers = accounts.filter(
      (account) => account.isDowVerified,
    ).length;
    const activeBases =
      new Set(accounts.map((account) => account.baseId)).size || bases.length;
    const completedTransactions = transactions.length;
    setAnalyticsCounters({
      verifiedMembers,
      activeBases,
      completedTransactions,
    });
  }, [accounts, transactions, bases]);

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

  const getMemberProfile = useCallback(
    (id: string): UserProfile | null => {
      if (id === user.id) {
        return user;
      }

      // Guests cannot view other members' profiles
      if (!isAuthenticated) {
        return null;
      }

      const accountMatch = accounts.find((account) => account.id === id);
      if (!accountMatch) {
        return null;
      }

      return buildUserProfileFromAccount(
        accountMatch,
        memberDiscipline[accountMatch.id],
      );
    },
    [accounts, isAuthenticated, memberDiscipline, user],
  );

  const addNotice = useCallback(
    (payload: AddNoticePayload): AccountNotice => {
      const severity = payload.severity ?? "info";
      const notice: AccountNotice = {
        id: `notice-${crypto.randomUUID()}`,
        userId: payload.userId,
        category: payload.category,
        severity,
        title: payload.title,
        message: payload.message,
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotices((prev) => [notice, ...prev]);

      if (payload.userId === user.id || payload.userId === "all") {
        const description = payload.message;
        switch (severity) {
          case "success":
            toast.success(payload.title, { description });
            break;
          case "warning":
            toast.warning(payload.title, { description });
            break;
          case "danger":
            toast.error(payload.title, { description });
            break;
          default:
            toast.info(payload.title, { description });
        }
      }

      return notice;
    },
    [user.id],
  );

  const markNoticeRead = useCallback((noticeId: string) => {
    setNotices((prev) =>
      prev.map((notice) =>
        notice.id === noticeId ? { ...notice, read: true } : notice,
      ),
    );
  }, []);

  const markAllNoticesRead = useCallback(() => {
    setNotices((prev) => prev.map((notice) => ({ ...notice, read: true })));
  }, []);

  const suspendMember = useCallback(
    (memberId: string, reason: string) => {
      void adminApi
        .updateUser(memberId, { status: "suspended", reason })
        .catch(() => {
          /* noop */
        });
      setMemberDiscipline((prev) => {
        const existing = prev[memberId] ?? { strikes: 0 };
        if (existing.suspendedAt) {
          return prev;
        }
        return {
          ...prev,
          [memberId]: {
            ...existing,
            suspendedAt: new Date().toISOString(),
            reason,
          },
        };
      });

      addNotice({
        userId: memberId,
        category: "strike",
        severity: "danger",
        title: "Account suspended",
        message: reason,
      });

      toast.error("Member suspended", {
        description: reason,
      });
    },
    [addNotice],
  );

  const reinstateMember = useCallback(
    (memberId: string) => {
      void adminApi.updateUser(memberId, { status: "active" }).catch(() => {
        /* noop */
      });
      setMemberDiscipline((prev) => {
        const existing = prev[memberId];
        if (!existing) {
          return prev;
        }
        return {
          ...prev,
          [memberId]: {
            strikes: existing.strikes,
            reason: undefined,
            suspendedAt: null,
          },
        };
      });

      addNotice({
        userId: memberId,
        category: "system",
        severity: "success",
        title: "Account reinstated",
        message: "Moderator lifted your suspension. Welcome back!",
      });

      toast.success("Member reinstated", {
        description: "Suspension lifted successfully.",
      });
    },
    [addNotice],
  );

  const issueStrike = useCallback(
    (memberId: string, reason: string) => {
      let shouldSuspend = false;
      setMemberDiscipline((prev) => {
        const existing = prev[memberId] ?? { strikes: 0, suspendedAt: null };
        const strikes = existing.strikes + 1;
        if (strikes >= 3 && !existing.suspendedAt) {
          shouldSuspend = true;
        }
        return {
          ...prev,
          [memberId]: {
            ...existing,
            strikes,
            reason,
          },
        };
      });

      addNotice({
        userId: memberId,
        category: "strike",
        severity: "warning",
        title: "Conduct strike issued",
        message: reason,
      });

      toast.warning("Strike recorded", {
        description: reason,
      });

      if (shouldSuspend) {
        suspendMember(memberId, "Automatic suspension after three strikes.");
      }
    },
    [addNotice, suspendMember],
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

  const registerNewAccount = useCallback(
    (
      id: string,
      username: string,
      email: string,
      password: string,
      baseId: string,
    ) => {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim().toLowerCase();

      const isDow = isDowEmail(trimmedEmail);
      const newAccount: BaseListAccount = {
        id,
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        isDowVerified: false,
        baseId,
        createdAt: new Date().toISOString(),
        avatarUrl: buildAvatarUrl(trimmedUsername),
        verificationToken: isDow ? `verify-${crypto.randomUUID()}` : null,
        verificationRequestedAt: isDow ? new Date().toISOString() : null,
        rememberDeviceUntil: undefined,
        role: "member",
      };

      setAccounts((prev) => [newAccount, ...prev]);
      return newAccount;
    },
    [],
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

      if (!isDowEmail(trimmedEmail)) {
        throw new Error(
          "A verified DoW email (.mil or approved DoW domain) is required.",
        );
      }

      if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
        throw new Error("Passwords must be at least 12 characters long.");
      }

      ensureUniqueAccount(trimmedUsername, trimmedEmail);

      return registerNewAccount(
        `acct-${crypto.randomUUID()}`,
        username,
        email,
        password,
        baseId,
      );
    },
    [ensureUniqueAccount, registerNewAccount],
  );

  const activateAccount = useCallback(
    (
      accountId: string,
      options?: SignInOptions,
      overrideAccount?: BaseListAccount,
    ) => {
      const existing =
        overrideAccount || accounts.find((item) => item.id === accountId);
      if (!existing) {
        throw new Error("Account no longer exists.");
      }

      const rememberUntil = options?.rememberDevice
        ? new Date(
            Date.now() + REMEMBER_DEVICE_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
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
        buildUserProfileFromAccount(
          {
            ...existing,
            lastLoginAt,
            rememberDeviceUntil: rememberUntil,
          },
          memberDiscipline[accountId],
        ),
      );
    },
    [accounts, memberDiscipline],
  );

  const signInWithPassword = useCallback(
    async (identifier: string, password: string, options?: SignInOptions) => {
      const normalized = identifier.trim().toLowerCase();
      let account = accounts.find((candidate) => {
        return (
          candidate.username.toLowerCase() === normalized ||
          candidate.email.toLowerCase() === normalized
        );
      });

      // If not found locally, check backend
      if (!account) {
        try {
          const res = await fetch("/.netlify/functions/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalized, password }),
          });
          if (!res.ok)
            throw new Error((await res.json()).error || "Login failed");
          const data = await res.json();
          const username =
            data.username || (normalized.includes("@") ? "" : normalized);
          const email =
            data.email || (normalized.includes("@") ? normalized : "");
          const newAccount: BaseListAccount = {
            id: data.userId,
            username,
            email,
            password,
            isDowVerified: data.verified ?? true,
            baseId: data.baseId || "",
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            rememberDeviceUntil: undefined,
            avatarUrl: data.avatarUrl || buildAvatarUrl(username || normalized),
            verificationToken: null,
            verificationRequestedAt: null,
            role: data.role || "member",
          };
          setAccounts((prev) => [newAccount, ...prev]);
          account = newAccount;
        } catch (e) {
          throw e instanceof Error ? e : new Error("Login failed");
        }
      }

      if (!account || account.password !== password) {
        throw new Error("Incorrect password. Try again.");
      }

      // For DoW emails, check verification status against backend
      if (isDowEmail(account.email) && !account.isDowVerified) {
        // If account wasn't marked as verified locally, check backend verification status
        // This handles newly created accounts that may have been verified via email
        try {
          const verifyCheckResponse = await fetch(
            `/.netlify/functions/verify-status/status?email=${encodeURIComponent(account.email)}`,
          );

          if (verifyCheckResponse.ok) {
            const verifyData = await verifyCheckResponse.json();
            if (verifyData.status === "verified") {
              // Backend confirms verification - mark as verified locally
              setAccounts((prev) =>
                prev.map((item) =>
                  item.id === account.id
                    ? { ...item, isDowVerified: true }
                    : item,
                ),
              );
              // Update account object for this sign-in flow
              account = { ...account, isDowVerified: true };
            } else {
              throw new Error(
                "Confirm your DoW email from the link we sent before signing in.",
              );
            }
          } else {
            throw new Error(
              "Confirm your DoW email from the link we sent before signing in.",
            );
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Confirm your DoW email")
          ) {
            throw error;
          }
          throw new Error(
            "Confirm your DoW email from the link we sent before signing in.",
          );
        }
      }

      activateAccount(account.id, options, account);
      toast.success("Welcome back", {
        description: options?.rememberDevice
          ? "You’re signed in. We’ll remember this device for 30 days."
          : "You’re signed in. We’ll keep you active for this session.",
      });
    },
    [accounts, activateAccount, setAccounts],
  );

  const cancelPasswordReset = useCallback(() => {
    setPendingPasswordReset(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const response = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        return null;
      }

      const data = await response.json();
      if (data.token) {
        setPendingPasswordReset({
          token: data.token,
          accountId: "",
          expiresAt: data.expiresAt,
        });
        return data.token;
      }

      return null;
    } catch (error) {
      console.error("Password reset request failed:", error);
      return null;
    }
  }, []);

  const completePasswordReset = useCallback(
    async (token: string, newPassword: string) => {
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

      try {
        const response = await fetch("/api/auth/reset-password/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to reset password");
        }

        setPendingPasswordReset(null);
        toast.success("Password updated", {
          description: "Use your new password to sign in.",
        });
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("Failed to reset password");
      }
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
        if (!isDowEmail(currentAccount.email)) {
          toast.info("Add a DoW-issued email to verify automatically.");
          return;
        }

        if (currentAccount.isDowVerified) {
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
        "Upload a redacted DoW ID from Profile → Verify. We delete uploads within 24h.",
      );
    },
    [currentAccount],
  );

  const completeDowVerification = useCallback(
    (accountId: string) => {
      void adminApi.updateUser(accountId, { verify: true }).catch(() => {
        /* noop */
      });
      const account = accounts.find((item) => item.id === accountId);
      if (!account) {
        throw new Error("Account not found for verification.");
      }

      if (!isDowEmail(account.email)) {
        throw new Error(
          "DoW email verification is only available for DoW addresses.",
        );
      }

      if (account.isDowVerified) {
        return;
      }

      const completedAt = new Date().toISOString();

      setAccounts((prev) =>
        prev.map((item) =>
          item.id === accountId
            ? {
                ...item,
                isDowVerified: true,
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

      toast.success("DoW email verified", {
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

  const updateUserAvatar = useCallback(
    (avatarUrl: string) => {
      if (!activeAccountId) {
        return;
      }
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === activeAccountId ? { ...account, avatarUrl } : account,
        ),
      );
    },
    [activeAccountId],
  );

  const addListing = useCallback(
    (listing: Listing) => {
      if (!isAuthenticated) {
        throw new Error("Sign in to post a listing.");
      }
      if (!isDowVerified) {
        throw new Error("Verify DoW access before posting.");
      }

      setListings((prev) => {
        const next = [listing, ...prev];
        next.sort(
          (a, b) =>
            new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
        );
        return next;
      });
    },
    [isAuthenticated, isDowVerified],
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

  // Stage 1: Mark transaction as complete (first party initiates)
  const markTransactionComplete = useCallback(
    (threadId: string, userId: string) => {
      const userName = resolveDisplayName(userId);
      const now = new Date().toISOString();

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const transaction = thread.transaction || {
            id: `txn-${crypto.randomUUID()}`,
            status: "pending_complete" as const,
            ratingByUser: {},
            confirmedBy: [],
          };

          // Don't allow marking complete if already completed or disputed
          if (
            transaction.status === "completed" ||
            transaction.status === "disputed"
          ) {
            return thread;
          }

          // Already pending, just confirm instead
          if (
            transaction.status === "pending_complete" &&
            transaction.markedCompleteBy &&
            transaction.markedCompleteBy !== userId
          ) {
            const confirmedSet = new Set(transaction.confirmedBy);
            confirmedSet.add(userId);
            const allConfirmed = thread.participants.every((p) =>
              confirmedSet.has(p),
            );

            if (allConfirmed) {
              transaction.status = "completed";
              transaction.completedAt = now;
              transaction.confirmedBy = Array.from(confirmedSet);

              return {
                ...thread,
                transaction,
                status: "completed",
                messages: [
                  ...thread.messages,
                  {
                    id: `msg-${crypto.randomUUID()}`,
                    authorId: "system",
                    body: "Transaction completed! Both parties confirmed. Ratings unlocked.",
                    sentAt: now,
                    type: "system",
                  },
                ],
              };
            }

            transaction.confirmedBy = Array.from(confirmedSet);
            return {
              ...thread,
              transaction,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${crypto.randomUUID()}`,
                  authorId: "system",
                  body: `${userName} confirmed completion. Transaction will auto-close in 72 hours if undisputed.`,
                  sentAt: now,
                  type: "system",
                },
              ],
            };
          }

          // First mark as complete
          transaction.status = "pending_complete";
          transaction.markedCompleteBy = userId;
          transaction.markedCompleteAt = now;

          return {
            ...thread,
            transaction,
            messages: [
              ...thread.messages,
              {
                id: `msg-${crypto.randomUUID()}`,
                authorId: "system",
                body: `${userName} marked this transaction as complete. Waiting for the other party to confirm.`,
                sentAt: now,
                type: "system",
              },
            ],
          };
        }),
      );

      toast.info("Marked as complete", {
        description: "Waiting for the other party to confirm.",
      });
    },
    [resolveDisplayName],
  );

  // Stage 2: Confirm completion (second party responds)
  const confirmTransactionCompletion = useCallback(
    (threadId: string, userId: string) => {
      const userName = resolveDisplayName(userId);
      const now = new Date().toISOString();
      let completionContext: {
        threadId: string;
        listingId: string;
        buyerId: string;
        sellerId: string;
        price: number | null;
        completedAt: string;
      } | null = null;

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const transaction = thread.transaction;
          if (
            !transaction ||
            transaction.status === "completed" ||
            transaction.status === "disputed"
          ) {
            return thread;
          }

          if (transaction.status !== "pending_complete") {
            return thread;
          }

          const listing = listings.find((item) => item.id === thread.listingId);
          const confirmedSet = new Set(transaction.confirmedBy);
          confirmedSet.add(userId);
          transaction.confirmedBy = Array.from(confirmedSet);

          const allConfirmed = thread.participants.every((p) =>
            confirmedSet.has(p),
          );

          if (allConfirmed) {
            transaction.status = "completed";
            transaction.completedAt = now;

            if (listing) {
              const sellerId = listing.sellerId;
              const buyerId =
                thread.participants.find((p) => p !== sellerId) ?? userId;
              completionContext = {
                threadId: thread.id,
                listingId: listing.id,
                buyerId,
                sellerId,
                price: listing.isFree ? 0 : listing.price,
                completedAt: now,
              };
            }

            return {
              ...thread,
              transaction,
              status: "completed",
              messages: [
                ...thread.messages,
                {
                  id: `msg-${crypto.randomUUID()}`,
                  authorId: "system",
                  body: `${userName} confirmed completion. Transaction complete! Ratings unlocked.`,
                  sentAt: now,
                  type: "system",
                },
              ],
            };
          }

          return thread;
        }),
      );

      if (completionContext) {
        markListingSold(completionContext.listingId);

        setMessageThreads((prev) =>
          prev.map((thread) => {
            if (
              thread.id === completionContext!.threadId ||
              thread.listingId !== completionContext!.listingId
            ) {
              return thread;
            }

            const now = new Date().toISOString();
            const soldByName = resolveDisplayName(completionContext!.buyerId);

            return {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${crypto.randomUUID()}`,
                  authorId: "system",
                  body: `This item has been sold to ${soldByName}. It's no longer available.`,
                  sentAt: now,
                  type: "system",
                },
              ],
            };
          }),
        );

        setTransactions((prev) => {
          if (
            prev.some((entry) => entry.threadId === completionContext!.threadId)
          ) {
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

        toast.success("Transaction completed!", {
          description: "Both parties confirmed. Ratings unlocked.",
        });
      }
    },
    [listings, markListingSold, resolveDisplayName],
  );

  // Raise or clear dispute
  const raiseDispute = useCallback(
    (threadId: string, userId: string, reason?: string) => {
      const now = new Date().toISOString();
      const userName = resolveDisplayName(userId);

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const transaction = thread.transaction;
          if (!transaction) {
            return thread;
          }

          transaction.status = "disputed";
          transaction.dispute = {
            raisedBy: userId,
            reason,
            raisedAt: now,
          };

          return {
            ...thread,
            status: "disputed",
            transaction,
            messages: [
              ...thread.messages,
              {
                id: `msg-${crypto.randomUUID()}`,
                authorId: "system",
                body: `${userName} disputed this transaction. Moderators will review.${reason ? ` Reason: ${reason}` : ""}`,
                sentAt: now,
                type: "system",
              },
            ],
          };
        }),
      );

      toast.info("Dispute raised", {
        description: "Moderators will review this transaction.",
      });
    },
    [resolveDisplayName],
  );

  // Resolve dispute (used by moderators or when auto-resolved after review)
  const resolveDispute = useCallback(
    (threadId: string, resolveTo: "pending_complete" | "completed") => {
      const now = new Date().toISOString();

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const transaction = thread.transaction;
          if (!transaction || transaction.status !== "disputed") {
            return thread;
          }

          const wasPendingComplete = resolveTo === "pending_complete";
          transaction.status = resolveTo;
          if (resolveTo === "completed") {
            transaction.completedAt = now;
          }
          transaction.dispute = undefined;

          return {
            ...thread,
            status: resolveTo === "completed" ? "completed" : thread.status,
            transaction,
            messages: [
              ...thread.messages,
              {
                id: `msg-${crypto.randomUUID()}`,
                authorId: "system",
                body: wasPendingComplete
                  ? "Dispute resolved. Transaction back to pending completion."
                  : "Dispute resolved. Transaction marked complete.",
                sentAt: now,
                type: "system",
              },
            ],
          };
        }),
      );

      toast.info("Dispute resolved", {
        description: "Transaction status updated.",
      });
    },
    [],
  );

  // Auto-complete after 72 hours if not disputed
  const autoCompleteTransaction = useCallback(
    (threadId: string) => {
      const now = new Date().toISOString();
      let completionContext: {
        threadId: string;
        listingId: string;
        buyerId: string;
        sellerId: string;
        price: number | null;
        completedAt: string;
      } | null = null;

      setMessageThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) {
            return thread;
          }

          const transaction = thread.transaction;
          if (!transaction || transaction.status !== "pending_complete") {
            return thread;
          }

          const listing = listings.find((item) => item.id === thread.listingId);

          transaction.status = "completed";
          transaction.completedAt = now;
          transaction.autoCompletedAt = now;

          if (listing) {
            const sellerId = listing.sellerId;
            const buyerId = thread.participants.find((p) => p !== sellerId);
            if (buyerId) {
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
            status: "completed",
            messages: [
              ...thread.messages,
              {
                id: `msg-${crypto.randomUUID()}`,
                authorId: "system",
                body: "Auto-confirmed after 72 hours. Transaction complete. Ratings unlocked.",
                sentAt: now,
                type: "system",
              },
            ],
          };
        }),
      );

      if (completionContext) {
        markListingSold(completionContext.listingId);

        setMessageThreads((prev) =>
          prev.map((thread) => {
            if (
              thread.id === completionContext!.threadId ||
              thread.listingId !== completionContext!.listingId
            ) {
              return thread;
            }

            const now = new Date().toISOString();
            const soldByName = resolveDisplayName(completionContext!.buyerId);

            return {
              ...thread,
              messages: [
                ...thread.messages,
                {
                  id: `msg-${crypto.randomUUID()}`,
                  authorId: "system",
                  body: `This item has been sold to ${soldByName}. It's no longer available.`,
                  sentAt: now,
                  type: "system",
                },
              ],
            };
          }),
        );

        setTransactions((prev) => {
          if (
            prev.some((entry) => entry.threadId === completionContext!.threadId)
          ) {
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
      }
    },
    [listings, markListingSold, resolveDisplayName],
  );

  // Keep initiateTransaction for backward compatibility with MyListings page
  const initiateTransaction = useCallback(
    (threadId: string, userId: string) => {
      markTransactionComplete(threadId, userId);
    },
    [markTransactionComplete],
  );

  const removeListing = useCallback((listingId: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== listingId));
  }, []);

  const addSponsorPlacement = useCallback((placement: SponsorPlacement) => {
    setSponsorPlacements((prev) => {
      const existing = prev.find((item) => item.id === placement.id);
      if (existing) {
        return prev.map((item) =>
          item.id === placement.id ? { ...item, ...placement } : item,
        );
      }
      return [placement, ...prev];
    });
  }, []);

  const updateSponsorPlacement = useCallback(
    (placementId: string, updates: Partial<Omit<SponsorPlacement, "id">>) => {
      setSponsorPlacements((prev) =>
        prev.map((placement) =>
          placement.id === placementId
            ? { ...placement, ...updates }
            : placement,
        ),
      );
    },
    [],
  );

  const removeSponsorPlacement = useCallback((placementId: string) => {
    setSponsorPlacements((prev) =>
      prev.filter((placement) => placement.id !== placementId),
    );
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
      if (!isDowVerified) {
        throw new Error("Verify DoW access before messaging sellers.");
      }

      const trimmedMessage = messageBody.trim();
      if (!trimmedMessage) {
        throw new Error("Message body cannot be empty");
      }

      const normalizedMessage = trimmedMessage.toLowerCase();
      const shouldInitiateTransaction =
        normalizedMessage === "offer accepted" ||
        normalizedMessage === "mark sold";

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
            archivedBy:
              existingThread.archivedBy?.filter((id) => id !== user.id) ?? [],
            deletedBy:
              existingThread.deletedBy?.filter((id) => id !== user.id) ?? [],
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
      isDowVerified,
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
          if (
            !thread ||
            !thread.transaction ||
            thread.transaction.status !== "completed"
          ) {
            return prev;
          }
          const listing = listings.find((item) => item.id === thread.listingId);
          if (!listing) {
            return prev;
          }
          const sellerId = listing.sellerId;
          const buyerId =
            thread.participants.find(
              (participantId) => participantId !== sellerId,
            ) ?? user.id;

          return [
            {
              id: thread.id,
              threadId: thread.id,
              listingId: listing.id,
              buyerId,
              sellerId,
              price: listing.isFree ? 0 : listing.price,
              completedAt:
                thread.transaction.completedAt ?? new Date().toISOString(),
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
        totalsMap.set(id, {
          sellerTotal: 0,
          sellerCount: 0,
          buyerTotal: 0,
          buyerCount: 0,
        });
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
        sellerAverage: value.sellerCount
          ? value.sellerTotal / value.sellerCount
          : null,
        sellerCount: value.sellerCount,
        buyerAverage: value.buyerCount
          ? value.buyerTotal / value.buyerCount
          : null,
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
      bases.find((base) => base.id === currentBaseId) ??
      bases.find((base) => base.id === CURRENT_USER.currentBaseId) ??
      bases[0]
    );
  }, [currentBaseId, bases]);

  const contextValue = useMemo<BaseListContextValue>(
    () => ({
      bases,
      currentBaseId,
      currentBase,
      setCurrentBaseId,
      searchQuery,
      setSearchQuery,
      clearSearch,
      user,
      isAuthenticated,
      isDowVerified,
      isModerator: user.role !== "member",
      accounts,
      currentAccount,
      memberDiscipline,
      notices,
      addNotice,
      markNoticeRead,
      markAllNoticesRead,
      suspendMember,
      reinstateMember,
      issueStrike,
      createAccount,
      registerNewAccount,
      activateAccount,
      signInWithPassword,
      requestPasswordReset,
      completePasswordReset,
      cancelPasswordReset,
      beginVerification,
      completeDowVerification,
      signOut,
      updateUserAvatar,
      listings,
      addListing,
      markListingSold,
      removeListing,
      sponsorPlacements,
      addSponsorPlacement,
      updateSponsorPlacement,
      removeSponsorPlacement,
      messageThreads,
      sendMessageToSeller,
      initiateTransaction,
      markTransactionComplete,
      confirmTransactionCompletion,
      raiseDispute,
      resolveDispute,
      autoCompleteTransaction,
      submitTransactionRating,
      archiveThread,
      unarchiveThread,
      deleteThread,
      markThreadAsRead,
      unreadMessageCount,
      transactions,
      getUserRatingSummary,
      getMemberName: resolveDisplayName,
      getMemberProfile,
      pendingPasswordReset,
      analytics: analyticsCounters,
    }),
    [
      accounts,
      activateAccount,
      addListing,
      addNotice,
      archiveThread,
      cancelPasswordReset,
      clearSearch,
      completePasswordReset,
      createAccount,
      registerNewAccount,
      currentAccount,
      currentBase,
      currentBaseId,
      deleteThread,
      getUserRatingSummary,
      initiateTransaction,
      markTransactionComplete,
      confirmTransactionCompletion,
      raiseDispute,
      resolveDispute,
      autoCompleteTransaction,
      isAuthenticated,
      isDowVerified,
      issueStrike,
      listings,
      markListingSold,
      completeDowVerification,
      beginVerification,
      markNoticeRead,
      markAllNoticesRead,
      markThreadAsRead,
      memberDiscipline,
      messageThreads,
      notices,
      pendingPasswordReset,
      reinstateMember,
      removeListing,
      sponsorPlacements,
      addSponsorPlacement,
      updateSponsorPlacement,
      removeSponsorPlacement,
      requestPasswordReset,
      searchQuery,
      sendMessageToSeller,
      setCurrentBaseId,
      signInWithPassword,
      signOut,
      updateUserAvatar,
      submitTransactionRating,
      suspendMember,
      transactions,
      unarchiveThread,
      unreadMessageCount,
      user,
      resolveDisplayName,
      getMemberProfile,
      analyticsCounters,
    ],
  );

  // Auto-complete transactions after 72 hours
  useEffect(() => {
    const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
    const timers: NodeJS.Timeout[] = [];

    messageThreads.forEach((thread) => {
      const transaction = thread.transaction;
      if (
        transaction?.status === "pending_complete" &&
        transaction.markedCompleteAt &&
        !transaction.autoCompletedAt
      ) {
        const markedTime = new Date(transaction.markedCompleteAt).getTime();
        const now = Date.now();
        const elapsedTime = now - markedTime;

        if (elapsedTime >= SEVENTY_TWO_HOURS_MS) {
          // Auto-complete immediately if already past 72 hours
          autoCompleteTransaction(thread.id);
        } else {
          // Set a timer for when the 72 hours will be up
          const timeUntilCompletion = SEVENTY_TWO_HOURS_MS - elapsedTime;
          const timer = setTimeout(() => {
            autoCompleteTransaction(thread.id);
          }, timeUntilCompletion);
          timers.push(timer);
        }
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [messageThreads, autoCompleteTransaction]);

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

export { EMAIL_PATTERN, PASSWORD_MIN_LENGTH, isDowEmail };
export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
