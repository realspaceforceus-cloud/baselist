import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export type Role = "member" | "moderator" | "admin";
export type UserStatus = "active" | "suspended" | "banned";
export type ListingStatus = "active" | "sold" | "hidden";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type VerificationStatus = "pending" | "approved" | "denied";
export type TransactionStatus = "pending" | "completed" | "cancelled";

export interface BaseRecord {
  id: string;
  name: string;
  abbreviation: string;
  region: string;
  timezone: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  baseId: string;
  createdAt: string;
  updatedAt: string;
  dodVerifiedAt: string | null;
  lastLoginAt: string | null;
  rememberDeviceUntil: string | null;
  avatarUrl: string;
}

export interface ListingRecord {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  category: string;
  status: ListingStatus;
  sellerId: string;
  baseId: string;
  promoted?: "feature" | "bump";
  description?: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  sentAt: string;
  type: "text" | "attachment";
}

export interface MessageThreadRecord {
  id: string;
  listingId: string;
  participants: string[];
  status: "active" | "archived" | "closed";
  messages: MessageRecord[];
  archivedBy: string[];
  deletedBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: string;
  threadId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  status: TransactionStatus;
  value: number;
  createdAt: string;
  completedAt: string | null;
}

export interface RatingRecord {
  id: string;
  transactionId: string;
  userId: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  type: string;
  reporterId: string;
  targetType: "listing" | "user" | "thread";
  targetId: string;
  baseId: string;
  notes: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolverId: string | null;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  method: "Invite Code" | ".mil Verified" | "ID Review";
  status: VerificationStatus;
  documentUrl: string | null;
  submittedAt: string;
  expiresAt: string;
  adjudicatedAt: string | null;
  adjudicatedBy: string | null;
}

export interface AdminRecord {
  id: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  deviceId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string;
  userAgent?: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  ipAddress?: string;
}

interface Indexes {
  usersByBase: Map<string, Set<string>>;
  listingsByBase: Map<string, Set<string>>;
  listingsBySeller: Map<string, Set<string>>;
  reportsByBase: Map<string, Set<string>>;
  threadsByParticipant: Map<string, Set<string>>;
}

const bcryptRounds = 10;

const seedPassword = (raw: string) => bcrypt.hashSync(raw, bcryptRounds);

const nowIso = () => new Date().toISOString();

const withTimestamps = <T extends object>(record: T): T & { createdAt: string; updatedAt: string } => {
  const timestamp = nowIso();
  return {
    ...record,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const seedBases = (): BaseRecord[] => {
  const timestamp = nowIso();
  return [
    {
      id: "vance-afb",
      name: "Vance AFB",
      abbreviation: "VAFB",
      region: "Enid, OK",
      timezone: "CT",
      latitude: 36.339167,
      longitude: -97.916389,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "jblm",
      name: "Joint Base Lewis-McChord",
      abbreviation: "JBLM",
      region: "Tacoma, WA",
      timezone: "PT",
      latitude: 47.1126,
      longitude: -122.5808,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "ramstein-ab",
      name: "Ramstein Air Base",
      abbreviation: "RAB",
      region: "Kaiserslautern, Germany",
      timezone: "CET",
      latitude: 49.4369,
      longitude: 7.6003,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "andrews-afb",
      name: "Joint Base Andrews",
      abbreviation: "JBA",
      region: "Prince George's County, MD",
      timezone: "ET",
      latitude: 38.8108,
      longitude: -76.867,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};

const seedUsers = (bases: BaseRecord[]): UserRecord[] => {
  const passwords = {
    "seller-taylor": seedPassword("Password!2024"),
    "seller-avery": seedPassword("Password!2024"),
    "seller-lena": seedPassword("Password!2024"),
    "seller-marcus": seedPassword("Password!2024"),
  } satisfies Record<string, string>;

  const avatar = (seed: string) =>
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&fontWeight=700`;

  const timestamp = nowIso();

  return [
    {
      id: "seller-taylor",
      username: "capt_taylor_greene",
      email: "capt_taylor_greene@us.af.mil",
      passwordHash: passwords["seller-taylor"],
      role: "moderator",
      status: "active",
      baseId: bases[0]?.id ?? "vance-afb",
      createdAt: timestamp,
      updatedAt: timestamp,
      dodVerifiedAt: timestamp,
      lastLoginAt: timestamp,
      rememberDeviceUntil: null,
      avatarUrl:
        "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=128&q=80",
    },
    {
      id: "seller-avery",
      username: "msgt_avery_chen",
      email: "msgt_avery_chen@us.af.mil",
      passwordHash: passwords["seller-avery"],
      role: "moderator",
      status: "active",
      baseId: bases[0]?.id ?? "vance-afb",
      createdAt: timestamp,
      updatedAt: timestamp,
      dodVerifiedAt: timestamp,
      lastLoginAt: timestamp,
      rememberDeviceUntil: null,
      avatarUrl:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=128&q=80",
    },
    {
      id: "seller-lena",
      username: "lt_lena_ortiz",
      email: "lt_lena_ortiz@us.af.mil",
      passwordHash: passwords["seller-lena"],
      role: "member",
      status: "active",
      baseId: bases[0]?.id ?? "vance-afb",
      createdAt: timestamp,
      updatedAt: timestamp,
      dodVerifiedAt: timestamp,
      lastLoginAt: timestamp,
      rememberDeviceUntil: null,
      avatarUrl:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=128&q=80",
    },
    {
      id: "seller-marcus",
      username: "tsgt_marcus_boyd",
      email: "tsgt_marcus_boyd@us.af.mil",
      passwordHash: passwords["seller-marcus"],
      role: "member",
      status: "active",
      baseId: bases[0]?.id ?? "vance-afb",
      createdAt: timestamp,
      updatedAt: timestamp,
      dodVerifiedAt: timestamp,
      lastLoginAt: timestamp,
      rememberDeviceUntil: null,
      avatarUrl:
        "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=128&q=80",
    },
    {
      id: "admin-harper",
      username: "col_harper",
      email: "col_harper@us.af.mil",
      passwordHash: seedPassword("Command!2024"),
      role: "admin",
      status: "active",
      baseId: bases[0]?.id ?? "vance-afb",
      createdAt: timestamp,
      updatedAt: timestamp,
      dodVerifiedAt: timestamp,
      lastLoginAt: timestamp,
      rememberDeviceUntil: null,
      avatarUrl: avatar("Col Harper"),
    },
  ];
};

const seedListings = (bases: BaseRecord[]): ListingRecord[] => {
  const timestamp = nowIso();
  return [
    {
      id: "listing-forester",
      title: "2018 Subaru Forester Touring AWD",
      price: 18750,
      isFree: false,
      category: "Vehicles",
      status: "active",
      sellerId: "seller-taylor",
      baseId: bases[0]?.id ?? "vance-afb",
      promoted: "feature",
      description:
        "Meticulously maintained Forester Touring with EyeSight, remote start, and new tires. All service performed at Subaru of Oklahoma City.",
      imageUrls: [
        "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&h=600",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&h=600",
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "listing-dining",
      title: "West Elm Mid-Century Dining Set (5pc)",
      price: 950,
      isFree: false,
      category: "Furniture",
      status: "active",
      sellerId: "seller-avery",
      baseId: bases[0]?.id ?? "vance-afb",
      description:
        "Walnut table with four upholstered chairs. Lightly used in smoke-free home. Includes felt pads for easy move-in.",
      imageUrls: [
        "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&h=600",
        "https://images.unsplash.com/photo-1473181488821-2d23949a045a?auto=format&fit=crop&w=600&h=600",
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "listing-stroller",
      title: "UPPAbaby Vista V2 + Bassinet",
      price: 0,
      isFree: true,
      category: "Kids",
      status: "active",
      sellerId: "seller-lena",
      baseId: bases[0]?.id ?? "vance-afb",
      description:
        "Complete Vista V2 travel system with bassinet, rain cover, and cup holder. Offering to another base family for free pickup.",
      imageUrls: [
        "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&h=600",
        "https://images.unsplash.com/photo-1536304465711-1b0ec3f41a1d?auto=format&fit=crop&w=600&h=600",
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "listing-ps5",
      title: "PlayStation 5 Digital + 2 Controllers",
      price: 425,
      isFree: false,
      category: "Electronics",
      status: "active",
      sellerId: "seller-marcus",
      baseId: bases[0]?.id ?? "vance-afb",
      promoted: "bump",
      description:
        "PS5 Digital Edition lightly used. Includes two DualSense controllers, charging dock, and installed 1TB NVMe SSD upgrade.",
      imageUrls: [
        "https://images.unsplash.com/photo-1606813902915-fa4aa4ced5e9?auto=format&fit=crop&w=600&h=600",
        "https://images.unsplash.com/photo-1613758947305-9a3bb64d0c2b?auto=format&fit=crop&w=600&h=600",
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};

const seedThreads = (): MessageThreadRecord[] => {
  const timestamp = nowIso();
  return [
    {
      id: "thread-forester",
      listingId: "listing-forester",
      participants: ["seller-taylor", "seller-avery"],
      status: "active",
      messages: [
        {
          id: "msg-1",
          threadId: "thread-forester",
          authorId: "seller-avery",
          body: "Hi Capt. Greene! Is the Forester still available for pickup this weekend?",
          sentAt: timestamp,
          type: "text",
        },
        {
          id: "msg-2",
          threadId: "thread-forester",
          authorId: "seller-taylor",
          body: "Yes, Saturday morning works. I can meet by the Visitor Center at 0900.",
          sentAt: timestamp,
          type: "text",
        },
      ],
      archivedBy: [],
      deletedBy: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
};

const seedTransactions = (): TransactionRecord[] => [];
const seedRatings = (): RatingRecord[] => [];

const seedReports = (bases: BaseRecord[]): ReportRecord[] => {
  const timestamp = nowIso();
  return [
    {
      id: "RPT-2301",
      type: "Scam",
      reporterId: "seller-lena",
      targetType: "listing",
      targetId: "listing-forester",
      baseId: bases[0]?.id ?? "vance-afb",
      notes: "Buyer requested payment outside platform.",
      status: "open",
      createdAt: timestamp,
      resolvedAt: null,
      resolverId: null,
    },
    {
      id: "RPT-2302",
      type: "Weapon",
      reporterId: "seller-avery",
      targetType: "user",
      targetId: "seller-marcus",
      baseId: bases[2]?.id ?? "ramstein-ab",
      notes: "User attempting to sell prohibited hardware.",
      status: "open",
      createdAt: timestamp,
      resolvedAt: null,
      resolverId: null,
    },
  ];
};

const seedVerifications = (users: UserRecord[]): VerificationRecord[] => {
  const timestamp = nowIso();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  return [
    {
      id: "VRF-5102",
      userId: "seller-lena",
      method: "ID Review",
      status: "pending",
      documentUrl:
        "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2Fd6c802fb3f134fcfab6d7ba5f921c61c?format=webp&width=480",
      submittedAt: timestamp,
      expiresAt: new Date(Date.now() + twentyFourHours).toISOString(),
      adjudicatedAt: null,
      adjudicatedBy: null,
    },
    {
      id: "VRF-5103",
      userId: "seller-avery",
      method: "Invite Code",
      status: "pending",
      documentUrl:
        "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F22a9fb8aa9624c7ba93c886a492b7c9a?format=webp&width=480",
      submittedAt: timestamp,
      expiresAt: new Date(Date.now() + twentyFourHours).toISOString(),
      adjudicatedAt: null,
      adjudicatedBy: null,
    },
    {
      id: "VRF-5104",
      userId: users.find((user) => user.role === "admin")?.id ?? "admin-harper",
      method: ".mil Verified",
      status: "approved",
      documentUrl: null,
      submittedAt: timestamp,
      expiresAt: timestamp,
      adjudicatedAt: timestamp,
      adjudicatedBy: users.find((user) => user.role === "admin")?.id ?? "admin-harper",
    },
  ];
};

const seedAdmins = (users: UserRecord[]): AdminRecord[] => {
  const timestamp = nowIso();
  return users
    .filter((user) => user.role !== "member")
    .map((user) => ({
      id: randomUUID(),
      userId: user.id,
      role: user.role,
      createdAt: timestamp,
    }));
};

const seedRefreshTokens = (): RefreshTokenRecord[] => [];

export class BaseListStore {
  private bases: Map<string, BaseRecord>;
  private users: Map<string, UserRecord>;
  private listings: Map<string, ListingRecord>;
  private threads: Map<string, MessageThreadRecord>;
  private transactions: Map<string, TransactionRecord>;
  private ratings: Map<string, RatingRecord>;
  private reports: Map<string, ReportRecord>;
  private verifications: Map<string, VerificationRecord>;
  private admins: Map<string, AdminRecord>;
  private refreshTokens: Map<string, RefreshTokenRecord>;
  private audit: AuditEntry[];
  private indexes: Indexes;

  constructor() {
    const baseSeed = seedBases();
    const userSeed = seedUsers(baseSeed);
    const listingSeed = seedListings(baseSeed);
    const threadSeed = seedThreads();
    const transactionSeed = seedTransactions();
    const ratingSeed = seedRatings();
    const reportSeed = seedReports(baseSeed);
    const verificationSeed = seedVerifications(userSeed);
    const adminSeed = seedAdmins(userSeed);
    const refreshTokenSeed = seedRefreshTokens();

    this.bases = new Map(baseSeed.map((base) => [base.id, base]));
    this.users = new Map(userSeed.map((user) => [user.id, user]));
    this.listings = new Map(listingSeed.map((listing) => [listing.id, listing]));
    this.threads = new Map(threadSeed.map((thread) => [thread.id, thread]));
    this.transactions = new Map(transactionSeed.map((txn) => [txn.id, txn]));
    this.ratings = new Map(ratingSeed.map((rating) => [rating.id, rating]));
    this.reports = new Map(reportSeed.map((report) => [report.id, report]));
    this.verifications = new Map(verificationSeed.map((verification) => [verification.id, verification]));
    this.admins = new Map(adminSeed.map((admin) => [admin.id, admin]));
    this.refreshTokens = new Map(refreshTokenSeed.map((token) => [token.id, token]));
    this.audit = [];
    this.indexes = {
      usersByBase: new Map(),
      listingsByBase: new Map(),
      listingsBySeller: new Map(),
      reportsByBase: new Map(),
      threadsByParticipant: new Map(),
    };

    this.rebuildIndexes();
  }

  private rebuildIndexes() {
    this.indexes.usersByBase.clear();
    this.indexes.listingsByBase.clear();
    this.indexes.listingsBySeller.clear();
    this.indexes.reportsByBase.clear();
    this.indexes.threadsByParticipant.clear();

    for (const user of this.users.values()) {
      if (!this.indexes.usersByBase.has(user.baseId)) {
        this.indexes.usersByBase.set(user.baseId, new Set());
      }
      this.indexes.usersByBase.get(user.baseId)?.add(user.id);
    }

    for (const listing of this.listings.values()) {
      if (!this.indexes.listingsByBase.has(listing.baseId)) {
        this.indexes.listingsByBase.set(listing.baseId, new Set());
      }
      this.indexes.listingsByBase.get(listing.baseId)?.add(listing.id);

      if (!this.indexes.listingsBySeller.has(listing.sellerId)) {
        this.indexes.listingsBySeller.set(listing.sellerId, new Set());
      }
      this.indexes.listingsBySeller.get(listing.sellerId)?.add(listing.id);
    }

    for (const report of this.reports.values()) {
      if (!this.indexes.reportsByBase.has(report.baseId)) {
        this.indexes.reportsByBase.set(report.baseId, new Set());
      }
      this.indexes.reportsByBase.get(report.baseId)?.add(report.id);
    }

    for (const thread of this.threads.values()) {
      for (const participant of thread.participants) {
        if (!this.indexes.threadsByParticipant.has(participant)) {
          this.indexes.threadsByParticipant.set(participant, new Set());
        }
        this.indexes.threadsByParticipant.get(participant)?.add(thread.id);
      }
    }
  }

  private updateRecord<K, V extends { id: string; updatedAt: string }>(
    map: Map<string, V>,
    id: string,
    updater: (current: V) => V,
  ): V | null {
    const existing = map.get(id);
    if (!existing) {
      return null;
    }
    const next = updater({ ...existing, updatedAt: nowIso() });
    map.set(id, next);
    return next;
  }

  private addAuditEntry(entry: Omit<AuditEntry, "id" | "createdAt">) {
    const record: AuditEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: nowIso(),
    };
    this.audit.unshift(record);
    if (this.audit.length > 5000) {
      this.audit.length = 5000;
    }
  }

  private pruneExpiredVerifications() {
    const now = Date.now();
    let removed = false;
    for (const verification of this.verifications.values()) {
      if (verification.status === "pending" && new Date(verification.expiresAt).getTime() <= now) {
        this.verifications.delete(verification.id);
        removed = true;
      }
    }
    if (removed) {
      this.rebuildIndexes();
    }
  }

  getBases(): BaseRecord[] {
    return Array.from(this.bases.values());
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  getUser(id: string) {
    return this.users.get(id) ?? null;
  }

  getListings() {
    return Array.from(this.listings.values());
  }

  getListing(id: string) {
    return this.listings.get(id) ?? null;
  }

  getReports(status?: ReportStatus) {
    const all = Array.from(this.reports.values());
    return typeof status === "undefined" ? all : all.filter((report) => report.status === status);
  }

  getVerifications(status?: VerificationStatus) {
    this.pruneExpiredVerifications();
    const all = Array.from(this.verifications.values());
    return typeof status === "undefined"
      ? all
      : all.filter((verification) => verification.status === status);
  }

  getThreads() {
    return Array.from(this.threads.values());
  }

  getAuditLog(limit = 100) {
    return this.audit.slice(0, limit);
  }

  addBase(payload: Omit<BaseRecord, "createdAt" | "updatedAt">) {
    const record: BaseRecord = {
      ...payload,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.bases.set(record.id, record);
    this.rebuildIndexes();
    return record;
  }

  updateBase(id: string, updates: Partial<Omit<BaseRecord, "id" | "createdAt">>) {
    return this.updateRecord(this.bases, id, (current) => ({ ...current, ...updates }));
  }

  updateUserStatus(
    actorId: string,
    id: string,
    updates: Partial<Pick<UserRecord, "status" | "dodVerifiedAt" | "role">>,
    metadata: Record<string, unknown> = {},
  ) {
    const updated = this.updateRecord(this.users, id, (current) => ({ ...current, ...updates }));
    if (updated) {
      this.addAuditEntry({
        actorId,
        action: "user.update",
        targetType: "user",
        targetId: id,
        metadata,
      });
      this.rebuildIndexes();
    }
    return updated;
  }

  hideListing(actorId: string, listingId: string, reason: string) {
    const updated = this.updateRecord(this.listings, listingId, (current) => ({
      ...current,
      status: "hidden",
    }));
    if (updated) {
      this.addAuditEntry({
        actorId,
        action: "listing.hide",
        targetType: "listing",
        targetId: listingId,
        metadata: { reason },
      });
      this.rebuildIndexes();
    }
    return updated;
  }

  restoreListing(actorId: string, listingId: string) {
    const updated = this.updateRecord(this.listings, listingId, (current) => ({
      ...current,
      status: "active",
    }));
    if (updated) {
      this.addAuditEntry({
        actorId,
        action: "listing.restore",
        targetType: "listing",
        targetId: listingId,
        metadata: {},
      });
      this.rebuildIndexes();
    }
    return updated;
  }

  resolveReport(actorId: string, reportId: string, notes: string, status: ReportStatus) {
    const updated = this.updateRecord(this.reports, reportId, (current) => ({
      ...current,
      status,
      resolvedAt: nowIso(),
      resolverId: actorId,
      notes,
    }));
    if (updated) {
      this.addAuditEntry({
        actorId,
        action: "report.resolve",
        targetType: "report",
        targetId: reportId,
        metadata: { status, notes },
      });
      this.rebuildIndexes();
    }
    return updated;
  }

  adjudicateVerification(
    actorId: string,
    verificationId: string,
    status: Exclude<VerificationStatus, "pending">,
    metadata: Record<string, unknown> = {},
  ) {
    const updated = this.updateRecord(this.verifications, verificationId, (current) => ({
      ...current,
      status,
      adjudicatedAt: nowIso(),
      adjudicatedBy: actorId,
      documentUrl: status === "denied" ? null : current.documentUrl,
    }));
    if (updated) {
      if (status === "approved") {
        this.updateRecord(this.users, updated.userId, (currentUser) => ({
          ...currentUser,
          dodVerifiedAt: nowIso(),
        }));
      }
      this.addAuditEntry({
        actorId,
        action: "verification.adjudicate",
        targetType: "verification",
        targetId: verificationId,
        metadata: { status, ...metadata },
      });
    }
    return updated;
  }

  createRefreshToken(
    userId: string,
    deviceId: string,
    tokenHash: string,
    jti: string,
    userAgent?: string,
  ) {
    const record: RefreshTokenRecord = {
      id: jti,
      userId,
      deviceId,
      tokenHash,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsedAt: nowIso(),
      userAgent,
    };
    this.refreshTokens.set(record.id, record);
    return record;
  }

  getRefreshTokenById(id: string) {
    return this.refreshTokens.get(id) ?? null;
  }

  touchRefreshToken(id: string) {
    const token = this.refreshTokens.get(id);
    if (!token) {
      return null;
    }
    const updated: RefreshTokenRecord = { ...token, lastUsedAt: nowIso() };
    this.refreshTokens.set(id, updated);
    return updated;
  }

  revokeRefreshToken(tokenId: string) {
    return this.refreshTokens.delete(tokenId);
  }

  getDashboardSnapshot() {
    const verifiedMembers = Array.from(this.users.values()).filter((user) => user.dodVerifiedAt !== null)
      .length;
    const totalListings = this.listings.size;
    const soldListings = Array.from(this.listings.values()).filter((listing) => listing.status === "sold")
      .length;
    const openReports = Array.from(this.reports.values()).filter((report) => report.status === "open").length;
    const manualVerificationBacklog = Array.from(this.verifications.values()).filter(
      (verification) => verification.status === "pending" && verification.method !== ".mil Verified",
    ).length;

    return {
      verifiedMembers,
      totalListings,
      soldListings,
      openReports,
      manualVerificationBacklog,
    };
  }
}

export const store = new BaseListStore();
