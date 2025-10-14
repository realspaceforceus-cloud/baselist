import type {
  Base,
  Listing,
  ListingCategory,
  MessageThread,
  Seller,
  SponsorPlacement,
  UserProfile,
} from "@/types";

export const BASES: Base[] = [
  {
    id: "vance-afb",
    name: "Vance AFB",
    abbreviation: "VAFB",
    region: "Enid, OK",
    timezone: "CT",
    latitude: 36.339167,
    longitude: -97.916389,
  },
  {
    id: "jblm",
    name: "Joint Base Lewis-McChord",
    abbreviation: "JBLM",
    region: "Tacoma, WA",
    timezone: "PT",
    latitude: 47.1126,
    longitude: -122.5808,
  },
  {
    id: "ramstein-ab",
    name: "Ramstein Air Base",
    abbreviation: "RAB",
    region: "Kaiserslautern, Germany",
    timezone: "CET",
    latitude: 49.4369,
    longitude: 7.6003,
  },
  {
    id: "andrews-afb",
    name: "Joint Base Andrews",
    abbreviation: "JBA",
    region: "Prince George's County, MD",
    timezone: "ET",
    latitude: 38.8108,
    longitude: -76.867,
  },
];

export const LISTING_CATEGORIES: ListingCategory[] = [
  "Vehicles",
  "Furniture",
  "Electronics",
  "Kids",
  "Free",
  "Other",
];

export const PROHIBITED_CONTENT: string[] = [
  "weapons",
  "counterfeit",
  "adult content",
  "scams",
  "PII",
  "external payment demands",
];

export const SELLERS: Seller[] = [
  {
    id: "seller-taylor",
    name: "Capt. Taylor Greene",
    verified: true,
    memberSince: "2018-02-01",
    avatarUrl:
      "https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=128&q=80",
    rating: 4.9,
    ratingCount: 27,
    completedSales: 27,
    lastActiveAt: "2024-10-29T15:15:00Z",
  },
  {
    id: "seller-avery",
    name: "MSgt. Avery Chen",
    verified: true,
    memberSince: "2016-06-12",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=128&q=80",
    rating: 4.8,
    ratingCount: 34,
    completedSales: 34,
    lastActiveAt: "2024-10-30T12:45:00Z",
  },
  {
    id: "seller-lena",
    name: "LT Lena Ortiz",
    verified: true,
    memberSince: "2020-01-08",
    avatarUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=128&q=80",
    rating: 4.95,
    ratingCount: 18,
    completedSales: 18,
    lastActiveAt: "2024-10-28T22:10:00Z",
  },
  {
    id: "seller-marcus",
    name: "TSgt. Marcus Boyd",
    verified: true,
    memberSince: "2015-11-22",
    avatarUrl:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=128&q=80",
    rating: 4.7,
    ratingCount: 22,
    completedSales: 22,
    lastActiveAt: "2024-10-29T08:20:00Z",
  },
];

export const CURRENT_USER: UserProfile = {
  ...SELLERS[1],
  ratingCount: SELLERS[1].ratingCount,
  currentBaseId: "vance-afb",
  verificationStatus: "Verified",
  role: "moderator",
};

export const LISTINGS: Listing[] = [
  {
    id: "listing-forester",
    title: "2018 Subaru Forester Touring AWD",
    price: 18750,
    isFree: false,
    category: "Vehicles",
    postedAt: "2024-10-29T13:05:00Z",
    sellerId: "seller-taylor",
    imageUrls: [
      "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?auto=format&fit=crop&w=600&h=600",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "active",
    promoted: "feature",
    description:
      "Meticulously maintained Forester Touring with EyeSight, remote start, and new tires. All service performed at Subaru of Oklahoma City.",
  },
  {
    id: "listing-dining",
    title: "West Elm Mid-Century Dining Set (5pc)",
    price: 950,
    isFree: false,
    category: "Furniture",
    postedAt: "2024-10-28T09:42:00Z",
    sellerId: "seller-avery",
    imageUrls: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&h=600",
      "https://images.unsplash.com/photo-1473181488821-2d23949a045a?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "active",
    description:
      "Walnut table with four upholstered chairs. Lightly used in smoke-free home. Includes felt pads for easy move-in.",
  },
  {
    id: "listing-stroller",
    title: "UPPAbaby Vista V2 + Bassinet",
    price: 0,
    isFree: true,
    category: "Kids",
    postedAt: "2024-10-27T21:15:00Z",
    sellerId: "seller-lena",
    imageUrls: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&h=600",
      "https://images.unsplash.com/photo-1536304465711-1b0ec3f41a1d?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "active",
    description:
      "Complete Vista V2 travel system with bassinet, rain cover, and cup holder. Offering to another base family for free pickup.",
  },
  {
    id: "listing-ps5",
    title: "PlayStation 5 Digital + 2 Controllers",
    price: 425,
    isFree: false,
    category: "Electronics",
    postedAt: "2024-10-26T18:27:00Z",
    sellerId: "seller-marcus",
    imageUrls: [
      "https://images.unsplash.com/photo-1606813902915-fa4aa4ced5e9?auto=format&fit=crop&w=600&h=600",
      "https://images.unsplash.com/photo-1613758947305-9a3bb64d0c2b?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "active",
    promoted: "bump",
    description:
      "PS5 Digital Edition lightly used. Includes two DualSense controllers, charging dock, and installed 1TB NVMe SSD upgrade.",
  },
  {
    id: "listing-toolkit",
    title: "DeWalt 10pc Workshop Starter Kit",
    price: 520,
    isFree: false,
    category: "Other",
    postedAt: "2024-10-25T12:04:00Z",
    sellerId: "seller-taylor",
    imageUrls: [
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "active",
    description:
      "Cordless driver, impact, multi-tool, and LED work light set with chargers and rugged case. Perfect for quick PCS projects.",
  },
  {
    id: "listing-garage",
    title: "Garage Shelving + Storage Bins (Bundle)",
    price: 180,
    isFree: false,
    category: "Furniture",
    postedAt: "2024-10-23T16:18:00Z",
    sellerId: "seller-avery",
    imageUrls: [
      "https://images.unsplash.com/photo-1579125306726-9f45e7c80f12?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "vance-afb",
    status: "sold",
    description:
      "Two heavy-duty Gladiator racks plus six matching storage bins. Buyer must pick up from on-base housing.",
  },
  {
    id: "listing-bike",
    title: "Specialized Sirrus X 4.0 Hybrid Bike",
    price: 975,
    isFree: false,
    category: "Vehicles",
    postedAt: "2024-10-22T09:52:00Z",
    sellerId: "seller-lena",
    imageUrls: [
      "https://images.unsplash.com/photo-1525104698733-6a31f872a29a?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "jblm",
    status: "active",
    description:
      "Carbon fork hybrid tuned last month, includes lights and pannier rack. Available for pickup near the Main Exchange.",
  },
  {
    id: "listing-bookcase",
    title: "IKEA Havsta Bookcase + Base",
    price: 0,
    isFree: true,
    category: "Free",
    postedAt: "2024-10-20T15:33:00Z",
    sellerId: "seller-marcus",
    imageUrls: [
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=600&h=600",
    ],
    baseId: "ramstein-ab",
    status: "active",
    description:
      "Large Havsta bookcase with base cabinets. Already disassembled and ready for loading. Free to any family PCSing soon.",
  },
];

export const SPONSOR_PLACEMENTS: SponsorPlacement[] = [
  {
    id: "sponsor-vance",
    baseId: "vance-afb",
    label: "USAA Auto Insurance",
    description: "Exclusive rates for Vance AFB members. Switch in minutes.",
    href: "https://www.usaa.com/",
    brandColor: "#0E4B8C",
  },
  {
    id: "sponsor-jblm",
    baseId: "jblm",
    label: "AAFES Home Services",
    description: "PCS cleaning bundles with on-base access.",
    href: "https://www.aafes.com/",
    brandColor: "#174F2C",
  },
  {
    id: "sponsor-ramstein",
    baseId: "ramstein-ab",
    label: "Military Car Sales",
    description: "European delivery deals for Airmen and families.",
    href: "https://www.militarycars.com/",
    brandColor: "#9F2F43",
  },
];

export const MESSAGE_THREADS: MessageThread[] = [
  {
    id: "thread-forester",
    listingId: "listing-forester",
    participants: ["seller-taylor", CURRENT_USER.id],
    messages: [
      {
        id: "msg-1",
        authorId: CURRENT_USER.id,
        body: "Hi Capt. Greene! Is the Forester still available for pickup this weekend?",
        sentAt: "2024-10-29T15:30:00Z",
        type: "text",
      },
      {
        id: "msg-2",
        authorId: "seller-taylor",
        body: "Yes, Saturday morning works. I can meet by the Visitor Center at 0900.",
        sentAt: "2024-10-29T16:02:00Z",
        type: "text",
      },
      {
        id: "msg-3",
        authorId: CURRENT_USER.id,
        body: "Perfect. I'll bring base access paperwork.",
        sentAt: "2024-10-29T16:04:00Z",
        type: "text",
      },
    ],
    lastReadAt: {
      [CURRENT_USER.id]: "2024-10-29T16:30:00Z",
    },
    status: "active",
    archivedBy: [],
    deletedBy: [],
  },
];
