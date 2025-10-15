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
  dowVerifiedAt: string | null;
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
  updatedAt: string;
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
  updatedAt: string;
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
