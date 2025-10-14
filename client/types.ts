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
  completedSales?: number;
  lastActiveAt?: string;
}

export interface UserProfile extends Seller {
  currentBaseId: string;
  verificationStatus: "Verified" | "Pending";
  role: "member" | "moderator" | "admin";
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

export interface MessageThread {
  id: string;
  listingId: string;
  participants: string[];
  messages: Message[];
  lastReadAt?: Record<string, string>;
}
