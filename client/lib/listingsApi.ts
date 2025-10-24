import type { Listing, Seller } from "@/types";

export interface ListingWithSeller extends Listing {
  seller?: Seller;
}

export interface ListingsResponse {
  listings: ListingWithSeller[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface UserListingsResponse {
  listings: Listing[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Fetch paginated listings with optional filters
 */
export async function getListings(options: {
  baseId?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ListingsResponse> {
  const params = new URLSearchParams();
  if (options.baseId) params.append("baseId", options.baseId);
  if (options.category) params.append("category", options.category);
  if (options.search) params.append("search", options.search);
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.offset !== undefined)
    params.append("offset", options.offset.toString());

  const response = await fetch(`/api/listings?${params}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch listings");
  }

  return response.json();
}

/**
 * Fetch a single listing by ID
 */
export async function getListing(id: string): Promise<Listing> {
  const response = await fetch(`/api/listings/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Listing not found");
  }

  return response.json();
}

/**
 * Fetch user's listings
 */
export async function getUserListings(
  userId: string,
  options?: { status?: string; limit?: number; offset?: number },
): Promise<UserListingsResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append("status", options.status);
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.offset !== undefined)
    params.append("offset", options.offset.toString());

  const url = `/api/listings/user/${userId}${params.toString() ? "?" + params.toString() : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user listings");
  }

  return response.json();
}

/**
 * Create a new listing
 */
export async function createListing(data: {
  title: string;
  price?: number;
  isFree?: boolean;
  category: string;
  description?: string;
  imageUrls?: string[];
  baseId: string;
  sellerId: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleType?: string;
  vehicleColor?: string;
  vehicleMiles?: number;
}): Promise<Listing> {
  const response = await fetch("/api/listings", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create listing");
  }

  return response.json();
}

/**
 * Update a listing
 */
export async function updateListing(
  id: string,
  data: Partial<Listing>,
): Promise<Listing> {
  const response = await fetch(`/api/listings/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update listing");
  }

  return response.json();
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<void> {
  const response = await fetch(`/api/listings/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete listing");
  }
}
