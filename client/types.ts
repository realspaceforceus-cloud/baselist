export type ListingCategory =
  | "Vehicles"
  | "Furniture"
  | "Electronics"
  | "Kids"
  | "Free"
  | "Other";

export type ListingFilter = "All" | ListingCategory;

export interface Base {
  id: string;
  name: string;
  abbreviation: string;
  region: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export interface Seller {
  id: string;
  name: string;
  verified: boolean;
  memberSince: string;
  avatarUrl: string;
  rating?: number;
  ratingCount?: number;
  completedSales?: number;
  lastActiveAt?: string;
}

export type VerificationStatus = "Verified" | "Pending verification";

export interface UserProfile extends Seller {
  currentBaseId: string;
  verificationStatus: VerificationStatus;
  role: "member" | "moderator" | "admin";
  status?: "active" | "suspended";
  strikes?: number;
  email: string;
  verified: boolean;
  pendingEmail?: string;
  notificationsEnabled?: boolean;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  isFree: boolean;
  category: ListingCategory;
  postedAt: string;
  sellerId: string;
  imageUrls: string[];
  baseId: string;
  status: "active" | "sold";
  promoted?: "bump" | "feature";
  description: string;
}

export interface SponsorPlacement {
  id: string;
  baseId: string;
  label: string;
  description: string;
  href: string;
  brandColor: string;
  backgroundImageUrl?: string;
}

export interface MessagePreview {
  id: string;
  listingId: string;
  lastMessageSnippet: string;
  updatedAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  authorId: string;
  body: string;
  sentAt: string;
  type: "text" | "offer" | "system";
  amount?: number;
}

export type ThreadLifecycleStatus = "active" | "completed";

export interface ThreadTransaction {
  id: string;
  status: "pending_confirmation" | "completed";
  initiatedBy: string;
  confirmedBy: string[];
  completedAt?: string;
  ratingByUser: Record<string, number | undefined>;
}

export interface MessageThread {
  id: string;
  listingId: string;
  participants: string[];
  messages: Message[];
  lastReadAt?: Record<string, string>;
  status: ThreadLifecycleStatus;
  archivedBy?: string[];
  deletedBy?: string[];
  transaction?: ThreadTransaction;
}

export interface TransactionHistoryEntry {
  id: string;
  threadId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  price: number | null;
  completedAt: string;
  buyerRatingAboutSeller?: number;
  sellerRatingAboutBuyer?: number;
}

export interface RatingSummary {
  overallAverage: number | null;
  overallCount: number;
  sellerAverage: number | null;
  sellerCount: number;
  buyerAverage: number | null;
  buyerCount: number;
}

export type AccountNoticeCategory =
  | "report"
  | "payout"
  | "strike"
  | "verification"
  | "system";

export type AccountNoticeSeverity = "info" | "success" | "warning" | "danger";

export interface AccountNotice {
  id: string;
  userId: string | "all";
  category: AccountNoticeCategory;
  severity: AccountNoticeSeverity;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}
