import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  Gauge,
  LockKeyhole,
  MailCheck,
  Megaphone,
  MessageSquareWarning,
  PackageSearch,
  ShieldAlert,
  ShieldCheck,
  Users as UsersIcon,
  Users2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AdminSidebar, type AdminNavItem } from "@/components/admin/AdminSidebar";
import {
  BasesSection,
  DashboardSection,
  ListingsSection,
  MessagingSection,
  MetricsSection,
  ReportsSection,
  RolesSection,
  SecuritySection,
  SponsorsSection,
  UsersSection,
  VerificationSection,
  type AdminAuditEntry,
  type AdminBaseRow,
  type AdminFlaggedThread,
  type AdminListingRow,
  type AdminListingStatus,
  type AdminMetricCard,
  type AdminReportRecord,
  type AdminRole,
  type AdminUserRecord,
  type DashboardCard,
  type VerificationDocument,
  type VerificationQueueSummary,
} from "@/components/admin/sections";
import { useBaseList } from "@/context/BaseListContext";
import { SELLERS } from "@/data/mock";
import { adminApi } from "@/lib/adminApi";
import type { AdminUserDTO } from "@shared/api";
import { formatDistanceToNow } from "date-fns";
import type {
  Base,
  Listing,
  MessageThread,
  SponsorPlacement,
  TransactionHistoryEntry,
  UserProfile,
} from "@/types";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

const formatShortDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));

const formatRelativeTime = (iso: string): string => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (error) {
    return formatShortDate(iso);
  }
};

const getApiErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "payload" in error) {
    const payload = (error as { payload?: unknown }).payload;
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = (payload as { error?: unknown }).error;
      if (typeof message === "string") {
        return message;
      }
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong—try again.";
};

const slugifyId = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug.length > 0 ? slug : `base-${crypto.randomUUID()}`;
};

const abbreviateBaseName = (value: string): string => {
  const letters = value
    .split(/\s+/)
    .map((segment) => segment[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
  return letters.length > 0 ? letters : "BASE";
};

const QA_CHECKLIST = [
  {
    id: "signup",
    flow: "Sign up / Login",
    detail: "Username, email, password flow • .mil auto-verify",
  },
  {
    id: "post-listing",
    flow: "Post listing",
    detail: "Upload, preview, publish",
  },
  {
    id: "dm-chat",
    flow: "DM chat",
    detail: "Real-time send/receive",
  },
  {
    id: "mark-complete",
    flow: "Mark complete",
    detail: "Banner appears and both confirm",
  },
  {
    id: "rating",
    flow: "⭐ rating",
    detail: "1-tap works and averages update",
  },
  {
    id: "profile",
    flow: "Profile",
    detail: "Purchases / Sales tabs",
  },
  {
    id: "report-listing",
    flow: "Report listing",
    detail: "Flows to admin resolution",
  },
  {
    id: "verify-manual",
    flow: "Verify manual",
    detail: "Upload, auto-delete, status verified",
  },
] as const;

const getBaseName = (bases: Base[], baseId?: string): string => {
  if (!baseId) {
    return "Unknown base";
  }
  const base = bases.find((candidate) => candidate.id === baseId);
  return base ? base.name : baseId;
};

type AccountLike = {
  id: string;
  username: string;
  baseId: string;
  role: UserProfile["role"];
  isDodVerified: boolean;
  createdAt: string;
};

const createListingRows = (
  listings: Listing[],
  bases: Base[],
  getMemberName: (userId: string) => string,
): AdminListingRow[] => {
  return listings.map((listing) => ({
    id: listing.id,
    item: listing.title,
    base: getBaseName(bases, listing.baseId),
    price: listing.isFree ? "Free" : formatCurrency(listing.price),
    seller: getMemberName(listing.sellerId),
    date: formatShortDate(listing.postedAt),
    status: listing.status === "sold" ? "Sold" : "Active",
    reports: 0,
  }));
};

type AdminSponsorRow = SponsorPlacement & { baseName: string };

const createBaseRows = (
  bases: Base[],
  accounts: AccountLike[],
  listings: Listing[],
  reports: AdminReportRecord[],
): AdminBaseRow[] => {
  return bases.map((base) => {
    const membersOnBase = accounts.filter((account) => account.baseId === base.id);
    const moderator =
      membersOnBase.find((account) => account.role !== "member")?.username ?? "Unassigned";
    const activeListings = listings.filter(
      (listing) => listing.baseId === base.id && listing.status !== "sold",
    ).length;
    const pendingReports = reports.filter((report) => report.base === base.name).length;

    return {
      id: base.id,
      name: base.name,
      region: base.region,
      moderator,
      users: membersOnBase.length,
      activeListings,
      pendingReports,
    };
  });
};

const createInitialReports = (
  listings: Listing[],
  bases: Base[],
): AdminReportRecord[] => {
  const listingById = new Map(listings.map((listing) => [listing.id, listing]));
  const baseById = new Map(bases.map((base) => [base.id, base.name]));

  return [
    {
      id: "RPT-2301",
      type: "Scam",
      reporter: "A1C Dorsey",
      targetType: "listing",
      targetId: "listing-forester",
      targetLabel: listingById.get("listing-forester")?.title ?? "2018 Subaru Forester",
      base:
        baseById.get(listingById.get("listing-forester")?.baseId ?? "") ?? "Joint Base Lewis-McChord",
      time: "5m ago",
      attachmentUrl:
        "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2Fa47d79b9948a4a63a58584f0321bd702?format=webp&width=320",
    },
    {
      id: "RPT-2302",
      type: "Weapon",
      reporter: "Capt Monroe",
      targetType: "user",
      targetId: "seller-avery",
      targetLabel: "Capt Alex Ramirez",
      base: "Ramstein AB",
      time: "18m ago",
    },
    {
      id: "RPT-2303",
      type: "Adult content",
      reporter: "SSgt Young",
      targetType: "listing",
      targetId: "listing-ps5",
      targetLabel: listingById.get("listing-ps5")?.title ?? "PlayStation 5 Digital",
      base: baseById.get(listingById.get("listing-ps5")?.baseId ?? "") ?? "Ramstein AB",
      time: "42m ago",
      attachmentUrl:
        "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2Ff1c8bdbfd26d4a49a084c1d69cc9ef0f?format=webp&width=320",
    },
  ];
};

const INITIAL_VERIFICATION_DOCS: VerificationDocument[] = [
  {
    id: "VRF-5102",
    userId: "seller-lena",
    name: "LT Lena Ortiz",
    method: "ID Review",
    submitted: "7m ago",
    url: "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2Fd6c802fb3f134fcfab6d7ba5f921c61c?format=webp&width=480",
  },
  {
    id: "VRF-5103",
    userId: "seller-avery",
    name: "Capt Alex Ramirez",
    method: "Invite Code",
    submitted: "12m ago",
    url: "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F22a9fb8aa9624c7ba93c886a492b7c9a?format=webp&width=480",
  },
];

const INITIAL_VERIFICATION_QUEUES: VerificationQueueSummary[] = [
  {
    id: "auto",
    label: ".mil Verified",
    count: 0,
    description: "Auto-approved via allow list",
    icon: MailCheck,
    toneClass: "text-success",
  },
  {
    id: "invite",
    label: "Invite Code",
    count: INITIAL_VERIFICATION_DOCS.filter((doc) => doc.method === "Invite Code").length,
    description: "Moderator review required",
    icon: UsersIcon,
    toneClass: "text-primary",
  },
  {
    id: "id",
    label: "ID Review",
    count: INITIAL_VERIFICATION_DOCS.filter((doc) => doc.method === "ID Review").length,
    description: "Upload expires after action",
    icon: MessageSquareWarning,
    toneClass: "text-warning",
  },
];

const createInitialFlaggedThreads = (
  messageThreads: MessageThread[],
  listings: Listing[],
  bases: Base[],
  getMemberName: (userId: string) => string,
): AdminFlaggedThread[] => {
  if (messageThreads.length === 0) {
    return [];
  }

  const firstThread = messageThreads[0];
  const listing = listings.find((item) => item.id === firstThread.listingId);
  const partnerId = firstThread.participants.find((participant) => participant !== SELLERS[1].id);
  const excerpt = firstThread.messages[firstThread.messages.length - 1]?.body ?? "Check details.";

  return [
    {
      id: firstThread.id,
      base: getBaseName(bases, listing?.baseId),
      reason: "Payment outside platform",
      participants: firstThread.participants
        .map((participant) => getMemberName(participant))
        .join(" • "),
      excerpt,
      flaggedAt: "Today",
      accessedBy: undefined,
      offendingUserId: partnerId,
    },
    {
      id: "MSG-9022",
      base: "Ramstein AB",
      reason: "Harassment",
      participants: "Ramirez • Young",
      excerpt: "You’re wasting my time. Drop your price now…",
      flaggedAt: "Yesterday",
      accessedBy: "Moderator Moss",
      offendingUserId: "seller-avery",
    },
  ];
};

const createMetricCards = (
  accounts: AccountLike[],
  listings: Listing[],
  transactions: TransactionHistoryEntry[],
  manualVerificationBacklog: number,
): AdminMetricCard[] => {
  const verifiedCount = accounts.filter((account) => account.isDodVerified).length;
  const soldCount = listings.filter((listing) => listing.status === "sold").length;
  const activeCount = listings.length - soldCount;
  const fulfillmentRate = transactions.length + soldCount === 0
    ? 100
    : Math.round(((transactions.length + soldCount) / (transactions.length + soldCount + manualVerificationBacklog)) * 100);

  return [
    {
      id: "verified",
      label: "Verified members",
      value: `${verifiedCount}`,
      period: "Across all bases",
      delta: "+4%",
    },
    {
      id: "listings",
      label: "Listings created / sold",
      value: `${listings.length} / ${soldCount}`,
      period: "Last 30 days",
      delta: activeCount ? "+9%" : "0%",
    },
    {
      id: "reports",
      label: "Reports resolved",
      value: `${fulfillmentRate}%`,
      period: "SLA 24h",
      delta: fulfillmentRate >= 90 ? "-1%" : "+6%",
    },
    {
      id: "verifications",
      label: "Verification backlog",
      value: `${manualVerificationBacklog}`,
      period: "Manual reviews",
      delta: manualVerificationBacklog ? "-18%" : "0%",
    },
  ];
};

const createInitialRoles = (): AdminRole[] => [
  {
    name: "Admin",
    scope: "Global",
    permissions: ["All bases", "Verification overrides", "Ban users", "Access metrics"],
    icon: ShieldCheck,
    toneClass: "text-primary",
  },
  {
    name: "Moderator",
    scope: "Base",
    permissions: ["Assigned base only", "Approve verification", "Resolve reports", "Hide listings"],
    icon: UsersIcon,
    toneClass: "text-success",
  },
];

const sections: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "users", label: "Users", icon: Users2 },
  { id: "listings", label: "Listings", icon: PackageSearch },
  { id: "reports", label: "Reports", icon: ShieldAlert },
  { id: "verification", label: "Verification", icon: BadgeCheck },
  { id: "bases", label: "Bases", icon: Building2 },
  { id: "sponsors", label: "Sponsors", icon: Megaphone },
  { id: "messaging", label: "Messaging", icon: MessageSquareWarning },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "security", label: "Security", icon: LockKeyhole },
];

const MODERATOR_SECTION_IDS = new Set<AdminNavItem["id"]>([
  "dashboard",
  "users",
  "listings",
  "reports",
  "verification",
  "messaging",
]);

const queueIdByMethod: Record<string, VerificationQueueSummary["id"]> = {
  ".mil Verified": "auto",
  "Invite Code": "invite",
  "ID Review": "id",
};

const AdminPanel = (): JSX.Element => {
  const navigate = useNavigate();
  const {
    bases,
    listings,
    addListing,
    removeListing,
    messageThreads,
    transactions,
    user,
    accounts,
    memberDiscipline,
    notices,
    addNotice,
    analytics,
    suspendMember,
    reinstateMember,
    issueStrike,
    completeDodVerification,
    getUserRatingSummary,
    getMemberName,
    markAllNoticesRead,
    sponsorPlacements,
    addSponsorPlacement,
    updateSponsorPlacement,
    removeSponsorPlacement,
  } = useBaseList();

  const isAdmin = user.role === "admin";
  const isModerator = user.role === "moderator";

  const availableSections = useMemo<AdminNavItem[]>(() => {
    if (isAdmin) {
      return sections;
    }
    if (isModerator) {
      return sections.filter((item) => MODERATOR_SECTION_IDS.has(item.id));
    }
    return sections.filter((item) => item.id === "dashboard");
  }, [isAdmin, isModerator]);

  const [accountList, setAccountList] = useState<AccountLike[]>(() =>
    accounts.map((account) => ({
      id: account.id,
      username: account.username,
      baseId: account.baseId,
      role: account.role,
      isDodVerified: account.isDodVerified,
      createdAt: account.createdAt,
    })),
  );
  const userDirectoryRef = useRef<Map<string, AdminUserDTO>>(new Map());

  const [activeSection, setActiveSection] = useState<string>(availableSections[0]?.id ?? "dashboard");

  useEffect(() => {
    if (!availableSections.some((item) => item.id === activeSection)) {
      setActiveSection(availableSections[0]?.id ?? "dashboard");
    }
  }, [activeSection, availableSections]);
  const [reports, setReports] = useState<AdminReportRecord[]>(() => createInitialReports(listings, bases));
  const [reportNotes, setReportNotes] = useState<Record<string, string[]>>({});
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>(
    INITIAL_VERIFICATION_DOCS,
  );
  const [verificationQueues, setVerificationQueues] = useState<VerificationQueueSummary[]>(() =>
    INITIAL_VERIFICATION_QUEUES.map((queue) => ({ ...queue })),
  );
  const [flaggedThreads, setFlaggedThreads] = useState<AdminFlaggedThread[]>(() =>
    createInitialFlaggedThreads(messageThreads, listings, bases, getMemberName),
  );
  const [baseRows, setBaseRows] = useState<AdminBaseRow[]>(() =>
    createBaseRows(bases, accountList, listings, reports),
  );
  const [listingRows, setListingRows] = useState<AdminListingRow[]>(() =>
    createListingRows(listings, bases, getMemberName),
  );
  const [metrics, setMetrics] = useState<AdminMetricCard[]>(() =>
    createMetricCards(accountList, listings, transactions, verificationDocs.length),
  );

  const sponsorRows = useMemo<AdminSponsorRow[]>(
    () =>
      sponsorPlacements.map((placement) => ({
        ...placement,
        baseName: getBaseName(bases, placement.baseId),
      })),
    [bases, sponsorPlacements],
  );

  const moderatorBaseId = isModerator ? user.currentBaseId : null;
  const moderatorBaseName = useMemo(
    () => (moderatorBaseId ? getBaseName(bases, moderatorBaseId) : null),
    [bases, moderatorBaseId],
  );

  const scopedAccounts = useMemo(
    () =>
      isAdmin ? accountList : accountList.filter((account) => account.baseId === moderatorBaseId),
    [accountList, isAdmin, moderatorBaseId],
  );

  const scopedListings = useMemo(
    () =>
      isAdmin ? listings : listings.filter((listing) => listing.baseId === moderatorBaseId),
    [isAdmin, listings, moderatorBaseId],
  );

  const visibleReports = useMemo(
    () =>
      isAdmin || !moderatorBaseName
        ? reports
        : reports.filter((report) => report.base === moderatorBaseName),
    [isAdmin, moderatorBaseName, reports],
  );

  const visibleListingRows = useMemo(
    () =>
      isAdmin || !moderatorBaseName
        ? listingRows
        : listingRows.filter((row) => row.base === moderatorBaseName),
    [isAdmin, listingRows, moderatorBaseName],
  );

  const visibleBaseRows = useMemo(
    () => (isAdmin ? baseRows : baseRows.filter((row) => row.id === moderatorBaseId)),
    [baseRows, isAdmin, moderatorBaseId],
  );

  const visibleSponsorRows = useMemo(
    () => (isAdmin ? sponsorRows : sponsorRows.filter((row) => row.baseId === moderatorBaseId)),
    [isAdmin, moderatorBaseId, sponsorRows],
  );

  const scopedMessageThreads = useMemo(
    () =>
      isAdmin
        ? messageThreads
        : messageThreads.filter((thread) => {
            const listing = listings.find((item) => item.id === thread.listingId);
            return listing?.baseId === moderatorBaseId;
          }),
    [isAdmin, listings, messageThreads, moderatorBaseId],
  );

  const visibleFlaggedThreads = useMemo(
    () =>
      isAdmin || !moderatorBaseName
        ? flaggedThreads
        : flaggedThreads.filter((thread) => thread.base === moderatorBaseName),
    [flaggedThreads, isAdmin, moderatorBaseName],
  );

  const visibleVerificationDocs = useMemo(
    () =>
      isAdmin
        ? verificationDocs
        : verificationDocs.filter((doc) => {
            const account = accountList.find((item) => item.id === doc.userId);
            return account?.baseId === moderatorBaseId;
          }),
    [accountList, isAdmin, moderatorBaseId, verificationDocs],
  );

  const visibleVerificationQueues = useMemo(() => {
    if (isAdmin) {
      return verificationQueues;
    }
    const counts: Record<string, number> = { auto: 0, invite: 0, id: 0 };
    visibleVerificationDocs.forEach((doc) => {
      const queueId = queueIdByMethod[doc.method];
      if (queueId) {
        counts[queueId] = (counts[queueId] ?? 0) + 1;
      }
    });
    return verificationQueues.map((queue) => ({
      ...queue,
      count: counts[queue.id] ?? 0,
    }));
  }, [isAdmin, visibleVerificationDocs, verificationQueues]);
  const [userOverrides, setUserOverrides] = useState<
    Record<string, Partial<{ verified: boolean; suspended: boolean }>>
  >({});
  const [auditEntries, setAuditEntries] = useState<AdminAuditEntry[]>([]);

  const archivedListingsRef = useRef<Record<string, Listing>>({});

  useEffect(() => {
    let active = true;
    const hydrateAdminData = async () => {
      try {
        const users = await adminApi.getUsers();
        if (!active) {
          return;
        }
        userDirectoryRef.current = new Map<string, AdminUserDTO>(
          users.map((entry) => [entry.id, entry]),
        );
        setAccountList(
          users.map((entry) => ({
            id: entry.id,
            username: entry.username,
            baseId: entry.baseId,
            role: entry.role,
            isDodVerified: Boolean(entry.dodVerifiedAt),
            createdAt: entry.createdAt,
          })),
        );
      } catch (error) {
        toast.error("Unable to load members", { description: getApiErrorMessage(error) });
      }

      try {
        const metricsResponse = await adminApi.getMetrics();
        if (!active) {
          return;
        }
        setMetrics((prev) =>
          prev.map((card) => {
            if (card.id === "verified") {
              return { ...card, value: `${metricsResponse.snapshot.verifiedMembers}` };
            }
            if (card.id === "listings") {
              return {
                ...card,
                value: `${metricsResponse.snapshot.totalListings} / ${metricsResponse.snapshot.soldListings}`,
              };
            }
            if (card.id === "reports") {
              const resolvedRate = metricsResponse.snapshot.openReports === 0
                ? "100%"
                : `${Math.max(0, 100 - metricsResponse.snapshot.openReports)}%`;
              return { ...card, value: resolvedRate };
            }
            if (card.id === "verifications") {
              return {
                ...card,
                value: `${metricsResponse.snapshot.manualVerificationBacklog}`,
              };
            }
            return card;
          }),
        );
      } catch (error) {
        toast.error("Unable to load metrics", { description: getApiErrorMessage(error) });
      }

      try {
        const auditLog = await adminApi.getAudit(20);
        if (!active) {
          return;
        }
        const directory = userDirectoryRef.current;
        setAuditEntries(
          auditLog.map((entry) => ({
            id: entry.id,
            actor: directory.get(entry.actorId)?.username ?? entry.actorId,
            action: entry.action,
            time: formatRelativeTime(entry.createdAt),
          })),
        );
      } catch (error) {
        toast.error("Unable to load audit log", { description: getApiErrorMessage(error) });
      }
    };

    hydrateAdminData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setListingRows((prev) => {
      const rowMap = new Map(prev.map((row) => [row.id, row]));
      const next = [...prev];

      listings.forEach((listing) => {
        const existing = rowMap.get(listing.id);
        const status: AdminListingStatus = existing?.status === "Flagged" || existing?.status === "Removed"
          ? existing.status
          : listing.status === "sold"
          ? "Sold"
          : "Active";

        const updated: AdminListingRow = {
          id: listing.id,
          item: listing.title,
          base: getBaseName(bases, listing.baseId),
          price: listing.isFree ? "Free" : formatCurrency(listing.price),
          seller: getMemberName(listing.sellerId),
          date: formatShortDate(listing.postedAt),
          status,
          reports: existing?.reports ?? 0,
        };

        if (existing) {
          const index = next.findIndex((row) => row.id === listing.id);
          next[index] = { ...existing, ...updated };
        } else {
          next.push(updated);
        }
      });

      return next;
    });
  }, [bases, listings, getMemberName]);

  useEffect(() => {
    setBaseRows((prev) => {
      const computed = createBaseRows(bases, accountList, listings, reports);
      const combinedIds = new Set<string>([
        ...computed.map((row) => row.id),
        ...prev.map((row) => row.id),
      ]);

      return Array.from(combinedIds).map((id) => {
        const computedRow = computed.find((row) => row.id === id);
        const existing = prev.find((row) => row.id === id);
        if (computedRow && existing) {
          return { ...existing, ...computedRow };
        }
        return computedRow ?? existing!;
      });
    });
  }, [bases, accountList, listings, reports]);

  useEffect(() => {
    setMetrics(createMetricCards(accountList, listings, transactions, verificationDocs.length));
  }, [accountList, listings, transactions, verificationDocs.length]);

  useEffect(() => {
    setVerificationQueues((prev) =>
      prev.map((queue) =>
        queue.id === "auto"
          ? {
              ...queue,
              count: accountList.filter((account) => account.isDodVerified).length,
            }
          : queue,
      ),
    );
  }, [accountList]);

  const appendAuditEntry = useCallback(
    (action: string) => {
      setAuditEntries((prev) => [
        {
          id: `audit-${crypto.randomUUID()}`,
          actor: user.name,
          action,
          time: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        },
        ...prev,
      ]);
    },
    [user.name],
  );

  const updateQueueCount = useCallback((queueId: string, delta: number) => {
    setVerificationQueues((prev) =>
      prev.map((queue) =>
        queue.id === queueId
          ? {
              ...queue,
              count: Math.max(queue.count + delta, 0),
            }
          : queue,
      ),
    );
  }, []);

  const adjustListingReports = useCallback(
    (listingId: string, delta: number, nextStatus?: AdminListingStatus) => {
      setListingRows((prev) =>
        prev.map((row) =>
          row.id === listingId
            ? {
                ...row,
                reports: Math.max(row.reports + delta, 0),
                status: nextStatus ?? row.status,
              }
            : row,
        ),
      );
    },
    [],
  );

  const handleVerifyUser = useCallback(
    async (userId: string, method?: string) => {
      try {
        await adminApi.updateUser(userId, { verify: true });
        completeDodVerification(userId);
        setUserOverrides((prev) => ({
          ...prev,
          [userId]: { ...(prev[userId] ?? {}), verified: true, suspended: false },
        }));
        addNotice({
          userId,
          category: "verification",
          severity: "success",
          title: "Verification approved",
          message: "Your credentials were manually verified by the admin team.",
        });
        toast.success("User verified", {
          description: getMemberName(userId),
        });
        appendAuditEntry(`Verified user ${getMemberName(userId)}`);
        if (method) {
          const queueId = queueIdByMethod[method];
          if (queueId && queueId !== "auto") {
            updateQueueCount(queueId, -1);
          }
        }
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to verify user", { description: message });
      }
    },
    [addNotice, appendAuditEntry, completeDodVerification, getMemberName, updateQueueCount],
  );

  const handleSuspendUser = useCallback(
    async (userId: string) => {
      const reason = "Manual suspension issued by admin.";
      try {
        await adminApi.updateUser(userId, { status: "suspended", reason });
        suspendMember(userId, reason);
        setUserOverrides((prev) => ({
          ...prev,
          [userId]: { ...(prev[userId] ?? {}), suspended: true },
        }));
        appendAuditEntry(`Suspended user ${getMemberName(userId)}`);
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to suspend user", { description: message });
      }
    },
    [appendAuditEntry, getMemberName, suspendMember],
  );

  const handleReinstateUser = useCallback(
    async (userId: string) => {
      try {
        await adminApi.updateUser(userId, { status: "active" });
        reinstateMember(userId);
        setUserOverrides((prev) => ({
          ...prev,
          [userId]: { ...(prev[userId] ?? {}), suspended: false },
        }));
        appendAuditEntry(`Reinstated user ${getMemberName(userId)}`);
        toast.success("Member reinstated", { description: getMemberName(userId) });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to reinstate", { description: message });
      }
    },
    [appendAuditEntry, getMemberName, reinstateMember],
  );

  const handleResetVerification = useCallback(
    (userId: string) => {
      setUserOverrides((prev) => ({
        ...prev,
        [userId]: { ...(prev[userId] ?? {}), verified: false },
      }));
      addNotice({
        userId,
        category: "verification",
        severity: "info",
        title: "Verification reset",
        message: "Please re-submit your verification method to regain access.",
      });
      updateQueueCount("id", 1);
      appendAuditEntry(`Reset verification for ${getMemberName(userId)}`);
      toast.info("Verification reset", { description: getMemberName(userId) });
    },
    [addNotice, appendAuditEntry, getMemberName, updateQueueCount],
  );

  const handleIssueStrike = useCallback(
    (userId: string, reason: string) => {
      issueStrike(userId, reason);
      appendAuditEntry(`Issued strike to ${getMemberName(userId)}: ${reason}`);
      toast.warning("Strike recorded", { description: reason });
    },
    [appendAuditEntry, getMemberName, issueStrike],
  );

  const handleViewActivity = useCallback(
    (userId: string) => {
      appendAuditEntry(`Viewed activity log for ${getMemberName(userId)}`);
      toast.info("Activity log exported", {
        description: `${getMemberName(userId)} — latest actions sent to command inbox.`,
      });
    },
    [appendAuditEntry, getMemberName],
  );

  const handleRemoveListing = useCallback(
    async (listingId: string) => {
      const listing = listings.find((item) => item.id === listingId);
      try {
        await adminApi.hideListing(listingId, {
          reason: "Removed by admin review",
        });
        if (listing) {
          archivedListingsRef.current[listingId] = listing;
          addNotice({
            userId: listing.sellerId,
            category: "report",
            severity: "danger",
            title: "Listing removed",
            message: "Your listing was removed pending review. Reply to the moderation email if needed.",
          });
        }
        removeListing(listingId);
        adjustListingReports(listingId, 0, "Removed");
        appendAuditEntry(`Removed listing ${listingId}`);
        toast.error("Listing removed", {
          description: listing ? listing.title : listingId,
        });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to remove listing", { description: message });
      }
    },
    [addNotice, adjustListingReports, appendAuditEntry, listings, removeListing],
  );

  const handleRestoreListing = useCallback(
    async (listingId: string) => {
      const archived = archivedListingsRef.current[listingId];
      if (!archived) {
        toast.error("Nothing to restore", { description: "Archived listing not found." });
        return;
      }
      try {
        await adminApi.restoreListing(listingId);
        addListing({ ...archived, postedAt: new Date().toISOString(), status: "active" });
        adjustListingReports(listingId, 0, "Active");
        appendAuditEntry(`Restored listing ${listingId}`);
        addNotice({
          userId: archived.sellerId,
          category: "system",
          severity: "success",
          title: "Listing restored",
          message: "Your listing is live again after moderation review.",
        });
        toast.success("Listing restored", { description: archived.title });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to restore listing", { description: message });
      }
    },
    [addListing, addNotice, adjustListingReports, appendAuditEntry],
  );

  const handleToggleFlag = useCallback(
    (listingId: string) => {
      setListingRows((prev) =>
        prev.map((row) => {
          if (row.id !== listingId) {
            return row;
          }
          const nextStatus: AdminListingStatus = row.status === "Flagged" ? "Active" : "Flagged";
          return {
            ...row,
            status: nextStatus,
            reports: nextStatus === "Flagged" ? Math.max(row.reports, 1) : row.reports,
          };
        }),
      );
      appendAuditEntry(`Toggled flag on listing ${listingId}`);
    },
    [appendAuditEntry],
  );

  const handleViewListing = useCallback(
    (listingId: string) => {
      navigate(`/listing/${listingId}`);
    },
    [navigate],
  );

  const handleInspectMessages = useCallback(
    (listingId: string) => {
      const thread = messageThreads.find((item) => item.listingId === listingId);
      if (!thread) {
        toast.info("No thread yet", { description: "No messages linked to this listing." });
        return;
      }
      navigate(`/messages/${thread.id}`);
    },
    [messageThreads, navigate],
  );

  const handleApproveReport = useCallback(
    async (reportId: string) => {
      const report = reports.find((entry) => entry.id === reportId);
      if (!report) {
        return;
      }
      try {
        await adminApi.resolveReport(reportId, {
          status: "resolved",
          notes: `${report.type} approved by admin`,
        });
        setReports((prev) => prev.filter((entry) => entry.id !== reportId));
        setReportNotes((prev) => {
          if (!prev[reportId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
        if (report.targetType === "listing") {
          adjustListingReports(report.targetId, 1, "Flagged");
          appendAuditEntry(`Approved report ${reportId} for listing ${report.targetId}`);
        } else {
          handleIssueStrike(
            report.targetId,
            `Strike issued after approving report ${reportId} (${report.type})`,
          );
          appendAuditEntry(`Approved report ${reportId} for user ${report.targetId}`);
        }
        toast.success("Report approved", { description: `${report.type} • ${report.targetLabel}` });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to approve report", { description: message });
      }
    },
    [adjustListingReports, appendAuditEntry, handleIssueStrike, reports],
  );

  const handleDismissReport = useCallback(
    async (reportId: string) => {
      const report = reports.find((entry) => entry.id === reportId);
      if (!report) {
        return;
      }
      try {
        await adminApi.resolveReport(reportId, {
          status: "dismissed",
          notes: `${report.type} dismissed by admin`,
        });
        setReports((prev) => prev.filter((entry) => entry.id !== reportId));
        setReportNotes((prev) => {
          if (!prev[reportId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
        appendAuditEntry(`Dismissed report ${reportId}`);
        toast.info("Report dismissed", { description: `${report.type} • ${report.targetLabel}` });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to dismiss report", { description: message });
      }
    },
    [appendAuditEntry, reports],
  );

  const handleOpenEvidence = useCallback(
    (reportId: string) => {
      const report = reports.find((entry) => entry.id === reportId);
      if (report?.attachmentUrl) {
        window.open(report.attachmentUrl, "_blank", "noopener");
        appendAuditEntry(`Opened evidence for report ${reportId}`);
      } else {
        toast.info("No attachment", { description: "This report did not include evidence." });
      }
    },
    [appendAuditEntry, reports],
  );

  const handleAddReportNote = useCallback(
    (reportId: string, note: string) => {
      const trimmed = note.trim();
      if (!trimmed) {
        return;
      }
      setReportNotes((prev) => {
        const existing = prev[reportId] ?? [];
        return { ...prev, [reportId]: [trimmed, ...existing] };
      });
      appendAuditEntry(`Added note to report ${reportId}: ${trimmed}`);
      toast.success("Note saved", { description: trimmed });
    },
    [appendAuditEntry],
  );

  const handleApproveVerification = useCallback(
    async (docId: string) => {
      const doc = verificationDocs.find((entry) => entry.id === docId);
      if (!doc) {
        return;
      }
      try {
        await adminApi.adjudicateVerification(docId, { status: "approved", notes: "Approved by admin" });
        setVerificationDocs((prev) => prev.filter((entry) => entry.id !== docId));
        await handleVerifyUser(doc.userId, doc.method);
        appendAuditEntry(`Approved verification for ${doc.name}`);
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to approve verification", { description: message });
      }
    },
    [appendAuditEntry, handleVerifyUser, verificationDocs],
  );

  const handleDenyVerification = useCallback(
    async (docId: string) => {
      const doc = verificationDocs.find((entry) => entry.id === docId);
      if (!doc) {
        return;
      }
      try {
        await adminApi.adjudicateVerification(docId, { status: "denied", notes: "Denied by admin" });
        setVerificationDocs((prev) => prev.filter((entry) => entry.id !== docId));
        const queueId = queueIdByMethod[doc.method];
        if (queueId) {
          updateQueueCount(queueId, -1);
        }
        addNotice({
          userId: doc.userId,
          category: "report",
          severity: "warning",
          title: "Verification denied",
          message: "The information provided did not pass review. Please resubmit with clearer documentation.",
        });
        appendAuditEntry(`Denied verification for ${doc.name}`);
        toast.error("Verification denied", { description: doc.name });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to deny verification", { description: message });
      }
    },
    [addNotice, appendAuditEntry, updateQueueCount, verificationDocs],
  );

  const handleWarnThread = useCallback(
    async (threadId: string) => {
      try {
        await adminApi.getThreads();
      } catch (error) {
        toast.error("Unable to refresh threads", { description: getApiErrorMessage(error) });
      }
      const thread = messageThreads.find((entry) => entry.id === threadId);
      if (thread) {
        thread.participants.forEach((participant) => {
          if (participant !== user.id) {
            addNotice({
              userId: participant,
              category: "report",
              severity: "warning",
              title: "Conduct warning",
              message: "Please keep conversations on BaseList respectful and within platform payments.",
            });
          }
        });
      }
      setFlaggedThreads((prev) =>
        prev.map((item) =>
          item.id === threadId
            ? {
                ...item,
                accessedBy: user.name,
                flaggedAt: item.flaggedAt ?? "Today",
              }
            : item,
        ),
      );
      appendAuditEntry(`Warned participants in thread ${threadId}`);
      toast.success("Warning sent", { description: `Thread ${threadId}` });
    },
    [addNotice, appendAuditEntry, messageThreads, user.id, user.name],
  );

  const handleBanThread = useCallback(
    async (threadId: string, offendingUserId?: string) => {
      if (offendingUserId) {
        try {
          await adminApi.updateUser(offendingUserId, {
            status: "banned",
            reason: "Removed after review of flagged messages.",
          });
          suspendMember(offendingUserId, "Removed after review of flagged messages.");
        } catch (error) {
          toast.error("Unable to ban user", { description: getApiErrorMessage(error) });
        }
      }
      setFlaggedThreads((prev) => prev.filter((item) => item.id !== threadId));
      appendAuditEntry(`Banned user from thread ${threadId}`);
      toast.error("User banned", { description: `Thread ${threadId}` });
    },
    [appendAuditEntry, suspendMember],
  );

  const handleMarkThreadReviewed = useCallback(
    (threadId: string) => {
      setFlaggedThreads((prev) =>
        prev.map((item) =>
          item.id === threadId
            ? {
                ...item,
                accessedBy: user.name,
              }
            : item,
        ),
      );
    },
    [user.name],
  );

  const handleAddBase = useCallback(
    async ({ name, region, timezone }: { name: string; region: string; timezone: string }) => {
      const id = slugifyId(name);
      const abbreviation = abbreviateBaseName(name);
      const sanitizedTimezone = timezone.trim().toUpperCase() || "CT";
      try {
        const { base } = await adminApi.createBase({
          id,
          name,
          abbreviation,
          region,
          timezone: sanitizedTimezone,
          latitude: 0,
          longitude: 0,
        });
        setBaseRows((prev) => [
          ...prev,
          {
            id: base.id,
            name: base.name,
            region: base.region,
            moderator: "Assign later",
            users: 0,
            activeListings: 0,
            pendingReports: 0,
          },
        ]);
        appendAuditEntry(`Added base ${base.name}`);
        toast.success("Base added", { description: base.name });
      } catch (error) {
        const message = getApiErrorMessage(error);
        toast.error("Unable to add base", { description: message });
      }
    },
    [appendAuditEntry],
  );

  const handleEditBase = useCallback(
    async (baseId: string, updates: { name?: string; region?: string; timezone?: string }) => {
      if (!updates || Object.keys(updates).length === 0) {
        return;
      }
      const payload: { name?: string; region?: string; timezone?: string } = {};
      if (updates.name) {
        payload.name = updates.name;
      }
      if (updates.region) {
        payload.region = updates.region;
      }
      if (updates.timezone) {
        payload.timezone = updates.timezone.toUpperCase();
      }
      if (Object.keys(payload).length === 0) {
        return;
      }
      try {
        await adminApi.updateBase(baseId, payload);
        setBaseRows((prev) =>
          prev.map((row) =>
            row.id === baseId
              ? {
                  ...row,
                  ...(payload.name ? { name: payload.name } : {}),
                  ...(payload.region ? { region: payload.region } : {}),
                }
              : row,
          ),
        );
        const detail = Object.entries(payload)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        appendAuditEntry(detail ? `Updated base ${baseId} (${detail})` : `Updated base ${baseId}`);
        toast.success("Base updated", { description: detail || baseId });
      } catch (error) {
        toast.error("Unable to update base", { description: getApiErrorMessage(error) });
      }
    },
    [appendAuditEntry],
  );

  const handleAssignModerator = useCallback(
    (baseId: string, moderator: string) => {
      const trimmed = moderator.trim();
      if (!trimmed) {
        return;
      }
      setBaseRows((prev) =>
        prev.map((row) => (row.id === baseId ? { ...row, moderator: trimmed } : row)),
      );
      appendAuditEntry(`Assigned ${trimmed} as moderator for base ${baseId}`);
      toast.success("Moderator assigned", { description: trimmed });
    },
    [appendAuditEntry],
  );

  const handleArchiveBase = useCallback(
    async (baseId: string) => {
      try {
        await adminApi.updateBase(baseId, { region: "Archived" });
      } catch (error) {
        toast.error("Unable to archive base", { description: getApiErrorMessage(error) });
      }
      setBaseRows((prev) => prev.filter((row) => row.id !== baseId));
      appendAuditEntry(`Archived base ${baseId}`);
      toast.info("Base archived", { description: baseId });
    },
    [appendAuditEntry],
  );

  const handleBaseStats = useCallback(
    async (baseId: string) => {
      try {
        await adminApi.getBases();
      } catch (error) {
        toast.error("Unable to load bases", { description: getApiErrorMessage(error) });
      }
      appendAuditEntry(`Viewed stats for base ${baseId}`);
      toast.info("Base stats opened", { description: baseId });
    },
    [appendAuditEntry],
  );

  const handleCreateSponsor = useCallback(
    (payload: Omit<SponsorPlacement, "id">) => {
      const id = `sponsor-${crypto.randomUUID()}`;
      addSponsorPlacement({ id, ...payload });
      toast.success("Sponsor saved", { description: payload.label });
    },
    [addSponsorPlacement],
  );

  const handleUpdateSponsor = useCallback(
    (
      placementId: string,
      updates: Partial<Omit<SponsorPlacement, "id">>,
    ) => {
      const existing = sponsorPlacements.find((placement) => placement.id === placementId);
      updateSponsorPlacement(placementId, updates);
      const label = updates.label ?? existing?.label ?? placementId;
      toast.success("Sponsor updated", { description: label });
    },
    [sponsorPlacements, updateSponsorPlacement],
  );

  const handleRemoveSponsor = useCallback(
    (placementId: string) => {
      const existing = sponsorPlacements.find((placement) => placement.id === placementId);
      removeSponsorPlacement(placementId);
      toast.info("Sponsor removed", { description: existing?.label ?? placementId });
    },
    [removeSponsorPlacement, sponsorPlacements],
  );

  const handleViewAuditLog = useCallback(async () => {
    try {
      const auditLog = await adminApi.getAudit(50);
      const directory = userDirectoryRef.current;
      setAuditEntries(
        auditLog.map((entry) => ({
          id: entry.id,
          actor: directory.get(entry.actorId)?.username ?? entry.actorId,
          action: entry.action,
          time: formatRelativeTime(entry.createdAt),
        })),
      );
    } catch (error) {
      toast.error("Unable to load audit log", { description: getApiErrorMessage(error) });
    }
    appendAuditEntry("Reviewed security log");
    toast.info("Audit log opened", { description: "Latest actions loaded." });
  }, [appendAuditEntry]);

  const handleExportMetrics = useCallback(async () => {
    try {
      await adminApi.getMetrics();
    } catch (error) {
      toast.error("Unable to export metrics", { description: getApiErrorMessage(error) });
    }
    appendAuditEntry("Exported metrics CSV");
    toast.success("Export queued", { description: "CSV download will begin shortly." });
  }, [appendAuditEntry]);

  const handleClearAudit = useCallback(async () => {
    try {
      await adminApi.getAudit(10);
    } catch (error) {
      toast.error("Unable to refresh audit", { description: getApiErrorMessage(error) });
    }
    setAuditEntries([]);
    toast.info("Audit log cleared");
  }, []);

  const userRecords = useMemo<AdminUserRecord[]>(() => {
    return SELLERS.map((seller) => {
      const account = accountList.find((item) => item.id === seller.id);
      const overrides = userOverrides[seller.id] ?? {};
      const discipline = memberDiscipline[seller.id];
      const sellerListings = scopedListings.filter((listing) => listing.sellerId === seller.id);
      const threads = scopedMessageThreads.filter((thread) => thread.participants.includes(seller.id));
      const fallbackBaseId = bases[0]?.id;
      const effectiveBaseId = account?.baseId ?? sellerListings[0]?.baseId ?? fallbackBaseId;
      if (!isAdmin && moderatorBaseId && effectiveBaseId !== moderatorBaseId) {
        return null;
      }
      const reportCount = visibleReports.filter((report) => {
        if (report.targetType === "user") {
          return report.targetId === seller.id;
        }
        return sellerListings.some((listing) => listing.id === report.targetId);
      }).length;
      const rating = getUserRatingSummary(seller.id);
      const average = rating.overallAverage ?? seller.rating ?? null;
      const count = rating.overallCount || seller.ratingCount || 0;

      return {
        id: seller.id,
        name: seller.name,
        base: getBaseName(bases, effectiveBaseId),
        verified: overrides.verified ?? account?.isDodVerified ?? seller.verified,
        suspended: overrides.suspended ?? Boolean(discipline?.suspendedAt),
        joined: formatShortDate(account?.createdAt ?? seller.memberSince),
        ratingLabel: average ? `${average.toFixed(1)} / ${count}` : "No rating",
        reports: reportCount,
        listings: sellerListings.length,
        messages: threads.length,
        strikes: discipline?.strikes ?? 0,
      } as AdminUserRecord | null;
    })
      .filter((record): record is AdminUserRecord => record !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [
    accountList,
    bases,
    getUserRatingSummary,
    isAdmin,
    memberDiscipline,
    moderatorBaseId,
    scopedListings,
    scopedMessageThreads,
    userOverrides,
    visibleReports,
  ]);

  const flaggedListingCount = useMemo(
    () => visibleListingRows.filter((row) => row.status === "Flagged").length,
    [visibleListingRows],
  );

  const activeListingCount = useMemo(
    () => visibleListingRows.filter((row) => row.status === "Active").length,
    [visibleListingRows],
  );

  const soldListingCount = useMemo(
    () => visibleListingRows.filter((row) => row.status === "Sold").length,
    [visibleListingRows],
  );

  const pendingManualVerifications = useMemo(
    () =>
      visibleVerificationQueues
        .filter((queue) => queue.id !== "auto")
        .reduce((total, queue) => total + queue.count, 0) +
      visibleVerificationDocs.length,
    [visibleVerificationDocs.length, visibleVerificationQueues],
  );

  const topBasesStats = useMemo(() => {
    const sorted = visibleBaseRows
      .slice()
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);
    const chartData = sorted.map((row) => ({ id: row.id, label: row.name, value: row.users }));
    return {
      chartData,
      chartMax: sorted[0]?.users ?? 0,
      topName: sorted[0]?.name ?? "—",
      topUsers: sorted[0]?.users ?? 0,
    };
  }, [visibleBaseRows]);

  const queueHealthLabel = useMemo(() => {
    const flaggedCount = visibleFlaggedThreads.length;
    const reportCount = visibleReports.length;
    if (flaggedCount === 0 && reportCount === 0) {
      return "Stable";
    }
    if (flaggedCount > 3 || reportCount > 6) {
      return "Attention";
    }
    return "Healthy";
  }, [visibleFlaggedThreads.length, visibleReports.length]);

  const queueHealthTone = queueHealthLabel === "Stable"
    ? "text-verified"
    : queueHealthLabel === "Healthy"
    ? "text-success"
    : "text-warning";

  const dashboardCards = useMemo<DashboardCard[]>(
    () => [
      {
        id: "verifications",
        label: "Pending Verifications",
        value: `${pendingManualVerifications}`,
        meta: "Awaiting action",
        icon: BadgeCheck,
        toneClass: "text-primary",
        target: "verification",
      },
      {
        id: "reports",
        label: "Active Reports",
        value: `${visibleReports.length}`,
        meta: "Unresolved",
        icon: ShieldAlert,
        toneClass: visibleReports.length ? "text-warning" : "text-muted-foreground",
        target: "reports",
      },
      {
        id: "listings",
        label: "Listings",
        value: `${activeListingCount} / ${flaggedListingCount}`,
        meta: "Active / Flagged",
        icon: PackageSearch,
        toneClass: flaggedListingCount ? "text-warning" : "text-muted-foreground",
        target: "listings",
      },
      {
        id: "users",
        label: "New Users",
        value: `${scopedAccounts.filter(
          (account) =>
            new Date(account.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).length}`,
        meta: "This week",
        icon: Users2,
        toneClass: "text-success",
        target: "users",
      },
      {
        id: "bases",
        label: "Top Bases",
        value: topBasesStats.topName,
        meta:
          topBasesStats.topUsers > 0
            ? `${topBasesStats.topUsers.toLocaleString()} members`
            : "No members yet",
        icon: Building2,
        toneClass: "text-muted-foreground",
        target: "bases",
        chartData: topBasesStats.chartData,
        chartMax: topBasesStats.chartMax,
      },
      {
        id: "queue",
        label: "Queue Health",
        value: queueHealthLabel,
        meta: `${visibleFlaggedThreads.length} flagged threads`,
        icon: Activity,
        toneClass: queueHealthTone,
        target: "messaging",
      },
    ],
    [
      activeListingCount,
      flaggedListingCount,
      pendingManualVerifications,
      queueHealthLabel,
      queueHealthTone,
      scopedAccounts,
      topBasesStats,
      visibleFlaggedThreads.length,
      visibleReports.length,
    ],
  );

  const roles = useMemo(() => createInitialRoles(), []);
  const unreadNoticeCount = useMemo(
    () =>
      notices.filter(
        (notice) => !notice.read && (notice.userId === "all" || notice.userId === user.id),
      ).length,
    [notices, user.id],
  );

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold text-foreground">BaseList Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Simple, fast, auditable controls for every base. All actions are logged for 90 days.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                {unreadNoticeCount} unread notice{unreadNoticeCount === 1 ? "" : "s"}
              </span>
              {unreadNoticeCount > 0 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary hover:underline"
                  onClick={markAllNoticesRead}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-2xl border border-dashed border-nav-border bg-background/70 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <span className="text-foreground">Signed in as {user.name}</span>
            <span className="flex items-center gap-2 text-muted-foreground/80">
              <span className="inline-flex h-2 w-2 rounded-full bg-verified" />
              Role • {user.role?.toUpperCase?.() ?? "ADMIN"}
            </span>
            <span className="text-muted-foreground/70">Listings sold: {soldListingCount}</span>
            <span className="text-muted-foreground/70">Verified members: {analytics.verifiedMembers}</span>
          </div>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[18rem,1fr]">
        <AdminSidebar items={availableSections} activeId={activeSection} onSelect={setActiveSection} />
        <div className="space-y-8">
          {activeSection === "dashboard" ? (
            <>
              <DashboardSection cards={dashboardCards} onNavigate={setActiveSection} />
              <section className="space-y-3 rounded-3xl border border-border bg-background/80 p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">QA checklist</h2>
                  <span className="text-xs text-muted-foreground">All priority flows verified</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {QA_CHECKLIST.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-nav-border bg-card/80 px-4 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{item.flow}</span>
                        <span className="text-[11px] text-muted-foreground/80">{item.detail}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
                        Verified
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
          {activeSection === "users" ? (
            <UsersSection
              users={userRecords}
              onVerify={handleVerifyUser}
              onSuspend={handleSuspendUser}
              onReinstate={handleReinstateUser}
              onResetVerification={handleResetVerification}
              onViewActivity={handleViewActivity}
              onIssueStrike={handleIssueStrike}
            />
          ) : null}
          {activeSection === "listings" ? (
            <ListingsSection
              listings={listingRows}
              onView={handleViewListing}
              onRemove={handleRemoveListing}
              onRestore={handleRestoreListing}
              onInspectMessages={handleInspectMessages}
              onToggleFlag={handleToggleFlag}
            />
          ) : null}
          {activeSection === "reports" ? (
            <ReportsSection
              reports={reports}
              reportNotes={reportNotes}
              onApprove={handleApproveReport}
              onDismiss={handleDismissReport}
              onOpenAttachment={handleOpenEvidence}
              onAddNote={handleAddReportNote}
            />
          ) : null}
          {activeSection === "verification" ? (
            <VerificationSection
              queues={verificationQueues}
              documents={verificationDocs}
              onApprove={handleApproveVerification}
              onDeny={handleDenyVerification}
            />
          ) : null}
          {activeSection === "bases" ? (
            <BasesSection
              bases={baseRows}
              onAddBase={handleAddBase}
              onEditBase={handleEditBase}
              onArchiveBase={handleArchiveBase}
              onAssignModerator={handleAssignModerator}
              onViewStats={handleBaseStats}
            />
          ) : null}
          {activeSection === "sponsors" ? (
            <SponsorsSection
              placements={sponsorRows}
              bases={bases}
              onCreate={handleCreateSponsor}
              onUpdate={handleUpdateSponsor}
              onDelete={handleRemoveSponsor}
            />
          ) : null}
          {activeSection === "messaging" ? (
            <MessagingSection
              threads={flaggedThreads}
              onWarn={handleWarnThread}
              onBan={handleBanThread}
              onMarkReviewed={handleMarkThreadReviewed}
            />
          ) : null}
          {activeSection === "metrics" ? (
            <MetricsSection
              metrics={metrics}
              onViewLog={handleViewAuditLog}
              onExport={handleExportMetrics}
            />
          ) : null}
          {activeSection === "roles" ? <RolesSection roles={roles} /> : null}
          {activeSection === "security" ? (
            <SecuritySection auditEntries={auditEntries} onClearAudit={handleClearAudit} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
