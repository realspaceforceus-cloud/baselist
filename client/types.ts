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
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleType?: string;
  vehicleColor?: string;
  vehicleMiles?: string;
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

export type ThreadLifecycleStatus = "active" | "completed" | "disputed";

export type TransactionStatus = "pending_complete" | "completed" | "disputed";

export interface ThreadTransaction {
  id: string;
  status: TransactionStatus;
  markedCompleteBy?: string;
  markedCompleteAt?: string;
  confirmedBy: string[];
  completedAt?: string;
  ratingByUser: Record<string, number | undefined>;
  autoCompletedAt?: string;
  dispute?: {
    raisedBy: string;
    reason?: string;
    raisedAt: string;
  };
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

export interface VehicleOptions {
  years: string[];
  makes: string[];
  models: string[];
  types: string[];
  colors: string[];
}

export type NotificationType =
  | "message"
  | "item_sold"
  | "item_favorited"
  | "listing_removed"
  | "verification_needed"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "transaction_complete"
  | "post_commented"
  | "comment_liked";

export type NotificationTargetType = "listing" | "thread" | "user" | "post";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  description: string;
  actorId?: string;
  targetId?: string;
  targetType?: NotificationTargetType;
  data?: Record<string, any>;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  readAt?: string;
  dismissedAt?: string;
}

export type FeedPostType = "text" | "photo" | "poll" | "event" | "psa";

export interface PollOption {
  id: string;
  text: string;
  votes: string[] | number;
}

export interface EventData {
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
}

export interface FeedPost {
  id: string;
  userId: string;
  baseId: string;
  postType: FeedPostType;
  content: string;
  imageUrls: string[];
  pollOptions?: PollOption[];
  pollVotes?: Record<string, string[]>;
  eventData?: EventData;
  createdAt: string;
  updatedAt: string;
  author?: Seller;
  likes?: number;
  comments?: number;
  userLiked?: boolean;
  userComments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  author?: Seller;
  createdAt: string;
  parentCommentId?: string;
  replies?: FeedComment[];
  likes?: number;
  userLiked?: boolean;
}

export interface FeedAnnouncement {
  id: string;
  baseId: string;
  title: string;
  content: string;
  imageUrl?: string;
  isSticky: boolean;
  isDismissible: boolean;
  dismissedBy: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isDismissed?: boolean;
}
